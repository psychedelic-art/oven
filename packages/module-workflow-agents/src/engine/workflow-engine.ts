import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { agentWorkflowExecutions, agentWorkflowNodeExecutions } from '../schema';
import { executeNode, resolveInputs, evaluateGuard } from './node-executor';
import { saveCheckpoint } from './checkpoint-manager';
import type { AgentWorkflowDefinition, AgentStateDefinition, AgentConfig, GuardDefinition } from '../types';

// ─── Execution Result ───────────────────────────────────────

export interface WorkflowExecutionResult {
  status: 'completed' | 'failed' | 'paused';
  context: Record<string, unknown>;
  stepsExecuted: number;
  error?: string;
}

// ─── Run Agent Workflow ─────────────────────────────────────
// Core graph traversal engine. Follows the same pattern as module-workflows engine.ts:
// - State machine loop
// - Node invocation with $.path input resolution
// - Context accumulation (output keyed by nodeId)
// - Guard evaluation for branching
// - Safety limits (maxSteps)

export async function runAgentWorkflow(
  definition: AgentWorkflowDefinition,
  config: AgentConfig,
  initialContext: Record<string, unknown>,
  opts: { executionId: number; tenantId?: number },
): Promise<WorkflowExecutionResult> {
  const maxSteps = config.maxSteps ?? 50;
  let context = { ...initialContext };
  let currentState = definition.initial;
  let stepsExecuted = 0;

  await eventBus.emit('workflow-agents.execution.started', {
    executionId: opts.executionId,
    workflowId: definition.id,
  });

  try {
    while (stepsExecuted < maxSteps) {
      const stateDef = definition.states[currentState];
      if (!stateDef) {
        return fail(opts.executionId, context, stepsExecuted, `Unknown state: ${currentState}`);
      }

      // Final state → execution complete
      if (stateDef.type === 'final') {
        await eventBus.emit('workflow-agents.execution.completed', {
          executionId: opts.executionId,
          context,
          stepsExecuted,
        });
        return { status: 'completed', context, stepsExecuted };
      }

      // Execute node if state has an invoke
      if (stateDef.invoke) {
        stepsExecuted++;
        const nodeSlug = stateDef.invoke.src;
        const inputMapping = (stateDef.invoke.input ?? {}) as Record<string, unknown>;
        const resolvedInput = resolveInputs(inputMapping, context);

        await eventBus.emit('workflow-agents.node.started', {
          executionId: opts.executionId,
          nodeId: currentState,
          nodeType: nodeSlug,
        });

        // Record node execution start in DB
        const db = getDb();
        let nodeExecId: number | null = null;
        try {
          const [nodeExec] = await db.insert(agentWorkflowNodeExecutions).values({
            executionId: opts.executionId,
            nodeId: currentState,
            nodeType: nodeSlug,
            status: 'running',
            input: resolvedInput,
          }).returning();
          nodeExecId = nodeExec.id as number;
        } catch { /* DB write failure should not block execution */ }

        // Pre-execution guardrail check (LLM input)
        if (nodeSlug === 'llm' && opts.tenantId) {
          try {
            const { evaluateGuardrails } = await import('@oven/module-ai');
            const inputText = typeof resolvedInput.messages === 'string'
              ? resolvedInput.messages
              : JSON.stringify(resolvedInput.messages);
            const guardResult = await evaluateGuardrails(inputText, 'input', opts.tenantId);
            if (!guardResult.passed && guardResult.action === 'block') {
              await eventBus.emit('workflow-agents.guard.triggered', {
                executionId: opts.executionId, nodeId: currentState, scope: 'input',
                ruleId: guardResult.ruleId, message: guardResult.message,
              });
              context = { ...context, [currentState]: { error: guardResult.message, guardrailBlocked: true } };
              if (stateDef.invoke.onError) { currentState = stateDef.invoke.onError; continue; }
              return fail(opts.executionId, context, stepsExecuted, `Guardrail blocked input: ${guardResult.message}`);
            }
          } catch { /* guardrail evaluation failure should not block execution */ }
        }

        const startTime = Date.now();
        const output = await executeNode(nodeSlug, {
          input: resolvedInput,
          context,
          config,
          executionId: opts.executionId,
          tenantId: opts.tenantId,
        });
        const durationMs = Date.now() - startTime;

        // Post-execution guardrail check (LLM output)
        if (nodeSlug === 'llm' && opts.tenantId && output.text) {
          try {
            const { evaluateGuardrails } = await import('@oven/module-ai');
            const guardResult = await evaluateGuardrails(output.text as string, 'output', opts.tenantId);
            if (!guardResult.passed && guardResult.action === 'block') {
              await eventBus.emit('workflow-agents.guard.triggered', {
                executionId: opts.executionId, nodeId: currentState, scope: 'output',
                ruleId: guardResult.ruleId, message: guardResult.message,
              });
              context = { ...context, [currentState]: { ...output, guardrailBlocked: true, guardrailMessage: guardResult.message } };
              if (stateDef.invoke.onError) { currentState = stateDef.invoke.onError; continue; }
              return fail(opts.executionId, context, stepsExecuted, `Guardrail blocked output: ${guardResult.message}`);
            }
          } catch { /* guardrail failure should not block execution */ }
        }

        // Check for node-level error
        if (output.error && stateDef.invoke.onError) {
          await eventBus.emit('workflow-agents.node.failed', {
            executionId: opts.executionId,
            nodeId: currentState,
            error: output.error,
          });
          const errorTarget = typeof stateDef.invoke.onError === 'string'
            ? stateDef.invoke.onError
            : stateDef.invoke.onError;
          currentState = errorTarget;
          context = { ...context, [currentState]: output };
          continue;
        }

        // Accumulate output into context
        context = { ...context, [currentState]: output };

        // Human-review node: pause execution and save checkpoint
        if (nodeSlug === 'human-review' && !resolvedInput.decision) {
          await saveCheckpoint(opts.executionId, {
            currentState,
            context,
            stepsExecuted,
            pendingInput: { proposal: resolvedInput.proposal, reason: resolvedInput.reason },
          });
          await eventBus.emit('workflow-agents.human_review.pending', {
            executionId: opts.executionId,
            nodeId: currentState,
            proposal: resolvedInput.proposal,
          });
          return { status: 'paused', context, stepsExecuted };
        }

        // Record node execution completion in DB
        if (nodeExecId) {
          try {
            await db.update(agentWorkflowNodeExecutions).set({
              status: output.error ? 'failed' : 'completed',
              output,
              error: output.error ? String(output.error) : null,
              durationMs,
              completedAt: new Date(),
            }).where(eq(agentWorkflowNodeExecutions.id, nodeExecId));
          } catch { /* DB write failure should not block execution */ }
        }

        await eventBus.emit('workflow-agents.node.completed', {
          executionId: opts.executionId,
          nodeId: currentState,
          nodeType: nodeSlug,
          output,
          durationMs,
        });
      }

      // Determine next state
      const nextState = resolveTransition(stateDef, context, currentState);
      if (!nextState) {
        return fail(opts.executionId, context, stepsExecuted, `No transition from state: ${currentState}`);
      }
      currentState = nextState;
    }

    // Exceeded max steps
    return fail(opts.executionId, context, stepsExecuted, `Max steps exceeded (${maxSteps})`);

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await eventBus.emit('workflow-agents.execution.failed', {
      executionId: opts.executionId,
      error: errorMsg,
    });
    return { status: 'failed', context, stepsExecuted, error: errorMsg };
  }
}

// ─── Resolve Transition ─────────────────────────────────────
// Determines the next state based on:
// 1. invoke.onDone (if node executed successfully)
// 2. always transitions (with optional guards)
// 3. First matching guard wins

function resolveTransition(
  stateDef: AgentStateDefinition,
  context: Record<string, unknown>,
  currentState: string,
): string | null {
  // 1. If invoke has onDone, follow it
  if (stateDef.invoke?.onDone) {
    const onDone = stateDef.invoke.onDone;
    if (typeof onDone === 'string') return onDone;
    if (typeof onDone === 'object' && onDone.target) {
      if (onDone.guard) {
        if (evaluateGuard(onDone.guard.params, context)) return onDone.target;
      } else {
        return onDone.target;
      }
    }
  }

  // 2. Always transitions (unconditional or guarded)
  if (stateDef.always) {
    if (typeof stateDef.always === 'string') return stateDef.always;
    if (Array.isArray(stateDef.always)) {
      for (const transition of stateDef.always) {
        if (typeof transition === 'string') return transition;
        if (transition.guard) {
          if (evaluateGuard(transition.guard.params, context)) return transition.target;
        } else {
          return transition.target;
        }
      }
    }
  }

  // 3. No transition found
  return null;
}

// ─── Fail Helper ────────────────────────────────────────────

async function fail(
  executionId: number,
  context: Record<string, unknown>,
  stepsExecuted: number,
  error: string,
): Promise<WorkflowExecutionResult> {
  await eventBus.emit('workflow-agents.execution.failed', { executionId, error });
  return { status: 'failed', context, stepsExecuted, error };
}

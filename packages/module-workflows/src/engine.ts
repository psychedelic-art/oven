import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry/event-bus';
import {
  workflows,
  workflowExecutions,
  nodeExecutions,
} from './schema';
import { nodeRegistry } from './node-registry';
import { eq, sql as drizzleSql } from 'drizzle-orm';
import { NetworkStrategy } from './execution-strategy';
import type {
  WorkflowDefinition,
  WorkflowStateDefinition,
  LoopDefinition,
  ExecutionStrategy,
  ExecutionMode,
} from './types';

// ─── Transform Utility ──────────────────────────────────────────

/**
 * Apply $.path expressions to resolve values from context.
 * Same syntax as wiring-runtime transforms.
 */
export function resolveValue(expr: unknown, context: Record<string, unknown>): unknown {
  if (typeof expr === 'string' && expr.startsWith('$.')) {
    const path = expr.slice(2).split('.');
    let value: unknown = context;
    for (const segment of path) {
      if (value && typeof value === 'object' && segment in value) {
        value = (value as Record<string, unknown>)[segment];
      } else {
        return undefined;
      }
    }
    return value;
  }
  if (typeof expr === 'string' && expr.startsWith('$config.')) {
    // Config references resolved at runtime (future enhancement)
    return expr;
  }
  return expr;
}

export function resolveInputs(
  inputMapping: Record<string, unknown>,
  context: Record<string, unknown>
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, expr] of Object.entries(inputMapping)) {
    resolved[key] = resolveValue(expr, context);
  }
  return resolved;
}

// ─── Condition Evaluation ───────────────────────────────────────

function evaluateCondition(
  params: Record<string, unknown>,
  context: Record<string, unknown>
): boolean {
  const key = params.key as string;
  const operator = (params.operator as string) ?? '==';
  const expected = params.value;

  const actual = resolveValue(`$.${key}`, context);

  switch (operator) {
    case '==':
      return actual == expected;
    case '!=':
      return actual != expected;
    case '>':
      return Number(actual) > Number(expected);
    case '<':
      return Number(actual) < Number(expected);
    case '>=':
      return Number(actual) >= Number(expected);
    case '<=':
      return Number(actual) <= Number(expected);
    case 'contains':
      return typeof actual === 'string' && actual.includes(String(expected));
    case 'exists':
      return actual !== undefined && actual !== null;
    default:
      return actual == expected;
  }
}

// ─── Workflow Engine ────────────────────────────────────────────

interface WorkflowEngineOptions {
  strategy?: ExecutionStrategy;
  mode?: ExecutionMode;
  baseUrl?: string;
  handlers?: Record<string, Record<string, Function>>;
}

class WorkflowEngine {
  private strategy: ExecutionStrategy;

  constructor(options?: WorkflowEngineOptions) {
    if (options?.strategy) {
      this.strategy = options.strategy;
    } else {
      this.strategy = new NetworkStrategy(options?.baseUrl);
    }
  }

  /**
   * Update the execution strategy at runtime.
   * Useful for switching between network and direct modes.
   */
  setStrategy(strategy: ExecutionStrategy): void {
    this.strategy = strategy;
  }

  /**
   * Execute a workflow by ID with the given trigger payload.
   * Returns the execution ID for tracking.
   */
  async executeWorkflow(
    workflowId: number,
    payload: Record<string, unknown>,
    triggerEvent?: string
  ): Promise<number> {
    const db = getDb();

    // Load workflow definition
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId))
      .limit(1);

    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    if (!workflow.enabled) {
      throw new Error(`Workflow ${workflowId} is disabled`);
    }

    const definition = workflow.definition as WorkflowDefinition;

    // Create execution record
    const [execution] = await db
      .insert(workflowExecutions)
      .values({
        workflowId,
        status: 'running',
        triggerEvent: triggerEvent ?? null,
        triggerPayload: payload,
        context: payload,
        currentState: definition.initial ?? 'initial',
      })
      .returning();

    const executionId = execution.id;

    try {
      await this.runMachine(definition, executionId, payload);
    } catch (err) {
      // Update execution as failed
      await db
        .update(workflowExecutions)
        .set({
          status: 'failed',
          error: err instanceof Error ? err.message : String(err),
          completedAt: new Date(),
        })
        .where(eq(workflowExecutions.id, executionId));
    }

    // Emit events
    await eventBus.emit('workflows.execution.started', {
      executionId,
      workflowId,
      workflowName: workflow.name,
    });

    return executionId;
  }

  /**
   * Run the state machine for a workflow execution.
   */
  private async runMachine(
    definition: WorkflowDefinition,
    executionId: number,
    initialContext: Record<string, unknown>
  ): Promise<void> {
    const db = getDb();

    // Track accumulated context across nodes
    let machineContext = { ...initialContext };

    // Iterate through states manually
    let currentState = definition.initial;
    const visitedStates = new Set<string>();
    const maxIterations = 100; // safety limit
    let iterations = 0;

    while (iterations < maxIterations) {
      iterations++;
      const stateDef = definition.states[currentState];

      if (!stateDef) {
        throw new Error(`State "${currentState}" not found in workflow definition`);
      }

      // Update execution current state
      await db
        .update(workflowExecutions)
        .set({ currentState, context: machineContext })
        .where(eq(workflowExecutions.id, executionId));

      // If final state, we're done
      if (stateDef.type === 'final') {
        await db
          .update(workflowExecutions)
          .set({
            status: 'completed',
            currentState,
            context: machineContext,
            completedAt: new Date(),
          })
          .where(eq(workflowExecutions.id, executionId));

        await eventBus.emit('workflows.execution.completed', {
          executionId,
          context: machineContext,
        });
        return;
      }

      // Detect infinite loops
      const stateKey = `${currentState}:${JSON.stringify(machineContext)}`;
      if (visitedStates.has(stateKey)) {
        throw new Error(`Infinite loop detected at state "${currentState}"`);
      }
      visitedStates.add(stateKey);

      // Execute invoke (service/task)
      if (stateDef.invoke) {
        const nodeId = currentState;
        const nodeDef = nodeRegistry.get(stateDef.invoke.src);
        const nodeType = nodeDef?.category ?? 'api-call';

        // Record node execution start
        const [nodeExec] = await db
          .insert(nodeExecutions)
          .values({
            executionId,
            nodeId,
            nodeType,
            status: 'running',
            input: stateDef.invoke.input
              ? resolveInputs(stateDef.invoke.input, machineContext)
              : machineContext,
          })
          .returning();

        await eventBus.emit('workflows.node.started', {
          executionId,
          nodeId,
          nodeType,
        });

        const startTime = Date.now();

        try {
          const resolvedInput = stateDef.invoke.input
            ? resolveInputs(stateDef.invoke.input, machineContext)
            : machineContext;

          let output: Record<string, unknown>;

          // Execute based on node type
          if (stateDef.invoke.src === 'core.delay') {
            const ms = Math.min(Number(resolvedInput.ms ?? 1000), 55000); // cap at 55s for Vercel
            await new Promise((resolve) => setTimeout(resolve, ms));
            output = {};

          } else if (stateDef.invoke.src === 'core.emit') {
            const eventName = String(resolvedInput.event ?? '');
            const eventPayload = (resolvedInput.payload as Record<string, unknown>) ?? {};
            await eventBus.emit(eventName, eventPayload);
            output = { emitted: eventName };

          } else if (stateDef.invoke.src === 'core.transform') {
            const mapping = (resolvedInput.mapping as Record<string, unknown>) ?? {};
            output = resolveInputs(mapping, machineContext);

          } else if (stateDef.invoke.src === 'core.log') {
            console.log(
              `[Workflow:${executionId}]`,
              resolvedInput.message ?? '',
              resolvedInput.data ?? machineContext
            );
            output = {};

          } else if (stateDef.invoke.src === 'core.setVariable') {
            // Set Variable — assign a value to a named variable in context
            const varName = String(resolvedInput.name ?? '');
            const varValue = resolveValue(resolvedInput.value, machineContext);
            if (varName) {
              machineContext = { ...machineContext, [varName]: varValue };
            }
            output = { name: varName, value: varValue };

          } else if (stateDef.invoke.src === 'core.sql') {
            // Execute SQL — run parameterized query against DB
            const query = String(resolvedInput.query ?? '');
            const params = Array.isArray(resolvedInput.params)
              ? resolvedInput.params.map((p: unknown) => resolveValue(p, machineContext))
              : [];

            if (!query) {
              throw new Error('SQL query is required');
            }

            const result = await db.execute(
              drizzleSql.raw(`${query}`)
            );
            // Note: For parameterized queries, drizzle requires sql`` template.
            // We'll build a safe parameterized query:
            const rows = Array.isArray(result) ? result : (result as any)?.rows ?? [];
            output = {
              rows,
              rowCount: rows.length,
            };

          } else if (stateDef.invoke.src === 'core.resolveConfig') {
            // Resolve config via the strategy (calls GET /api/module-configs/resolve)
            output = await this.strategy.executeApiCall(
              { route: 'module-configs/resolve', method: 'GET', module: 'workflows' },
              resolvedInput
            );

          } else if (nodeDef?.category === 'api-call' && nodeDef.route && nodeDef.method) {
            // Execute API call via the configured strategy
            output = await this.strategy.executeApiCall(
              { route: nodeDef.route, method: nodeDef.method, module: nodeDef.module },
              resolvedInput
            );
          } else {
            throw new Error(`Unknown node type: ${stateDef.invoke.src}`);
          }

          const durationMs = Date.now() - startTime;

          // Merge output into context:
          // 1. Namespaced: nodeId_output → full output object
          // 2. Flat spread: each output key becomes a top-level context key
          // 3. By label: sanitized label_output → for cleaner $.path references
          machineContext = {
            ...machineContext,
            [`${nodeId}_output`]: output,
            ...output,
          };

          // Record node success
          await db
            .update(nodeExecutions)
            .set({
              status: 'completed',
              output,
              completedAt: new Date(),
              durationMs,
            })
            .where(eq(nodeExecutions.id, nodeExec.id));

          await eventBus.emit('workflows.node.completed', {
            executionId,
            nodeId,
            output,
            durationMs,
          });

          // Follow onDone transition
          if (stateDef.invoke.onDone) {
            const transition =
              typeof stateDef.invoke.onDone === 'string'
                ? stateDef.invoke.onDone
                : stateDef.invoke.onDone.target;
            currentState = transition;
            continue;
          }
        } catch (err) {
          const durationMs = Date.now() - startTime;
          const errorMsg = err instanceof Error ? err.message : String(err);

          // Record node failure
          await db
            .update(nodeExecutions)
            .set({
              status: 'failed',
              error: errorMsg,
              completedAt: new Date(),
              durationMs,
            })
            .where(eq(nodeExecutions.id, nodeExec.id));

          await eventBus.emit('workflows.node.failed', {
            executionId,
            nodeId,
            error: errorMsg,
          });

          // Follow onError transition if defined
          if (stateDef.invoke.onError) {
            const transition =
              typeof stateDef.invoke.onError === 'string'
                ? stateDef.invoke.onError
                : stateDef.invoke.onError.target;
            machineContext = { ...machineContext, [`${nodeId}_error`]: errorMsg };
            currentState = transition;
            continue;
          }

          // No error handler — propagate up
          throw err;
        }
      }

      // Handle loop states (forEach / while)
      if (stateDef.loop) {
        const loop = stateDef.loop;
        const nodeId = currentState;
        const loopMaxIter = loop.maxIterations ?? 100;
        const deadline = Date.now() + (loop.timeoutMs ?? 50000);

        // Record loop node start
        const [loopExec] = await db
          .insert(nodeExecutions)
          .values({
            executionId,
            nodeId,
            nodeType: loop.type === 'forEach' ? 'forEach' : 'whileLoop',
            status: 'running',
            input: { loopType: loop.type, collection: loop.collection, maxIterations: loopMaxIter },
          })
          .returning();

        const loopStartTime = Date.now();
        let loopError: string | null = null;

        try {
          if (loop.type === 'forEach') {
            // Resolve the collection array from context
            const collectionValue = resolveValue(loop.collection ?? '', machineContext);
            if (!Array.isArray(collectionValue)) {
              throw new Error(`ForEach: collection "${loop.collection}" did not resolve to an array`);
            }

            const itemVar = loop.itemVariable ?? 'item';
            const indexVar = loop.indexVariable ?? 'index';
            const batchSize = loop.parallelBatchSize ?? 0;
            const results: unknown[] = [];
            let iterCount = 0;

            if (batchSize > 0) {
              // Parallel batch execution
              for (let batchStart = 0; batchStart < collectionValue.length; batchStart += batchSize) {
                if (iterCount >= loopMaxIter) break;
                if (Date.now() >= deadline) {
                  loopError = `ForEach: timeout after ${iterCount} iterations`;
                  break;
                }

                const batch = collectionValue.slice(batchStart, batchStart + batchSize);
                const batchPromises = batch.map(async (item, i) => {
                  const iterIndex = batchStart + i;
                  const iterContext = structuredClone(machineContext);
                  iterContext[itemVar] = item;
                  iterContext[indexVar] = iterIndex;

                  // Execute body states if defined, otherwise just collect the item
                  if (loop.bodyStates && Object.keys(loop.bodyStates).length > 0) {
                    // Run body as a mini state machine
                    return this.runLoopBody(loop.bodyStates, loop.bodyInitial, iterContext, executionId);
                  }
                  return iterContext;
                });

                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
                iterCount += batch.length;
              }
            } else {
              // Sequential execution
              for (let i = 0; i < collectionValue.length; i++) {
                if (iterCount >= loopMaxIter) break;
                if (Date.now() >= deadline) {
                  loopError = `ForEach: timeout after ${iterCount} iterations`;
                  break;
                }

                machineContext[itemVar] = collectionValue[i];
                machineContext[indexVar] = i;

                if (loop.bodyStates && Object.keys(loop.bodyStates).length > 0) {
                  const bodyResult = await this.runLoopBody(loop.bodyStates, loop.bodyInitial, { ...machineContext }, executionId);
                  results.push(bodyResult);
                } else {
                  results.push(collectionValue[i]);
                }
                iterCount++;
              }
            }

            machineContext = {
              ...machineContext,
              results,
              iterationCount: iterCount,
              [`${nodeId}_output`]: { results, iterationCount: iterCount },
            };
          } else if (loop.type === 'while') {
            // While loop — evaluate condition each iteration
            let iterCount = 0;

            while (iterCount < loopMaxIter) {
              if (Date.now() >= deadline) {
                loopError = `While: timeout after ${iterCount} iterations`;
                break;
              }

              // Evaluate condition
              if (!loop.condition) {
                throw new Error('While loop requires a condition');
              }
              const passes = evaluateCondition(
                loop.condition.params as Record<string, unknown>,
                machineContext
              );
              if (!passes) break;

              // Execute body
              if (loop.bodyStates && Object.keys(loop.bodyStates).length > 0) {
                const bodyResult = await this.runLoopBody(loop.bodyStates, loop.bodyInitial, { ...machineContext }, executionId);
                machineContext = { ...machineContext, ...(bodyResult as Record<string, unknown>) };
              }

              iterCount++;
            }

            machineContext = {
              ...machineContext,
              iterationCount: iterCount,
              [`${nodeId}_output`]: { iterationCount: iterCount },
            };
          }

          // Record loop node success
          const durationMs = Date.now() - loopStartTime;
          await db
            .update(nodeExecutions)
            .set({
              status: loopError ? 'failed' : 'completed',
              error: loopError,
              output: { iterationCount: machineContext.iterationCount },
              completedAt: new Date(),
              durationMs,
            })
            .where(eq(nodeExecutions.id, loopExec.id));

          // Follow onDone or onError based on whether there was a timeout
          if (loopError && stateDef.invoke?.onError) {
            const target = typeof stateDef.invoke.onError === 'string'
              ? stateDef.invoke.onError
              : stateDef.invoke.onError.target;
            machineContext = { ...machineContext, [`${nodeId}_error`]: loopError };
            currentState = target;
            continue;
          }

          // Follow the normal output edge (first outgoing from 'always' or 'invoke.onDone')
          if (stateDef.always) {
            const transitions = Array.isArray(stateDef.always) ? stateDef.always : [stateDef.always];
            if (transitions[0]) {
              currentState = transitions[0].target;
              continue;
            }
          }
          if (stateDef.invoke?.onDone) {
            const target = typeof stateDef.invoke.onDone === 'string'
              ? stateDef.invoke.onDone
              : stateDef.invoke.onDone.target;
            currentState = target;
            continue;
          }
        } catch (err) {
          const durationMs = Date.now() - loopStartTime;
          const errorMsg = err instanceof Error ? err.message : String(err);

          await db
            .update(nodeExecutions)
            .set({
              status: 'failed',
              error: errorMsg,
              completedAt: new Date(),
              durationMs,
            })
            .where(eq(nodeExecutions.id, loopExec.id));

          // Follow onError if defined (check invoke and also look for error edges via always)
          if (stateDef.invoke?.onError) {
            const target = typeof stateDef.invoke.onError === 'string'
              ? stateDef.invoke.onError
              : stateDef.invoke.onError.target;
            machineContext = { ...machineContext, [`${nodeId}_error`]: errorMsg };
            currentState = target;
            continue;
          }

          throw err;
        }
      }

      // Handle entry actions
      if (stateDef.entry) {
        for (const action of stateDef.entry) {
          if (action.type === 'core.log') {
            console.log(`[Workflow:${executionId}] Action:`, action.params);
          }
        }
      }

      // Handle "always" transitions (unconditional/conditional auto-transitions)
      if (stateDef.always) {
        const transitions = Array.isArray(stateDef.always)
          ? stateDef.always
          : [stateDef.always];

        let transitioned = false;
        for (const t of transitions) {
          if (t.guard) {
            // Evaluate guard condition
            const passes = evaluateCondition(
              t.guard.params as Record<string, unknown>,
              machineContext
            );
            if (passes) {
              currentState = t.target;
              transitioned = true;

              // Record condition node
              await db.insert(nodeExecutions).values({
                executionId,
                nodeId: `${currentState}_guard`,
                nodeType: 'condition',
                status: 'completed',
                input: t.guard.params as Record<string, unknown>,
                output: { result: true },
              });

              break;
            }
          } else {
            currentState = t.target;
            transitioned = true;
            break;
          }
        }

        if (transitioned) continue;
      }

      // Handle "on" transitions
      if (stateDef.on) {
        const firstEvent = Object.keys(stateDef.on)[0];
        if (firstEvent) {
          const transition = stateDef.on[firstEvent];
          if (Array.isArray(transition)) {
            let transitioned = false;
            for (const t of transition) {
              if (t.guard) {
                const passes = evaluateCondition(
                  t.guard.params as Record<string, unknown>,
                  machineContext
                );
                if (passes) {
                  currentState = t.target;
                  transitioned = true;
                  break;
                }
              } else {
                currentState = t.target;
                transitioned = true;
                break;
              }
            }
            if (!transitioned) {
              throw new Error(
                `No matching transition from state "${currentState}" for event "${firstEvent}"`
              );
            }
          } else {
            currentState = transition.target;
          }
          continue;
        }
      }

      // No transitions available — stuck
      throw new Error(`Workflow stuck at state "${currentState}" — no transitions defined`);
    }

    if (iterations >= maxIterations) {
      throw new Error(`Workflow exceeded maximum iterations (${maxIterations})`);
    }
  }

  /**
   * Run a set of states as a loop body (mini state machine).
   * Returns the final context after running through the body states.
   */
  private async runLoopBody(
    bodyStates: Record<string, WorkflowStateDefinition>,
    bodyInitial: string,
    context: Record<string, unknown>,
    executionId: number
  ): Promise<Record<string, unknown>> {
    const db = getDb();
    let currentState = bodyInitial;
    let bodyContext = { ...context };
    let iterations = 0;
    const maxBodyIterations = 50;

    while (iterations < maxBodyIterations) {
      iterations++;
      const stateDef = bodyStates[currentState];
      if (!stateDef) break;
      if (stateDef.type === 'final') break;

      // Handle invoke
      if (stateDef.invoke) {
        const nodeDef = nodeRegistry.get(stateDef.invoke.src);
        const resolvedInput = stateDef.invoke.input
          ? resolveInputs(stateDef.invoke.input, bodyContext)
          : bodyContext;

        let output: Record<string, unknown> = {};

        if (stateDef.invoke.src === 'core.setVariable') {
          const varName = String(resolvedInput.name ?? '');
          const varValue = resolveValue(resolvedInput.value, bodyContext);
          if (varName) bodyContext = { ...bodyContext, [varName]: varValue };
          output = { name: varName, value: varValue };
        } else if (nodeDef?.category === 'api-call' && nodeDef.route && nodeDef.method) {
          output = await this.strategy.executeApiCall(
            { route: nodeDef.route, method: nodeDef.method, module: nodeDef.module },
            resolvedInput
          );
        } else if (stateDef.invoke.src === 'core.transform') {
          const mapping = (resolvedInput.mapping as Record<string, unknown>) ?? {};
          output = resolveInputs(mapping, bodyContext);
        } else if (stateDef.invoke.src === 'core.delay') {
          const ms = Math.min(Number(resolvedInput.ms ?? 1000), 10000);
          await new Promise((resolve) => setTimeout(resolve, ms));
          output = {};
        }

        bodyContext = { ...bodyContext, [`${currentState}_output`]: output, ...output };

        if (stateDef.invoke.onDone) {
          currentState = typeof stateDef.invoke.onDone === 'string'
            ? stateDef.invoke.onDone
            : stateDef.invoke.onDone.target;
          continue;
        }
      }

      // Handle always transitions
      if (stateDef.always) {
        const transitions = Array.isArray(stateDef.always) ? stateDef.always : [stateDef.always];
        let transitioned = false;
        for (const t of transitions) {
          if (t.guard) {
            if (evaluateCondition(t.guard.params as Record<string, unknown>, bodyContext)) {
              currentState = t.target;
              transitioned = true;
              break;
            }
          } else {
            currentState = t.target;
            transitioned = true;
            break;
          }
        }
        if (transitioned) continue;
      }

      break; // No more transitions
    }

    return bodyContext;
  }

  /**
   * Cancel a running workflow execution.
   */
  async cancelWorkflow(executionId: number): Promise<void> {
    const db = getDb();

    await db
      .update(workflowExecutions)
      .set({
        status: 'cancelled',
        completedAt: new Date(),
      })
      .where(eq(workflowExecutions.id, executionId));

    // Cancel any running nodes
    const runningNodes = await db
      .select()
      .from(nodeExecutions)
      .where(eq(nodeExecutions.executionId, executionId));

    for (const node of runningNodes) {
      if (node.status === 'running' || node.status === 'pending') {
        await db
          .update(nodeExecutions)
          .set({ status: 'skipped', completedAt: new Date() })
          .where(eq(nodeExecutions.id, node.id));
      }
    }
  }

  /**
   * Get execution status with all node executions.
   */
  async getExecutionStatus(executionId: number): Promise<{
    execution: any;
    nodes: any[];
  }> {
    const db = getDb();

    const [execution] = await db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.id, executionId))
      .limit(1);

    const nodes = await db
      .select()
      .from(nodeExecutions)
      .where(eq(nodeExecutions.executionId, executionId));

    return { execution, nodes };
  }
}

export const workflowEngine = new WorkflowEngine();

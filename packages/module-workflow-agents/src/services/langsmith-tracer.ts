import { eventBus } from '@oven/module-registry';

// ─── Types ──────────────────────────────────────────────────

interface RunContext {
  runId: string;
  traceUrl: string;
  childRuns: Map<string, string>; // nodeId → childRunId
}

// ─── Configuration ─────────────────────────────────────────

const projectName = process.env.LANGSMITH_PROJECT ?? 'oven-workflows';
const langsmithEndpoint = process.env.LANGSMITH_ENDPOINT ?? 'https://smith.langchain.com';

// ─── State ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: any = null;
const activeRuns = new Map<number, RunContext>(); // executionId → RunContext
const unsubscribers: Array<() => void> = [];

// ─── Initialize ─────────────────────────────────────────────
// Called once from index.ts. When LANGSMITH_API_KEY is set, lazy-loads
// the langsmith SDK and subscribes to event-bus lifecycle events.

export function initLangSmithTracer(): void {
  const apiKey = process.env.LANGSMITH_API_KEY;
  if (!apiKey) return; // Silently disabled — no API key means no tracing

  try {
    // Lazy import — only loads SDK when API key is present
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Client } = require('langsmith') as { Client: new (opts: Record<string, unknown>) => unknown };
    client = new Client({ apiKey });
  } catch (err) {
    console.warn('[langsmith] Failed to load SDK:', (err as Error).message);
    return;
  }

  // Subscribe to workflow execution events
  unsubscribers.push(
    eventBus.on('workflow-agents.execution.started', handleExecutionStarted),
    eventBus.on('workflow-agents.execution.completed', handleExecutionCompleted),
    eventBus.on('workflow-agents.execution.failed', handleExecutionFailed),
    eventBus.on('workflow-agents.node.started', handleNodeStarted),
    eventBus.on('workflow-agents.node.completed', handleNodeCompleted),
    eventBus.on('workflow-agents.node.failed', handleNodeFailed),
    eventBus.on('workflow-agents.guard.triggered', handleGuardTriggered),
  );

  // Also subscribe to agent-core events
  unsubscribers.push(
    eventBus.on('agents.execution.started', handleAgentExecutionStarted),
    eventBus.on('agents.execution.completed', handleAgentExecutionCompleted),
    eventBus.on('agents.execution.failed', handleAgentExecutionFailed),
  );
}

// ─── Public API ─────────────────────────────────────────────

export function getTraceUrl(executionId: number): string | null {
  return activeRuns.get(executionId)?.traceUrl ?? null;
}

export function isTracingEnabled(): boolean {
  return client !== null;
}

// ─── Test helpers ──────────────────────────────────────────

/** Teardown: unsubscribes events and clears state. */
export function teardownLangSmithTracer(): void {
  for (const off of unsubscribers) off();
  unsubscribers.length = 0;
  activeRuns.clear();
  client = null;
}

/**
 * Inject a mock client for testing. Bypasses the `require('langsmith')`
 * path so tests don't need to mock the CommonJS require.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function _injectClientForTesting(mockClient: any): void {
  client = mockClient;
}

// ─── Event Handlers: Workflow Execution ─────────────────────

async function handleExecutionStarted(payload: Record<string, unknown>): Promise<void> {
  if (!client) return;
  const executionId = payload.executionId as number;
  const runId = crypto.randomUUID();
  try {
    await client.createRun({
      id: runId,
      name: `workflow-execution-${executionId}`,
      run_type: 'chain',
      inputs: { workflowId: payload.workflowId ?? null },
      extra: { metadata: { executionId, source: 'oven-workflow-agents' } },
      project_name: projectName,
      trace_id: runId, // root run is its own trace
    });
    const traceUrl = `${langsmithEndpoint}/runs/${runId}`;
    activeRuns.set(executionId, { runId, traceUrl, childRuns: new Map() });
  } catch (err) {
    console.warn('[langsmith] Failed to create workflow run:', (err as Error).message);
  }
}

async function handleExecutionCompleted(payload: Record<string, unknown>): Promise<void> {
  if (!client) return;
  const ctx = activeRuns.get(payload.executionId as number);
  if (!ctx) return;
  try {
    await client.updateRun(ctx.runId, {
      outputs: { context: payload.context, stepsExecuted: payload.stepsExecuted },
      end_time: new Date().toISOString(),
    });
    // Flush the SDK's batch queue so traces are sent promptly
    if (typeof client.flush === 'function') await client.flush();
  } catch (err) {
    console.warn('[langsmith] Failed to update completed run:', (err as Error).message);
  }
  // Keep in map for trace URL retrieval (cleaned up after 30 min)
  setTimeout(() => activeRuns.delete(payload.executionId as number), 30 * 60 * 1000);
}

async function handleExecutionFailed(payload: Record<string, unknown>): Promise<void> {
  if (!client) return;
  const ctx = activeRuns.get(payload.executionId as number);
  if (!ctx) return;
  try {
    await client.updateRun(ctx.runId, {
      error: payload.error as string,
      end_time: new Date().toISOString(),
    });
    if (typeof client.flush === 'function') await client.flush();
  } catch (err) {
    console.warn('[langsmith] Failed to update failed run:', (err as Error).message);
  }
  setTimeout(() => activeRuns.delete(payload.executionId as number), 30 * 60 * 1000);
}

// ─── Event Handlers: Workflow Nodes ─────────────────────────

async function handleNodeStarted(payload: Record<string, unknown>): Promise<void> {
  if (!client) return;
  const ctx = activeRuns.get(payload.executionId as number);
  if (!ctx) return;
  const childRunId = crypto.randomUUID();
  try {
    const runType = payload.nodeType === 'llm' ? 'llm'
      : payload.nodeType === 'tool-executor' ? 'tool'
      : 'chain';
    await client.createRun({
      id: childRunId,
      name: `node-${payload.nodeId}`,
      run_type: runType,
      parent_run_id: ctx.runId,
      trace_id: ctx.runId, // share parent's trace for grouping
      inputs: { nodeId: payload.nodeId, nodeType: payload.nodeType },
      project_name: projectName,
    });
    ctx.childRuns.set(payload.nodeId as string, childRunId);
  } catch (err) {
    console.warn('[langsmith] Failed to create node run:', (err as Error).message);
  }
}

async function handleNodeCompleted(payload: Record<string, unknown>): Promise<void> {
  if (!client) return;
  const ctx = activeRuns.get(payload.executionId as number);
  if (!ctx) return;
  const childRunId = ctx.childRuns.get(payload.nodeId as string);
  if (!childRunId) return;
  try {
    await client.updateRun(childRunId, {
      outputs: payload.output as Record<string, unknown>,
      end_time: new Date().toISOString(),
      extra: { metadata: { durationMs: payload.durationMs } },
    });
  } catch (err) {
    console.warn('[langsmith] Failed to update node completed:', (err as Error).message);
  }
}

async function handleNodeFailed(payload: Record<string, unknown>): Promise<void> {
  if (!client) return;
  const ctx = activeRuns.get(payload.executionId as number);
  if (!ctx) return;
  const childRunId = ctx.childRuns.get(payload.nodeId as string);
  if (!childRunId) return;
  try {
    await client.updateRun(childRunId, {
      error: payload.error as string,
      end_time: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[langsmith] Failed to update node failed:', (err as Error).message);
  }
}

async function handleGuardTriggered(payload: Record<string, unknown>): Promise<void> {
  if (!client) return;
  const ctx = activeRuns.get(payload.executionId as number);
  if (!ctx) return;
  const guardRunId = crypto.randomUUID();
  try {
    await client.createRun({
      id: guardRunId,
      name: `guardrail-${payload.nodeId}`,
      run_type: 'tool',
      parent_run_id: ctx.runId,
      trace_id: ctx.runId,
      inputs: { scope: payload.scope, ruleId: payload.ruleId },
      outputs: { message: payload.message },
      end_time: new Date().toISOString(),
      project_name: projectName,
    });
  } catch (err) {
    console.warn('[langsmith] Failed to trace guardrail:', (err as Error).message);
  }
}

// ─── Event Handlers: Agent-Core ─────────────────────────────
// Agent-core executions are simpler (single invocation, no sub-nodes).

async function handleAgentExecutionStarted(payload: Record<string, unknown>): Promise<void> {
  if (!client) return;
  const executionId = payload.id as number;
  const runId = crypto.randomUUID();
  try {
    await client.createRun({
      id: runId,
      name: `agent-execution-${executionId}`,
      run_type: 'chain',
      inputs: { agentId: payload.agentId ?? null },
      extra: { metadata: { executionId, source: 'oven-agent-core' } },
      project_name: projectName,
      trace_id: runId,
    });
    activeRuns.set(executionId, {
      runId,
      traceUrl: `${langsmithEndpoint}/runs/${runId}`,
      childRuns: new Map(),
    });
  } catch (err) {
    console.warn('[langsmith] Failed to create agent run:', (err as Error).message);
  }
}

async function handleAgentExecutionCompleted(payload: Record<string, unknown>): Promise<void> {
  if (!client) return;
  const ctx = activeRuns.get(payload.id as number);
  if (!ctx) return;
  try {
    await client.updateRun(ctx.runId, {
      outputs: { tokenUsage: payload.tokenUsage, status: payload.status },
      end_time: new Date().toISOString(),
    });
    if (typeof client.flush === 'function') await client.flush();
  } catch (err) {
    console.warn('[langsmith] Failed to update agent completed:', (err as Error).message);
  }
  setTimeout(() => activeRuns.delete(payload.id as number), 30 * 60 * 1000);
}

async function handleAgentExecutionFailed(payload: Record<string, unknown>): Promise<void> {
  if (!client) return;
  const ctx = activeRuns.get(payload.id as number);
  if (!ctx) return;
  try {
    await client.updateRun(ctx.runId, {
      error: payload.error as string,
      end_time: new Date().toISOString(),
    });
    if (typeof client.flush === 'function') await client.flush();
  } catch (err) {
    console.warn('[langsmith] Failed to update agent failed:', (err as Error).message);
  }
  setTimeout(() => activeRuns.delete(payload.id as number), 30 * 60 * 1000);
}

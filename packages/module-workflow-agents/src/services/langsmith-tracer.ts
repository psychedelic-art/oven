import { eventBus } from '@oven/module-registry';

// ─── Types ──────────────────────────────────────────────────

interface RunContext {
  runId: string;
  traceUrl: string;
  childRuns: Map<string, string>; // nodeId → childRunId
}

// ─── State ──────────────────────────────────────────────────

let client: LangSmithClient | null = null;
const activeRuns = new Map<number, RunContext>(); // executionId → RunContext
const unsubscribers: Array<() => void> = [];

// ─── Minimal LangSmith Client Interface ─────────────────────
// We define this interface so the tracer works without requiring
// the langsmith package at import time. The real SDK is loaded lazily.

interface LangSmithClient {
  createRun(params: Record<string, unknown>): Promise<{ id: string }>;
  updateRun(runId: string, params: Record<string, unknown>): Promise<void>;
}

// ─── Initialize ─────────────────────────────────────────────

export function initLangSmithTracer(): void {
  const apiKey = process.env.LANGSMITH_API_KEY;
  if (!apiKey) return; // Silently disabled

  try {
    // Lazy import — only loads SDK when API key is present
    const { Client } = require('langsmith') as { Client: new (opts: Record<string, unknown>) => LangSmithClient };
    client = new Client({ apiKey });
  } catch {
    // SDK not installed or import failed — stay silent
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

// ─── Event Handlers ─────────────────────────────────────────

async function handleExecutionStarted(payload: Record<string, unknown>): Promise<void> {
  if (!client) return;
  try {
    const executionId = payload.executionId as number;
    const result = await client.createRun({
      name: `workflow-execution-${executionId}`,
      run_type: 'chain',
      inputs: { workflowId: payload.workflowId },
      extra: { metadata: { executionId, source: 'oven-workflow-agents' } },
    });
    const traceUrl = `https://smith.langchain.com/runs/${result.id}`;
    activeRuns.set(executionId, { runId: result.id, traceUrl, childRuns: new Map() });
  } catch { /* Silent */ }
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
  } catch { /* Silent */ }
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
  } catch { /* Silent */ }
  setTimeout(() => activeRuns.delete(payload.executionId as number), 30 * 60 * 1000);
}

async function handleNodeStarted(payload: Record<string, unknown>): Promise<void> {
  if (!client) return;
  const ctx = activeRuns.get(payload.executionId as number);
  if (!ctx) return;
  try {
    const runType = payload.nodeType === 'llm' ? 'llm' : payload.nodeType === 'tool-executor' ? 'tool' : 'chain';
    const result = await client.createRun({
      name: `node-${payload.nodeId}`,
      run_type: runType,
      parent_run_id: ctx.runId,
      inputs: { nodeId: payload.nodeId, nodeType: payload.nodeType },
    });
    ctx.childRuns.set(payload.nodeId as string, result.id);
  } catch { /* Silent */ }
}

async function handleNodeCompleted(payload: Record<string, unknown>): Promise<void> {
  if (!client) return;
  const ctx = activeRuns.get(payload.executionId as number);
  if (!ctx) return;
  const childRunId = ctx.childRuns.get(payload.nodeId as string);
  if (!childRunId) return;
  try {
    await client.updateRun(childRunId, {
      outputs: payload.output,
      end_time: new Date().toISOString(),
      extra: { metadata: { durationMs: payload.durationMs } },
    });
  } catch { /* Silent */ }
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
  } catch { /* Silent */ }
}

async function handleGuardTriggered(payload: Record<string, unknown>): Promise<void> {
  if (!client) return;
  const ctx = activeRuns.get(payload.executionId as number);
  if (!ctx) return;
  try {
    const result = await client.createRun({
      name: `guardrail-${payload.nodeId}`,
      run_type: 'tool',
      parent_run_id: ctx.runId,
      inputs: { scope: payload.scope, ruleId: payload.ruleId },
      outputs: { message: payload.message },
      end_time: new Date().toISOString(),
    });
  } catch { /* Silent */ }
}

// Agent-core event handlers (simpler — single invocation, no nodes)

async function handleAgentExecutionStarted(payload: Record<string, unknown>): Promise<void> {
  if (!client) return;
  try {
    const executionId = payload.id as number;
    const result = await client.createRun({
      name: `agent-execution-${executionId}`,
      run_type: 'chain',
      inputs: { agentId: payload.agentId },
      extra: { metadata: { executionId, source: 'oven-agent-core' } },
    });
    activeRuns.set(executionId, { runId: result.id, traceUrl: `https://smith.langchain.com/runs/${result.id}`, childRuns: new Map() });
  } catch { /* Silent */ }
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
  } catch { /* Silent */ }
  setTimeout(() => activeRuns.delete(payload.id as number), 30 * 60 * 1000);
}

async function handleAgentExecutionFailed(payload: Record<string, unknown>): Promise<void> {
  if (!client) return;
  const ctx = activeRuns.get(payload.id as number);
  if (!ctx) return;
  try {
    await client.updateRun(ctx.runId, { error: payload.error as string, end_time: new Date().toISOString() });
  } catch { /* Silent */ }
  setTimeout(() => activeRuns.delete(payload.id as number), 30 * 60 * 1000);
}

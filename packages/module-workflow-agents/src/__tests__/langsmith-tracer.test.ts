import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Hoisted mocks ─────────────────────────────────────────

const { mockOn, mockEmit } = vi.hoisted(() => ({
  mockOn: vi.fn().mockReturnValue(() => {}),
  mockEmit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@oven/module-registry', () => ({
  eventBus: { on: mockOn, emit: mockEmit },
}));

// Mock crypto.randomUUID for predictable IDs.
const MOCK_UUID = '11111111-2222-3333-4444-555555555555';
const MOCK_CHILD_UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
let uuidCounter = 0;
vi.stubGlobal('crypto', {
  randomUUID: () => (uuidCounter++ % 2 === 0 ? MOCK_UUID : MOCK_CHILD_UUID),
});

// ─── Fake LangSmith Client (injected, not mocked via vi.mock) ───

function createFakeClient() {
  return {
    createRun: vi.fn().mockResolvedValue(undefined),
    updateRun: vi.fn().mockResolvedValue(undefined),
    flush: vi.fn().mockResolvedValue(undefined),
  };
}

// ─── Import AFTER mocks ────────────────────────────────────

import {
  initLangSmithTracer,
  getTraceUrl,
  isTracingEnabled,
  teardownLangSmithTracer,
  _injectClientForTesting,
} from '../services/langsmith-tracer';

// ─── Helper: init tracer with injected client ──────────────

function initWithFakeClient() {
  // Need LANGSMITH_API_KEY to gate tracing ON, but we skip the real
  // require('langsmith') by injecting the client after init subscribes.
  process.env.LANGSMITH_API_KEY = 'ls-test-key';
  initLangSmithTracer();
  const fake = createFakeClient();
  _injectClientForTesting(fake);
  return fake;
}

// ─── Helper: extract a registered event handler ────────────

function getHandler(eventName: string) {
  const entry = mockOn.mock.calls.find(
    (c: unknown[]) => c[0] === eventName,
  );
  return entry?.[1] as ((payload: Record<string, unknown>) => Promise<void>) | undefined;
}

describe('LangSmithTracer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uuidCounter = 0;
    teardownLangSmithTracer();
  });

  afterEach(() => {
    teardownLangSmithTracer();
    delete process.env.LANGSMITH_API_KEY;
  });

  // ─── Init ───────────────────────────────────────────────

  it('stays disabled when LANGSMITH_API_KEY is not set', () => {
    delete process.env.LANGSMITH_API_KEY;
    initLangSmithTracer();
    expect(isTracingEnabled()).toBe(false);
    expect(mockOn).not.toHaveBeenCalled();
  });

  it('enables tracing and subscribes to 10 events when API key is set', () => {
    const _fake = initWithFakeClient();
    expect(isTracingEnabled()).toBe(true);
    // 7 workflow + 3 agent = 10 event subscriptions
    expect(mockOn).toHaveBeenCalledTimes(10);
    expect(mockOn).toHaveBeenCalledWith(
      'workflow-agents.execution.started',
      expect.any(Function),
    );
  });

  // ─── Execution Started ──────────────────────────────────

  it('creates a run with client-generated UUID, project_name, and trace_id', async () => {
    const fake = initWithFakeClient();
    const handler = getHandler('workflow-agents.execution.started')!;
    await handler({ executionId: 42, workflowId: 'wf-1' });

    expect(fake.createRun).toHaveBeenCalledTimes(1);
    const params = fake.createRun.mock.calls[0][0];
    expect(params.id).toBe(MOCK_UUID);
    expect(params.run_type).toBe('chain');
    expect(params.project_name).toBe('oven-workflows');
    expect(params.trace_id).toBe(MOCK_UUID); // root is its own trace
    expect(params.inputs).toEqual({ workflowId: 'wf-1' });
  });

  // ─── getTraceUrl ────────────────────────────────────────

  it('returns a well-formed trace URL after execution started', async () => {
    initWithFakeClient();
    const handler = getHandler('workflow-agents.execution.started')!;
    await handler({ executionId: 7, workflowId: 'test' });

    expect(getTraceUrl(7)).toBe(`https://smith.langchain.com/runs/${MOCK_UUID}`);
    expect(getTraceUrl(999)).toBeNull();
  });

  // ─── Node Started (child run) ───────────────────────────

  it('creates a child run sharing the parent trace_id', async () => {
    const fake = initWithFakeClient();

    // Parent execution
    const startHandler = getHandler('workflow-agents.execution.started')!;
    await startHandler({ executionId: 10, workflowId: 'test' });

    // Child node
    const nodeHandler = getHandler('workflow-agents.node.started')!;
    await nodeHandler({ executionId: 10, nodeId: 's1', nodeType: 'llm' });

    expect(fake.createRun).toHaveBeenCalledTimes(2);
    const nodeParams = fake.createRun.mock.calls[1][0];
    expect(nodeParams.parent_run_id).toBe(MOCK_UUID);
    expect(nodeParams.trace_id).toBe(MOCK_UUID);
    expect(nodeParams.run_type).toBe('llm');
    expect(nodeParams.name).toBe('node-s1');
  });

  // ─── Execution Completed ────────────────────────────────

  it('updates the run and flushes on completion', async () => {
    const fake = initWithFakeClient();

    const startHandler = getHandler('workflow-agents.execution.started')!;
    await startHandler({ executionId: 20, workflowId: 'test' });

    const completedHandler = getHandler('workflow-agents.execution.completed')!;
    await completedHandler({ executionId: 20, context: { x: 1 }, stepsExecuted: 3 });

    expect(fake.updateRun).toHaveBeenCalledTimes(1);
    expect(fake.updateRun).toHaveBeenCalledWith(MOCK_UUID, expect.objectContaining({
      outputs: { context: { x: 1 }, stepsExecuted: 3 },
    }));
    expect(fake.flush).toHaveBeenCalledTimes(1);
  });

  // ─── Execution Failed ───────────────────────────────────

  it('updates with error string and flushes on failure', async () => {
    const fake = initWithFakeClient();

    const startHandler = getHandler('workflow-agents.execution.started')!;
    await startHandler({ executionId: 30, workflowId: 'test' });

    const failedHandler = getHandler('workflow-agents.execution.failed')!;
    await failedHandler({ executionId: 30, error: 'boom' });

    expect(fake.updateRun).toHaveBeenCalledWith(MOCK_UUID, expect.objectContaining({
      error: 'boom',
    }));
    expect(fake.flush).toHaveBeenCalledTimes(1);
  });

  // ─── Error Logging ──────────────────────────────────────

  it('logs a console.warn instead of silently swallowing failures', async () => {
    const fake = initWithFakeClient();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    fake.createRun.mockRejectedValueOnce(new Error('network timeout'));

    const startHandler = getHandler('workflow-agents.execution.started')!;
    await startHandler({ executionId: 50, workflowId: 'test' });

    expect(warnSpy).toHaveBeenCalledWith(
      '[langsmith] Failed to create workflow run:',
      'network timeout',
    );
    warnSpy.mockRestore();
  });
});

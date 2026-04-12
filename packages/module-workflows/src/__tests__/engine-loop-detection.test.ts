import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DB and event bus before importing engine
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
};

vi.mock('@oven/module-registry/db', () => ({
  getDb: () => mockDb,
}));

vi.mock('@oven/module-registry/event-bus', () => ({
  eventBus: { emit: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../node-registry', () => ({
  nodeRegistry: { get: vi.fn().mockReturnValue(undefined) },
}));

vi.mock('../execution-strategy', () => ({
  NetworkStrategy: vi.fn().mockImplementation(() => ({
    executeApiCall: vi.fn().mockResolvedValue({}),
  })),
}));

import type { WorkflowDefinition } from '../types';

describe('engine loop detection (F-03-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects an infinite A->B->A loop via transition tracking', async () => {
    // A workflow that loops: stateA always->stateB, stateB always->stateA
    const loopingDef: WorkflowDefinition = {
      id: 'loop-test',
      initial: 'stateA',
      states: {
        stateA: {
          always: [{ target: 'stateB' }],
        },
        stateB: {
          always: [{ target: 'stateA' }],
        },
      },
    };

    // Mock: workflow lookup returns the looping definition
    mockDb.limit.mockResolvedValueOnce([{
      id: 1,
      enabled: true,
      definition: loopingDef,
      name: 'Loop Test',
    }]);
    // Mock: insert execution returns an execution record
    mockDb.returning.mockResolvedValueOnce([{ id: 100 }]);
    // Mock: update calls succeed
    mockDb.returning.mockResolvedValue([]);
    mockDb.limit.mockResolvedValue([]);

    // The engine should detect the loop and mark execution as failed
    // (executeWorkflow catches errors internally)
    const { workflowEngine } = await import('../engine');
    const execId = await workflowEngine.executeWorkflow(1, {});

    // The execution should have been created (returns the ID)
    expect(execId).toBe(100);

    // Check that the update was called with 'failed' status
    const setCalls = mockDb.set.mock.calls;
    const failedCall = setCalls.find(
      (call: unknown[]) =>
        call[0] &&
        typeof call[0] === 'object' &&
        'status' in call[0] &&
        (call[0] as Record<string, unknown>).status === 'failed'
    );
    expect(failedCall).toBeDefined();
    const failedData = failedCall![0] as Record<string, unknown>;
    expect(failedData.error).toContain('Infinite loop detected');
  });
});

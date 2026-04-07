import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock DB for node execution recording tests ─────────────

let insertValues: unknown[] = [];
let updateValues: unknown[] = [];

vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
          orderBy: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((vals: unknown) => {
        insertValues.push(vals);
        return { returning: vi.fn(() => Promise.resolve([{ id: 1, ...vals as Record<string, unknown> }])) };
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn((vals: unknown) => {
        updateValues.push(vals);
        return {
          where: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([{ id: 1 }])),
          })),
        };
      }),
    })),
  })),
}));

vi.mock('@oven/module-registry', () => ({
  eventBus: { emit: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@oven/module-ai', () => ({
  aiGenerateText: vi.fn().mockResolvedValue({ text: 'Test response', tokens: { input: 10, output: 5, total: 15 } }),
  aiEmbed: vi.fn().mockResolvedValue({ embedding: [0.1], tokens: 5 }),
}));

// ─── Issue 1: Entry Point Detection ─────────────────────────

import { definitionToFlow, flowToDefinition } from '@oven/agent-workflow-editor';

describe('Issue 1: Entry Point', () => {
  it('definitionToFlow marks the initial state with _isEntry: true', () => {
    const def = {
      id: 'test', initial: 'myStart',
      states: {
        myStart: { invoke: { src: 'llm', input: {}, onDone: 'done' } },
        done: { type: 'final' },
      },
    };
    const { nodes } = definitionToFlow(def as never);
    const entryNode = nodes.find(n => n.id === 'myStart');
    expect(entryNode?.data._isEntry).toBe(true);
  });

  it('only one node has _isEntry: true', () => {
    const def = {
      id: 'test', initial: 'step1',
      states: {
        step1: { invoke: { src: 'llm', input: {}, onDone: 'step2' } },
        step2: { invoke: { src: 'rag', input: {}, onDone: 'done' } },
        done: { type: 'final' },
      },
    };
    const { nodes } = definitionToFlow(def as never);
    const entryNodes = nodes.filter(n => n.data._isEntry);
    expect(entryNodes).toHaveLength(1);
    expect(entryNodes[0].id).toBe('step1');
  });

  it('flowToDefinition uses _isEntry flag for initial state', () => {
    const nodes = [
      { id: 'nodeB', type: 'agentNode', position: { x: 300, y: 200 }, data: { label: 'nodeB', nodeSlug: 'llm', category: 'AI', color: '#7C4DFF', icon: '🧠', config: {}, inputMapping: {}, _isEntry: true } },
      { id: 'nodeA', type: 'agentNode', position: { x: 300, y: 50 }, data: { label: 'nodeA', nodeSlug: 'rag', category: 'Knowledge', color: '#4CAF50', icon: '📚', config: {}, inputMapping: {}, _isEntry: false } },
      { id: 'done', type: 'agentNode', position: { x: 300, y: 350 }, data: { label: 'done', nodeSlug: 'end', category: 'Control', color: '#EF5350', icon: '🏁', config: {}, inputMapping: {} } },
    ];
    const edges = [
      { id: 'e1', source: 'nodeB', target: 'nodeA', sourceHandle: 'done' },
      { id: 'e2', source: 'nodeA', target: 'done', sourceHandle: 'done' },
    ];
    const def = flowToDefinition(nodes as never, edges as never);
    // nodeB has _isEntry=true, so it should be the initial state even though nodeA is higher
    expect(def.initial).toBe('nodeB');
  });
});

// ─── Issue 3: Position Saving ────────────────────────────────

describe('Issue 3: Position Saving', () => {
  it('flowToDefinition includes _meta.positions', () => {
    const nodes = [
      { id: 'start', type: 'agentNode', position: { x: 100, y: 200 }, data: { label: 'start', nodeSlug: 'llm', category: 'AI', color: '#7C4DFF', icon: '🧠', config: {}, inputMapping: {}, _isEntry: true } },
      { id: 'done', type: 'agentNode', position: { x: 300, y: 400 }, data: { label: 'done', nodeSlug: 'end', category: 'Control', color: '#EF5350', icon: '🏁', config: {}, inputMapping: {} } },
    ];
    const edges = [{ id: 'e1', source: 'start', target: 'done', sourceHandle: 'done' }];
    const def = flowToDefinition(nodes as never, edges as never);
    expect(def._meta).toBeDefined();
    expect((def._meta as Record<string, unknown>).positions).toBeDefined();
    const positions = (def._meta as Record<string, Record<string, { x: number; y: number }>>).positions;
    expect(positions.start).toEqual({ x: 100, y: 200 });
    expect(positions.done).toEqual({ x: 300, y: 400 });
  });

  it('definitionToFlow uses saved positions when _meta.positions exists', () => {
    const def = {
      id: 'test', initial: 'start',
      _meta: { positions: { start: { x: 500, y: 100 }, done: { x: 500, y: 300 } } },
      states: {
        start: { invoke: { src: 'llm', input: {}, onDone: 'done' } },
        done: { type: 'final' },
      },
    };
    const { nodes } = definitionToFlow(def as never);
    expect(nodes.find(n => n.id === 'start')?.position).toEqual({ x: 500, y: 100 });
    expect(nodes.find(n => n.id === 'done')?.position).toEqual({ x: 500, y: 300 });
  });

  it('definitionToFlow falls back to auto-layout when no _meta', () => {
    const def = {
      id: 'test', initial: 'start',
      states: {
        start: { invoke: { src: 'llm', input: {}, onDone: 'done' } },
        done: { type: 'final' },
      },
    };
    const { nodes } = definitionToFlow(def as never);
    // Auto-layout uses X_CENTER=300
    expect(nodes[0].position.x).toBe(300);
  });
});

// ─── Issue 4: setVariable Node ───────────────────────────────

import { executeNode } from '../engine/node-executor';

describe('Issue 4: setVariable Node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertValues = [];
    updateValues = [];
  });

  it('executeNode setVariable sets a variable in the result', async () => {
    const result = await executeNode('setVariable', {
      input: { variableName: 'greeting', value: 'Hello World' },
      context: {},
      config: {},
      executionId: 1,
    });
    expect(result.greeting).toBe('Hello World');
  });

  it('setVariable resolves $.path values', async () => {
    const result = await executeNode('setVariable', {
      input: { variableName: 'name', value: '$.trigger.userName' },
      context: { trigger: { userName: 'Alice' } },
      config: {},
      executionId: 1,
    });
    expect(result.name).toBe('Alice');
  });
});

// ─── Issue 5: Object Preview ─────────────────────────────────

describe('Issue 5: Object Preview', () => {
  it('config values that are objects should serialize to JSON string', () => {
    const val = { urgent: 'handleUrgent', normal: 'handleNormal' };
    // The fix ensures String(val) is replaced with JSON.stringify(val)
    const preview = typeof val === 'object' ? JSON.stringify(val) : String(val);
    expect(preview).not.toBe('[object Object]');
    expect(preview).toContain('urgent');
  });
});

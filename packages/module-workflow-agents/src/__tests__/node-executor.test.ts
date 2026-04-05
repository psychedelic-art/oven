import { describe, it, expect, vi, beforeEach } from 'vitest';

let selectResult: unknown[] = [];

vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve(selectResult)),
          orderBy: vi.fn(() => Promise.resolve(selectResult)),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 1 }])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: 1 }])),
        })),
      })),
    })),
  })),
}));

vi.mock('@oven/module-registry', () => ({
  eventBus: { emit: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@oven/module-ai', () => ({
  aiGenerateText: vi.fn().mockResolvedValue({ text: 'AI response', tokens: { input: 100, output: 50, total: 150 } }),
  aiEmbed: vi.fn().mockResolvedValue({ embedding: [0.1, 0.2, 0.3], tokens: 10 }),
}));

vi.mock('@oven/module-agent-core', () => ({
  discoverTools: vi.fn().mockReturnValue([
    { name: 'kb.search', description: 'Search KB', parameters: {}, method: 'POST', route: 'knowledge-bases/search', moduleSlug: 'knowledge-base' },
    { name: 'maps.tiles.list', description: 'List tiles', parameters: {}, method: 'GET', route: 'tiles', moduleSlug: 'maps' },
  ]),
  executeTool: vi.fn().mockResolvedValue({ results: [{ id: 1, answer: 'Found result' }] }),
  invokeAgent: vi.fn().mockResolvedValue({
    text: 'Subagent response text',
    tokens: { input: 50, output: 30, total: 80 },
    toolsUsed: ['kb.search'],
    latencyMs: 1200,
    sessionId: 10,
    messageId: 20,
    executionId: 5,
    model: 'fast',
    provider: 'openai',
  }),
}));

vi.mock('@oven/module-knowledge-base', () => ({
  hybridSearch: vi.fn().mockResolvedValue({
    results: [
      { id: 1, question: 'What are your hours?', answer: 'Mon-Fri 9-18', category: 'FAQ', categorySlug: 'faq', score: 0.92, matchType: 'hybrid', language: 'en' },
      { id: 2, question: 'Where are you located?', answer: '123 Main St', category: 'FAQ', categorySlug: 'faq', score: 0.85, matchType: 'semantic', language: 'en' },
    ],
    totalResults: 2,
    confidenceThreshold: 0.8,
    topResultConfident: true,
  }),
}));

import { executeNode, resolveInputs, evaluateGuard } from '../engine/node-executor';
import { executeTool, discoverTools, invokeAgent } from '@oven/module-agent-core';
import { hybridSearch } from '@oven/module-knowledge-base';
import { aiEmbed } from '@oven/module-ai';

describe('NodeExecutor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResult = [];
  });

  // ─── resolveInputs (existing tests) ───────────────────────

  describe('resolveInputs()', () => {
    it('resolves $.path expressions from context', () => {
      const context = { user: { name: 'Alice', email: 'alice@test.com' } };
      const mapping = { name: '$.user.name', email: '$.user.email' };
      const result = resolveInputs(mapping, context);
      expect(result).toEqual({ name: 'Alice', email: 'alice@test.com' });
    });

    it('passes through literal values', () => {
      const result = resolveInputs({ greeting: 'Hello world', count: 42 }, {});
      expect(result).toEqual({ greeting: 'Hello world', count: 42 });
    });

    it('returns undefined for missing paths', () => {
      const result = resolveInputs({ val: '$.a.c.d' }, { a: { b: 1 } });
      expect(result.val).toBeUndefined();
    });

    it('resolves nested node outputs via $.nodeId.field', () => {
      const context = { llmNode: { text: 'Generated', tokens: { total: 100 } } };
      const result = resolveInputs({ response: '$.llmNode.text', count: '$.llmNode.tokens.total' }, context);
      expect(result).toEqual({ response: 'Generated', count: 100 });
    });
  });

  // ─── evaluateGuard (existing tests) ───────────────────────

  describe('evaluateGuard()', () => {
    it('evaluates == operator', () => {
      expect(evaluateGuard({ key: 'status', operator: '==', value: 'active' }, { status: 'active' })).toBe(true);
      expect(evaluateGuard({ key: 'status', operator: '==', value: 'archived' }, { status: 'active' })).toBe(false);
    });

    it('evaluates != operator', () => {
      expect(evaluateGuard({ key: 'count', operator: '!=', value: 0 }, { count: 5 })).toBe(true);
    });

    it('evaluates exists operator', () => {
      expect(evaluateGuard({ key: 'name', operator: 'exists' }, { name: 'Alice' })).toBe(true);
      expect(evaluateGuard({ key: 'missing', operator: 'exists' }, { name: 'Alice' })).toBe(false);
    });

    it('evaluates > operator', () => {
      expect(evaluateGuard({ key: 'score', operator: '>', value: 70 }, { score: 85 })).toBe(true);
      expect(evaluateGuard({ key: 'score', operator: '>', value: 90 }, { score: 85 })).toBe(false);
    });

    it('evaluates contains operator', () => {
      expect(evaluateGuard({ key: 'text', operator: 'contains', value: 'world' }, { text: 'Hello world' })).toBe(true);
    });
  });

  // ─── LLM Node (existing) ─────────────────────────────────

  describe('executeNode() — LLM', () => {
    it('calls aiGenerateText and returns output', async () => {
      const result = await executeNode('llm', {
        input: { messages: [{ role: 'user', content: 'Hello' }] },
        context: {}, config: { model: 'fast' }, executionId: 1,
      });
      expect(result.text).toBe('AI response');
      expect(result.tokens).toBeDefined();
    });
  });

  // ─── Condition Node (existing) ────────────────────────────

  describe('executeNode() — Condition', () => {
    it('returns branch result', async () => {
      const result = await executeNode('condition', {
        input: { field: 'status', operator: '==', value: 'active' },
        context: { status: 'active' }, config: {}, executionId: 1,
      });
      expect(result.branch).toBe('true');
    });
  });

  // ─── Transform Node (existing) ────────────────────────────

  describe('executeNode() — Transform', () => {
    it('applies mapping', async () => {
      const result = await executeNode('transform', {
        input: { data: {}, mapping: { greeting: '$.user.name' } },
        context: { user: { name: 'Bob' } }, config: {}, executionId: 1,
      });
      expect(result.result).toEqual({ greeting: 'Bob' });
    });
  });

  // ─── Tool Executor Node (WIRED) ───���──────────────────────

  describe('executeNode() — Tool Executor (wired)', () => {
    it('resolves tool by name and calls executeTool', async () => {
      const result = await executeNode('tool-executor', {
        input: { toolCalls: [{ name: 'kb.search', args: { query: 'test' } }] },
        context: {}, config: {}, executionId: 1,
      });
      expect(result.toolResults).toBeDefined();
      expect(Array.isArray(result.toolResults)).toBe(true);
      const results = result.toolResults as Array<Record<string, unknown>>;
      expect(results[0].name).toBe('kb.search');
      expect(results[0].status).toBe('success');
      expect(executeTool).toHaveBeenCalled();
    });

    it('handles missing tool gracefully', async () => {
      const result = await executeNode('tool-executor', {
        input: { toolCalls: [{ name: 'nonexistent.tool', args: {} }] },
        context: {}, config: {}, executionId: 1,
      });
      const results = result.toolResults as Array<Record<string, unknown>>;
      expect(results[0].status).toBe('error');
    });

    it('records duration for each tool call', async () => {
      const result = await executeNode('tool-executor', {
        input: { toolCalls: [{ name: 'kb.search', args: { query: 'hello' } }] },
        context: {}, config: {}, executionId: 1,
      });
      const results = result.toolResults as Array<Record<string, unknown>>;
      expect(results[0].durationMs).toBeDefined();
      expect(typeof results[0].durationMs).toBe('number');
    });
  });

  // ─── Memory Node (WIRED) ─────────────────────────────────

  describe('executeNode() — Memory (wired)', () => {
    it('write mode embeds and stores content', async () => {
      const result = await executeNode('memory', {
        input: { mode: 'write', content: 'User prefers Spanish', key: 'language-pref' },
        context: {}, config: {}, executionId: 1, tenantId: 1,
      });
      expect(result.stored).toBe(true);
      expect(result.id).toBeDefined();
      expect(aiEmbed).toHaveBeenCalledWith('User prefers Spanish');
    });

    it('read mode returns memories array', async () => {
      const result = await executeNode('memory', {
        input: { mode: 'read', query: 'language preference' },
        context: {}, config: {}, executionId: 1, tenantId: 1,
      });
      expect(result.memories).toBeDefined();
      expect(Array.isArray(result.memories)).toBe(true);
    });
  });

  // ─── RAG Node (WIRED) ────────────────────────────────────

  describe('executeNode() — RAG (wired)', () => {
    it('calls hybridSearch and returns formatted results', async () => {
      const result = await executeNode('rag', {
        input: { query: 'business hours', tenantId: 1 },
        context: {}, config: {}, executionId: 1, tenantId: 1,
      });
      expect(result.context).toBeDefined();
      expect(Array.isArray(result.context)).toBe(true);
      expect(result.resultCount).toBe(2);
      expect(hybridSearch).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'business hours', tenantId: 1 }),
        expect.any(Number),
      );
    });

    it('handles empty results', async () => {
      vi.mocked(hybridSearch).mockResolvedValueOnce({
        results: [], totalResults: 0, confidenceThreshold: 0.8, topResultConfident: false,
      });
      const result = await executeNode('rag', {
        input: { query: 'nonexistent topic', tenantId: 1 },
        context: {}, config: {}, executionId: 1, tenantId: 1,
      });
      expect(result.context).toEqual([]);
      expect(result.resultCount).toBe(0);
    });
  });

  // ─── Subagent Node (WIRED) ──���────────────────────────────

  describe('executeNode() — Subagent (wired)', () => {
    it('calls invokeAgent with slug and returns response', async () => {
      const result = await executeNode('subagent', {
        input: { agentSlug: 'dental-assistant', message: 'Schedule appointment' },
        context: {}, config: {}, executionId: 1, tenantId: 1,
      });
      expect(result.text).toBe('Subagent response text');
      expect(result.tokens).toBeDefined();
      expect(result.toolsUsed).toEqual(['kb.search']);
      expect(invokeAgent).toHaveBeenCalledWith(
        'dental-assistant',
        expect.objectContaining({ messages: expect.any(Array) }),
        expect.objectContaining({ tenantId: 1 }),
      );
    });

    it('handles invocation failure', async () => {
      vi.mocked(invokeAgent).mockRejectedValueOnce(new Error('Agent not found'));
      const result = await executeNode('subagent', {
        input: { agentSlug: 'nonexistent', message: 'Hello' },
        context: {}, config: {}, executionId: 1,
      });
      expect(result.error).toContain('Agent not found');
    });
  });

  // ─── Unknown Node ─────────────────────────────────────────

  describe('executeNode() — Unknown', () => {
    it('returns error for unknown node type', async () => {
      const result = await executeNode('nonexistent', { input: {}, context: {}, config: {}, executionId: 1 });
      expect(result.error).toBeDefined();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

let selectResult: unknown[] = [];

vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve(selectResult)),
          })),
          limit: vi.fn(() => Promise.resolve(selectResult)),
        })),
      })),
    })),
  })),
}));

vi.mock('@oven/module-registry', () => ({
  eventBus: { emit: vi.fn().mockResolvedValue(undefined) },
}));

import {
  getRecentMessages,
  estimateTokens,
  truncateToTokenBudget,
  buildContextMessages,
} from '../engine/context-manager';

describe('ContextManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResult = [];
  });

  describe('estimateTokens()', () => {
    it('short inputs use conservative 1 per 3 chars (F-02-03)', () => {
      // 11 chars / 3 = 3.67 → 4. Short inputs over-estimate to avoid
      // under-counting slash commands and short JSON payloads.
      expect(estimateTokens('Hello world')).toBe(4);
    });

    it('handles empty string', () => {
      expect(estimateTokens('')).toBe(0);
    });

    it('handles long prose text (~1 per 4 chars)', () => {
      const longText = 'a'.repeat(1000);
      expect(estimateTokens(longText)).toBe(250);
    });

    it('code/JSON gets a higher multiplier (F-02-03)', () => {
      // A JSON-heavy fixture must estimate HIGHER than chars/4 since
      // code tokenizes denser than English prose.
      const json = JSON.stringify({
        items: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }],
        meta: { createdAt: '2026-04-14', tags: ['alpha', 'beta', 'gamma'] },
      });
      const rawOver4 = Math.ceil(json.length / 4);
      const estimated = estimateTokens(json);
      expect(estimated).toBeGreaterThan(rawOver4);
    });
  });

  describe('getRecentMessages()', () => {
    it('returns messages from DB ordered by createdAt desc', async () => {
      selectResult = [
        { id: 3, role: 'assistant', content: [{ type: 'text', text: 'Hi there' }], createdAt: new Date() },
        { id: 2, role: 'user', content: [{ type: 'text', text: 'Hello' }], createdAt: new Date() },
      ];
      const messages = await getRecentMessages(1, 50);
      expect(messages).toHaveLength(2);
    });

    it('respects the limit parameter', async () => {
      selectResult = [{ id: 1, role: 'user', content: [{ type: 'text', text: 'test' }] }];
      const messages = await getRecentMessages(1, 10);
      expect(messages).toBeDefined();
    });
  });

  describe('truncateToTokenBudget()', () => {
    it('returns all messages when within budget', () => {
      const messages = [
        { role: 'user' as const, content: 'Short message' },
        { role: 'assistant' as const, content: 'Short reply' },
      ];
      const result = truncateToTokenBudget(messages, 1000);
      expect(result).toHaveLength(2);
    });

    it('drops oldest messages when over budget', () => {
      const messages = [
        { role: 'user' as const, content: 'a'.repeat(400) },   // ~100 tokens
        { role: 'assistant' as const, content: 'b'.repeat(400) }, // ~100 tokens
        { role: 'user' as const, content: 'c'.repeat(400) },   // ~100 tokens
      ];
      const result = truncateToTokenBudget(messages, 60); // Only room for ~1 message
      expect(result.length).toBeLessThan(3);
      // Always keeps the last (most recent) message — truncated per F-02-02
      expect(result[result.length - 1].content.startsWith('c'.repeat(60))).toBe(true);
    });

    it('truncates a single oversize message to fit the budget (F-02-02)', () => {
      // Single message of 4000 chars (~1000 tokens) against a 100-token
      // budget. The old behavior kept the whole message, silently
      // overflowing. The fix: message-level truncation with a marker.
      const oversize = 'x'.repeat(4000);
      const result = truncateToTokenBudget(
        [{ role: 'user', content: oversize }],
        100,
      );
      expect(result).toHaveLength(1);
      // Should be truncated well below the original length
      expect(result[0].content.length).toBeLessThan(500);
      // Should contain the truncation marker
      expect(result[0].content).toContain('[truncated]');
    });
  });

  describe('buildContextMessages()', () => {
    it('combines system prompt + history into message array', () => {
      const result = buildContextMessages({
        systemPrompt: 'You are a helpful assistant.',
        history: [
          { role: 'user' as const, content: 'Hello' },
          { role: 'assistant' as const, content: 'Hi!' },
        ],
        userMessage: 'What can you do?',
      });
      expect(result[0]).toEqual({ role: 'system', content: 'You are a helpful assistant.' });
      expect(result[result.length - 1]).toEqual({ role: 'user', content: 'What can you do?' });
      expect(result).toHaveLength(4);
    });

    it('works with empty history', () => {
      const result = buildContextMessages({
        systemPrompt: 'System',
        history: [],
        userMessage: 'Hello',
      });
      expect(result).toHaveLength(2);
    });
  });
});

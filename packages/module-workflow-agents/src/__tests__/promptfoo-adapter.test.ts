import { describe, it, expect } from 'vitest';

// ─── Promptfoo Adapter Tests ────────────────────────────────

import {
  compileTargetToPromptfooConfig,
  mapChecksToAssertions,
} from '../services/promptfoo-adapter';

describe('PromptfooAdapter', () => {
  describe('compileTargetToPromptfooConfig()', () => {
    it('generates valid config for agent target', () => {
      const config = compileTargetToPromptfooConfig(
        { mode: 'agent', id: 1, slug: 'test-agent' },
        [{ input: 'Hello', assertions: [{ type: 'contains', value: 'hi' }] }],
      );
      expect(config.providers).toHaveLength(1);
      expect((config.providers as Array<Record<string, unknown>>)[0].id).toBe('oven-agent:test-agent');
      expect(config.tests).toHaveLength(1);
    });

    it('generates valid config for workflow target', () => {
      const config = compileTargetToPromptfooConfig(
        { mode: 'workflow', id: 5, slug: 'rag-assistant' },
        [{ input: 'What are your hours?' }],
      );
      expect((config.providers as Array<Record<string, unknown>>)[0].id).toBe('oven-workflow:rag-assistant');
    });

    it('maps test cases to prompts and tests', () => {
      const config = compileTargetToPromptfooConfig(
        { mode: 'agent', id: 1, slug: 'a' },
        [
          { input: 'Q1', assertions: [{ type: 'contains', value: 'answer' }] },
          { input: 'Q2', expected: 'Expected answer' },
        ],
      );
      expect(config.prompts).toHaveLength(2);
      expect(config.tests).toHaveLength(2);
    });
  });

  describe('mapChecksToAssertions()', () => {
    it('maps contains check', () => {
      const result = mapChecksToAssertions([{ operator: 'contains', value: 'hello' }]);
      expect(result[0]).toEqual({ type: 'contains', value: 'hello' });
    });

    it('maps not_contains check', () => {
      const result = mapChecksToAssertions([{ operator: 'not_contains', value: 'bad' }]);
      expect(result[0]).toEqual({ type: 'not-contains', value: 'bad' });
    });

    it('maps matches to regex', () => {
      const result = mapChecksToAssertions([{ operator: 'matches', value: '\\d+' }]);
      expect(result[0]).toEqual({ type: 'regex', value: '\\d+' });
    });

    it('maps min_length to javascript', () => {
      const result = mapChecksToAssertions([{ operator: 'min_length', value: 10 }]);
      expect(result[0].type).toBe('javascript');
      expect(result[0].value).toContain('10');
    });

    it('maps is_json', () => {
      const result = mapChecksToAssertions([{ operator: 'is_json' }]);
      expect(result[0]).toEqual({ type: 'is-json' });
    });
  });
});

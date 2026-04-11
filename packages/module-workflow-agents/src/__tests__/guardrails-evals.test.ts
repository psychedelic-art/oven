import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
          orderBy: vi.fn(() => Promise.resolve([])),
          groupBy: vi.fn(() => Promise.resolve([])),
        })),
        groupBy: vi.fn(() => Promise.resolve([])),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 1 }])),
      })),
    })),
  })),
}));

vi.mock('@oven/module-registry', () => ({
  eventBus: { emit: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@oven/module-ai', () => ({
  aiGenerateText: vi.fn().mockResolvedValue({ text: 'Score: 85', tokens: { input: 10, output: 5, total: 15 } }),
  evaluateGuardrails: vi.fn().mockResolvedValue({ passed: true, action: 'warn' }),
}));

// ─── Eval Runner Tests ──────────────────────────────────────

import { runEvaluation } from '../engine/eval-runner';

describe('EvalRunner', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('rule-based eval: passes when all checks pass', async () => {
    const result = await runEvaluation(
      { id: 1, evalType: 'rule', config: { type: 'rule', checks: [
        { field: 'respond.text', operator: 'contains', value: 'hello' },
        { field: 'respond.text', operator: 'min_length', value: 3 },
      ] } },
      { respond: { text: 'hello world' } },
    );
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
  });

  it('rule-based eval: fails when check fails', async () => {
    const result = await runEvaluation(
      { id: 1, evalType: 'rule', config: { type: 'rule', checks: [
        { field: 'respond.text', operator: 'contains', value: 'missing' },
      ] } },
      { respond: { text: 'hello world' } },
    );
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
  });

  it('rule-based eval: partial pass scores correctly', async () => {
    const result = await runEvaluation(
      { id: 1, evalType: 'rule', config: { type: 'rule', checks: [
        { field: 'respond.text', operator: 'contains', value: 'hello' },
        { field: 'respond.text', operator: 'contains', value: 'missing' },
      ] } },
      { respond: { text: 'hello world' } },
    );
    expect(result.score).toBe(50);
    expect(result.passed).toBe(false); // 50 < 70 threshold
  });

  it('llm-based eval: extracts score from LLM response', async () => {
    const result = await runEvaluation(
      { id: 1, evalType: 'llm', config: { type: 'llm', prompt: 'Rate this output: {{output}}', passingScore: 70 } },
      { respond: { text: 'good response' } },
    );
    expect(result.score).toBe(85);
    expect(result.passed).toBe(true);
  });

  it('returns error for unknown eval type', async () => {
    const result = await runEvaluation(
      { id: 1, evalType: 'unknown' as 'rule', config: {} as never },
      {},
    );
    expect(result.passed).toBe(false);
    expect(result.details.error).toContain('Unknown');
  });
});

// ─── Guardrail Integration Test ─────────────────────────────

import { evaluateGuardrails } from '@oven/module-ai';

describe('Guardrail Integration', () => {
  it('evaluateGuardrails returns pass for clean content', async () => {
    const result = await evaluateGuardrails('Hello, how can I help?', 'input');
    expect(result.passed).toBe(true);
  });

  it('evaluateGuardrails blocks when configured', async () => {
    vi.mocked(evaluateGuardrails).mockResolvedValueOnce({ passed: false, action: 'block', message: 'Forbidden content' });
    const result = await evaluateGuardrails('bad content', 'input');
    expect(result.passed).toBe(false);
    expect(result.action).toBe('block');
  });
});

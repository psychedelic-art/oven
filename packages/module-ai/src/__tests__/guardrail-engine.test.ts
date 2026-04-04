import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockOrderBy = vi.fn();
const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }));
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(() => ({
    select: mockSelect,
  })),
}));

vi.mock('@oven/module-registry', () => ({
  eventBus: { emit: vi.fn().mockResolvedValue(undefined) },
}));

// Mock drizzle-orm operators
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ({ op: 'eq', args })),
  and: vi.fn((...args: unknown[]) => ({ op: 'and', args })),
  or: vi.fn((...args: unknown[]) => ({ op: 'or', args })),
  isNull: vi.fn((col: unknown) => ({ op: 'isNull', col })),
  asc: vi.fn((col: unknown) => ({ op: 'asc', col })),
}));

vi.mock('../schema', () => ({
  aiGuardrails: {
    tenantId: 'tenantId',
    scope: 'scope',
    enabled: 'enabled',
    priority: 'priority',
  },
}));

import { evaluateGuardrails } from '../engine/guardrail-engine';
import { eventBus } from '@oven/module-registry';

describe('guardrail-engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrderBy.mockResolvedValue([]);
  });

  it('returns passed=true when no rules match', async () => {
    mockOrderBy.mockResolvedValueOnce([]);

    const result = await evaluateGuardrails('hello world', 'input');
    expect(result.passed).toBe(true);
    expect(result.action).toBe('warn');
  });

  it('keyword rule blocks matching input', async () => {
    mockOrderBy.mockResolvedValueOnce([
      {
        id: 1,
        tenantId: null,
        name: 'Block bad words',
        ruleType: 'keyword',
        pattern: 'badword,offensive',
        scope: 'input',
        action: 'block',
        message: 'Content contains blocked keywords',
        priority: 1,
      },
    ]);

    const result = await evaluateGuardrails('this contains badword text', 'input');
    expect(result.passed).toBe(false);
    expect(result.action).toBe('block');
    expect(result.message).toBe('Content contains blocked keywords');
    expect(result.ruleId).toBe(1);
  });

  it('keyword rule is case-insensitive', async () => {
    mockOrderBy.mockResolvedValueOnce([
      {
        id: 2,
        tenantId: null,
        name: 'Block spam',
        ruleType: 'keyword',
        pattern: 'spam',
        scope: 'input',
        action: 'block',
        message: null,
        priority: 1,
      },
    ]);

    const result = await evaluateGuardrails('This is SPAM content', 'input');
    expect(result.passed).toBe(false);
    expect(result.action).toBe('block');
  });

  it('regex rule blocks matching pattern', async () => {
    mockOrderBy.mockResolvedValueOnce([
      {
        id: 3,
        tenantId: null,
        name: 'Block SSN',
        ruleType: 'regex',
        pattern: '\\d{3}-\\d{2}-\\d{4}',
        scope: 'input',
        action: 'block',
        message: 'SSN detected',
        priority: 1,
      },
    ]);

    const result = await evaluateGuardrails('my ssn is 123-45-6789', 'input');
    expect(result.passed).toBe(false);
    expect(result.message).toBe('SSN detected');
  });

  it('does not match non-matching text', async () => {
    mockOrderBy.mockResolvedValueOnce([
      {
        id: 4,
        tenantId: null,
        name: 'Block profanity',
        ruleType: 'keyword',
        pattern: 'profanity,vulgar',
        scope: 'input',
        action: 'block',
        message: 'Profanity detected',
        priority: 1,
      },
    ]);

    const result = await evaluateGuardrails('this is perfectly clean text', 'input');
    expect(result.passed).toBe(true);
  });

  it('warn action returns passed=true', async () => {
    mockOrderBy.mockResolvedValueOnce([
      {
        id: 5,
        tenantId: null,
        name: 'Warn about PII',
        ruleType: 'keyword',
        pattern: 'email,phone',
        scope: 'input',
        action: 'warn',
        message: 'PII detected - proceed with caution',
        priority: 1,
      },
    ]);

    const result = await evaluateGuardrails('send me an email please', 'input');
    expect(result.passed).toBe(true);
    expect(result.action).toBe('warn');
    expect(result.message).toBe('PII detected - proceed with caution');
  });

  it('first matching rule by priority wins', async () => {
    mockOrderBy.mockResolvedValueOnce([
      {
        id: 10,
        tenantId: null,
        name: 'High priority block',
        ruleType: 'keyword',
        pattern: 'danger',
        scope: 'input',
        action: 'block',
        message: 'Blocked by high priority',
        priority: 1,
      },
      {
        id: 11,
        tenantId: null,
        name: 'Low priority warn',
        ruleType: 'keyword',
        pattern: 'danger',
        scope: 'input',
        action: 'warn',
        message: 'Warning from low priority',
        priority: 10,
      },
    ]);

    const result = await evaluateGuardrails('this is danger zone', 'input');
    expect(result.action).toBe('block');
    expect(result.ruleId).toBe(10);
  });

  it('emits guardrail triggered event on match', async () => {
    mockOrderBy.mockResolvedValueOnce([
      {
        id: 20,
        tenantId: null,
        name: 'Test rule',
        ruleType: 'keyword',
        pattern: 'trigger',
        scope: 'input',
        action: 'block',
        message: 'Triggered',
        priority: 1,
      },
    ]);

    await evaluateGuardrails('trigger this', 'input', 42);

    expect(eventBus.emit).toHaveBeenCalledWith('ai.guardrail.triggered', {
      ruleId: 20,
      ruleName: 'Test rule',
      ruleType: 'keyword',
      action: 'block',
      scope: 'input',
      tenantId: 42,
    });
  });

  it('uses default message when rule message is null', async () => {
    mockOrderBy.mockResolvedValueOnce([
      {
        id: 30,
        tenantId: null,
        name: 'No-message rule',
        ruleType: 'keyword',
        pattern: 'blocked',
        scope: 'input',
        action: 'block',
        message: null,
        priority: 1,
      },
    ]);

    const result = await evaluateGuardrails('this is blocked content', 'input');
    expect(result.message).toBe('Content blocked by guardrail: No-message rule');
  });

  it('classifier ruleType does not match (placeholder)', async () => {
    mockOrderBy.mockResolvedValueOnce([
      {
        id: 40,
        tenantId: null,
        name: 'Classifier rule',
        ruleType: 'classifier',
        pattern: 'some-classifier',
        scope: 'input',
        action: 'block',
        message: 'Classified',
        priority: 1,
      },
    ]);

    const result = await evaluateGuardrails('anything', 'input');
    expect(result.passed).toBe(true);
  });
});

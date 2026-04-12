import { describe, it, expect } from 'vitest';
import {
  GUARDRAIL_ACTION_COLORS,
  GUARDRAIL_PATTERN_TRUNCATE_AT,
  resolveGuardrailActionColor,
  truncateGuardrailPattern,
  type GuardrailRecord,
} from '../view/guardrail-record';

// F-06-01: regression tests for the pure helpers extracted from
// `apps/dashboard/src/components/ai/GuardrailList.tsx`. The helpers
// are the unit under test; the list view itself only passes values
// straight through, so exhaustive behaviour pinning here is
// sufficient to protect the rendered column output.

describe('GUARDRAIL_ACTION_COLORS', () => {
  it('maps every GuardrailAction literal to an MUI Chip colour', () => {
    // Structural pin — every key must be present and no extras.
    expect(Object.keys(GUARDRAIL_ACTION_COLORS).sort()).toEqual([
      'block',
      'modify',
      'warn',
    ]);
  });

  it('maps block to error', () => {
    expect(GUARDRAIL_ACTION_COLORS.block).toBe('error');
  });

  it('maps warn to warning', () => {
    expect(GUARDRAIL_ACTION_COLORS.warn).toBe('warning');
  });

  it('maps modify to info', () => {
    expect(GUARDRAIL_ACTION_COLORS.modify).toBe('info');
  });
});

describe('resolveGuardrailActionColor — known actions', () => {
  it.each([
    ['block', 'error'],
    ['warn', 'warning'],
    ['modify', 'info'],
  ] as const)('resolves %s to %s', (action, expected) => {
    expect(resolveGuardrailActionColor(action)).toBe(expected);
  });
});

describe('resolveGuardrailActionColor — fallbacks', () => {
  it('returns default for undefined', () => {
    expect(resolveGuardrailActionColor(undefined)).toBe('default');
  });

  it('returns default for null', () => {
    expect(resolveGuardrailActionColor(null)).toBe('default');
  });

  it('returns default for empty string', () => {
    expect(resolveGuardrailActionColor('')).toBe('default');
  });

  it('returns default for an unknown action string', () => {
    expect(resolveGuardrailActionColor('quarantine')).toBe('default');
  });

  it('returns default for a numeric-looking string', () => {
    expect(resolveGuardrailActionColor('0')).toBe('default');
  });

  it('is not case-insensitive (BLOCK is unknown)', () => {
    // Pin the historical lookup semantics — the backend stores the
    // enum lowercase; accepting BLOCK would silently paper over a
    // server-side schema regression.
    expect(resolveGuardrailActionColor('BLOCK')).toBe('default');
  });

  it('rejects accidental prototype lookups', () => {
    // Without Object.prototype.hasOwnProperty guards the user could
    // coax the colour map into returning 'hasOwnProperty' — verify
    // that the record-indexed lookup falls through to 'default'.
    expect(resolveGuardrailActionColor('hasOwnProperty')).toBe('default');
    expect(resolveGuardrailActionColor('toString')).toBe('default');
    expect(resolveGuardrailActionColor('__proto__')).toBe('default');
  });
});

describe('truncateGuardrailPattern — absence cases', () => {
  it('returns null for undefined', () => {
    expect(truncateGuardrailPattern(undefined)).toBeNull();
  });

  it('returns null for null', () => {
    expect(truncateGuardrailPattern(null)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(truncateGuardrailPattern('')).toBeNull();
  });
});

describe('truncateGuardrailPattern — length boundaries', () => {
  it('returns a 1-char pattern verbatim', () => {
    expect(truncateGuardrailPattern('x')).toBe('x');
  });

  it('returns a pattern exactly at the truncation boundary verbatim', () => {
    const boundary = 'a'.repeat(GUARDRAIL_PATTERN_TRUNCATE_AT);
    expect(boundary.length).toBe(40);
    expect(truncateGuardrailPattern(boundary)).toBe(boundary);
  });

  it('returns a pattern of exactly 39 chars verbatim (one below boundary)', () => {
    const below = 'b'.repeat(GUARDRAIL_PATTERN_TRUNCATE_AT - 1);
    expect(truncateGuardrailPattern(below)).toBe(below);
  });

  it('truncates a pattern of 41 chars with ellipsis literal', () => {
    const over = 'c'.repeat(GUARDRAIL_PATTERN_TRUNCATE_AT + 1);
    const out = truncateGuardrailPattern(over);
    expect(out).toBe(`${'c'.repeat(40)}...`);
    expect(out).toHaveLength(43);
  });

  it('truncates a long regex pattern with ellipsis literal', () => {
    const regex =
      '^(https?://)?([\\w-]+\\.)+[\\w-]+(/[\\w\\-./?%&=]*)?$';
    const out = truncateGuardrailPattern(regex);
    expect(out).toBe(`${regex.slice(0, 40)}...`);
  });

  it('uses an ASCII ellipsis (three dots), not a unicode ellipsis character', () => {
    const over = 'd'.repeat(GUARDRAIL_PATTERN_TRUNCATE_AT + 5);
    const out = truncateGuardrailPattern(over);
    // Guards against a well-meaning refactor that swaps `...` for
    // `\u2026` — the dashboard renders these in a fixed-width
    // monospace column and the unicode ellipsis breaks width
    // calculations.
    expect(out?.endsWith('...')).toBe(true);
    expect(out?.includes('\u2026')).toBe(false);
  });
});

describe('GuardrailRecord type surface', () => {
  it('is assignable from a full drizzle row shape', () => {
    // Compile-time check masquerading as a runtime test — if the
    // type drifts, this block stops compiling.
    const row: GuardrailRecord = {
      id: 1,
      tenantId: 42,
      name: 'No PII',
      ruleType: 'regex',
      pattern: '\\b\\d{3}-\\d{2}-\\d{4}\\b',
      scope: 'input',
      action: 'block',
      message: 'Blocked PII-like input',
      priority: 10,
      enabled: true,
      createdAt: new Date('2026-04-12T00:00:00Z'),
      updatedAt: '2026-04-12T00:00:00Z',
    };
    expect(row.id).toBe(1);
  });

  it('accepts a partial record (datagrid refetch state)', () => {
    const row: GuardrailRecord = { id: 2 };
    expect(row.id).toBe(2);
  });

  it('accepts unknown forward-compat keys via the index signature', () => {
    const row: GuardrailRecord = {
      id: 3,
      action: 'warn',
      // New server-side field the frontend doesn't know about yet.
      quarantineTtlSec: 3600,
    };
    expect(row.quarantineTtlSec).toBe(3600);
  });
});

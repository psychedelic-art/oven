import { describe, it, expect } from 'vitest';
import {
  EXECUTION_STATUS_COLORS,
  EXECUTION_TYPE_COLORS,
  resolveExecutionStatusColor,
  resolveExecutionTypeColor,
  formatCostCents,
} from '../view/playground-execution-record';
import type { PlaygroundExecutionRecord } from '../view/playground-execution-record';

// ─── PlaygroundExecutionRecord interface tests ───────────────

describe('PlaygroundExecutionRecord', () => {
  it('accepts a fully-populated row', () => {
    const record: PlaygroundExecutionRecord = {
      id: 1,
      tenantId: 42,
      type: 'text',
      model: 'gpt-4o-mini',
      input: { prompt: 'hello' },
      output: { text: 'world' },
      status: 'completed',
      tokenUsage: { input: 10, output: 20 },
      costCents: 5,
      latencyMs: 200,
      error: null,
      createdAt: '2026-01-01T00:00:00Z',
    };
    expect(record.id).toBe(1);
    expect(record.type).toBe('text');
  });

  it('accepts a minimal row with only id', () => {
    const record: PlaygroundExecutionRecord = { id: 1 };
    expect(record.id).toBe(1);
  });

  it('accepts output with url for image type', () => {
    const record: PlaygroundExecutionRecord = {
      id: 1,
      type: 'image',
      output: { url: 'https://example.com/img.png' },
    };
    expect(record.output?.url).toBe('https://example.com/img.png');
  });

  it('accepts unknown extra fields via index signature', () => {
    const record: PlaygroundExecutionRecord = { id: 1, customField: 'value' };
    expect(record.customField).toBe('value');
  });
});

// ─── EXECUTION_STATUS_COLORS ─────────────────────────────────

describe('EXECUTION_STATUS_COLORS', () => {
  it('maps completed to success', () => {
    expect(EXECUTION_STATUS_COLORS.completed).toBe('success');
  });

  it('maps failed to error', () => {
    expect(EXECUTION_STATUS_COLORS.failed).toBe('error');
  });

  it('contains exactly two entries', () => {
    expect(Object.keys(EXECUTION_STATUS_COLORS)).toHaveLength(2);
  });
});

// ─── resolveExecutionStatusColor ─────────────────────────────

describe('resolveExecutionStatusColor', () => {
  it('returns success for completed', () => {
    expect(resolveExecutionStatusColor('completed')).toBe('success');
  });

  it('returns error for failed', () => {
    expect(resolveExecutionStatusColor('failed')).toBe('error');
  });

  it('returns default for undefined', () => {
    expect(resolveExecutionStatusColor(undefined)).toBe('default');
  });

  it('returns default for null', () => {
    expect(resolveExecutionStatusColor(null)).toBe('default');
  });

  it('returns default for empty string', () => {
    expect(resolveExecutionStatusColor('')).toBe('default');
  });

  it('returns default for unknown status', () => {
    expect(resolveExecutionStatusColor('pending')).toBe('default');
  });

  it('guards against prototype-chain keys', () => {
    expect(resolveExecutionStatusColor('hasOwnProperty')).toBe('default');
    expect(resolveExecutionStatusColor('toString')).toBe('default');
    expect(resolveExecutionStatusColor('__proto__')).toBe('default');
  });
});

// ─── EXECUTION_TYPE_COLORS ───────────────────────────────────

describe('EXECUTION_TYPE_COLORS', () => {
  it('maps text to primary', () => {
    expect(EXECUTION_TYPE_COLORS.text).toBe('primary');
  });

  it('maps embedding to secondary', () => {
    expect(EXECUTION_TYPE_COLORS.embedding).toBe('secondary');
  });

  it('maps image to info', () => {
    expect(EXECUTION_TYPE_COLORS.image).toBe('info');
  });

  it('maps structured-output to warning', () => {
    expect(EXECUTION_TYPE_COLORS['structured-output']).toBe('warning');
  });

  it('contains exactly four entries', () => {
    expect(Object.keys(EXECUTION_TYPE_COLORS)).toHaveLength(4);
  });
});

// ─── resolveExecutionTypeColor ───────────────────────────────

describe('resolveExecutionTypeColor', () => {
  it('returns primary for text', () => {
    expect(resolveExecutionTypeColor('text')).toBe('primary');
  });

  it('returns secondary for embedding', () => {
    expect(resolveExecutionTypeColor('embedding')).toBe('secondary');
  });

  it('returns info for image', () => {
    expect(resolveExecutionTypeColor('image')).toBe('info');
  });

  it('returns warning for structured-output', () => {
    expect(resolveExecutionTypeColor('structured-output')).toBe('warning');
  });

  it('returns default for undefined', () => {
    expect(resolveExecutionTypeColor(undefined)).toBe('default');
  });

  it('returns default for null', () => {
    expect(resolveExecutionTypeColor(null)).toBe('default');
  });

  it('returns default for empty string', () => {
    expect(resolveExecutionTypeColor('')).toBe('default');
  });

  it('returns default for unknown type', () => {
    expect(resolveExecutionTypeColor('video')).toBe('default');
  });

  it('guards against prototype-chain keys', () => {
    expect(resolveExecutionTypeColor('hasOwnProperty')).toBe('default');
    expect(resolveExecutionTypeColor('constructor')).toBe('default');
  });
});

// ─── formatCostCents ─────────────────────────────────────────

describe('formatCostCents', () => {
  it('formats zero cents as $0.00', () => {
    expect(formatCostCents(0)).toBe('$0.00');
  });

  it('formats 500 cents as $5.00', () => {
    expect(formatCostCents(500)).toBe('$5.00');
  });

  it('formats 1 cent as $0.01', () => {
    expect(formatCostCents(1)).toBe('$0.01');
  });

  it('formats 99 cents as $0.99', () => {
    expect(formatCostCents(99)).toBe('$0.99');
  });

  it('returns - for null', () => {
    expect(formatCostCents(null)).toBe('-');
  });

  it('returns - for undefined', () => {
    expect(formatCostCents(undefined)).toBe('-');
  });
});

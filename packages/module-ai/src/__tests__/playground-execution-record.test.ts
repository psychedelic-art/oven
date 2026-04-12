import { describe, it, expect } from 'vitest';
import {
  EXECUTION_STATUS_COLORS,
  EXECUTION_TYPE_COLORS,
  resolveStatusColor,
  resolveTypeColor,
  formatCostCents,
  type PlaygroundExecutionRecord,
} from '../view/playground-execution-record';

// F-06-06 + F-06-07: regression tests for the pure helpers extracted
// from PlaygroundExecutionShow.tsx (6 record: any) and
// PlaygroundExecutionList.tsx (3 record: any).

describe('EXECUTION_STATUS_COLORS', () => {
  it('maps every status literal', () => {
    expect(Object.keys(EXECUTION_STATUS_COLORS).sort()).toEqual([
      'completed',
      'failed',
    ]);
  });

  it('maps completed to success', () => {
    expect(EXECUTION_STATUS_COLORS.completed).toBe('success');
  });

  it('maps failed to error', () => {
    expect(EXECUTION_STATUS_COLORS.failed).toBe('error');
  });
});

describe('EXECUTION_TYPE_COLORS', () => {
  it('maps all known execution types', () => {
    expect(Object.keys(EXECUTION_TYPE_COLORS).sort()).toEqual([
      'embedding',
      'image',
      'structured-output',
      'text',
    ]);
  });

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
});

describe('resolveStatusColor — known statuses', () => {
  it.each([
    ['completed', 'success'],
    ['failed', 'error'],
  ] as const)('returns %s -> %s', (status, expected) => {
    expect(resolveStatusColor(status)).toBe(expected);
  });
});

describe('resolveStatusColor — unknown / missing values', () => {
  it('returns default for undefined', () => {
    expect(resolveStatusColor(undefined)).toBe('default');
  });

  it('returns default for null', () => {
    expect(resolveStatusColor(null)).toBe('default');
  });

  it('returns default for empty string', () => {
    expect(resolveStatusColor('')).toBe('default');
  });

  it('returns default for unrecognised status', () => {
    expect(resolveStatusColor('pending')).toBe('default');
  });
});

describe('resolveStatusColor — prototype-chain defence', () => {
  it('returns default for hasOwnProperty', () => {
    expect(resolveStatusColor('hasOwnProperty')).toBe('default');
  });

  it('returns default for toString', () => {
    expect(resolveStatusColor('toString')).toBe('default');
  });

  it('returns default for __proto__', () => {
    expect(resolveStatusColor('__proto__')).toBe('default');
  });
});

describe('resolveTypeColor — known types', () => {
  it.each([
    ['text', 'primary'],
    ['embedding', 'secondary'],
    ['image', 'info'],
    ['structured-output', 'warning'],
  ] as const)('returns %s -> %s', (type, expected) => {
    expect(resolveTypeColor(type)).toBe(expected);
  });
});

describe('resolveTypeColor — unknown / missing values', () => {
  it('returns default for undefined', () => {
    expect(resolveTypeColor(undefined)).toBe('default');
  });

  it('returns default for null', () => {
    expect(resolveTypeColor(null)).toBe('default');
  });

  it('returns default for empty string', () => {
    expect(resolveTypeColor('')).toBe('default');
  });

  it('returns default for unrecognised type', () => {
    expect(resolveTypeColor('video')).toBe('default');
  });
});

describe('resolveTypeColor — prototype-chain defence', () => {
  it('returns default for constructor', () => {
    expect(resolveTypeColor('constructor')).toBe('default');
  });

  it('returns default for __proto__', () => {
    expect(resolveTypeColor('__proto__')).toBe('default');
  });
});

describe('formatCostCents', () => {
  it('formats 0 as $0.00', () => {
    expect(formatCostCents(0)).toBe('$0.00');
  });

  it('formats 150 as $1.50', () => {
    expect(formatCostCents(150)).toBe('$1.50');
  });

  it('formats 1 as $0.01', () => {
    expect(formatCostCents(1)).toBe('$0.01');
  });

  it('formats 10000 as $100.00', () => {
    expect(formatCostCents(10000)).toBe('$100.00');
  });

  it('returns - for null', () => {
    expect(formatCostCents(null)).toBe('-');
  });

  it('returns - for undefined', () => {
    expect(formatCostCents(undefined)).toBe('-');
  });
});

describe('PlaygroundExecutionRecord — structural compatibility', () => {
  it('accepts a minimal record with only id', () => {
    const record: PlaygroundExecutionRecord = { id: 1 };
    expect(record.id).toBe(1);
  });

  it('accepts a fully-populated record', () => {
    const record: PlaygroundExecutionRecord = {
      id: 42,
      tenantId: 7,
      type: 'text',
      model: 'gpt-4o',
      input: { prompt: 'hello' },
      output: { text: 'world' },
      status: 'completed',
      tokenUsage: { input: 10, output: 20, total: 30 },
      costCents: 5,
      latencyMs: 200,
      error: null,
      createdAt: '2026-01-01T00:00:00Z',
    };
    expect(record.type).toBe('text');
    expect(record.model).toBe('gpt-4o');
  });

  it('accepts extra unknown keys via index signature', () => {
    const record: PlaygroundExecutionRecord = {
      id: 1,
      futureField: true,
    };
    expect(record.futureField).toBe(true);
  });

  it('accepts output with url for image type', () => {
    const record: PlaygroundExecutionRecord = {
      id: 1,
      type: 'image',
      output: { url: 'https://example.com/img.png' },
    };
    const output = record.output as { url?: string };
    expect(output?.url).toBe('https://example.com/img.png');
  });
});

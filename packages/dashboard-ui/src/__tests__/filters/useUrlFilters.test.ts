import { describe, it, expect } from 'vitest';
import {
  serializeFilters,
  parseUrlFilters,
  getActiveFilterLabels,
} from '../../filters/useUrlFilters';
import type { FilterDefinition, FilterValue } from '../../filters/types';

const sampleDefinitions: FilterDefinition[] = [
  { source: 'q', label: 'Search', kind: 'quick-search', alwaysOn: true },
  {
    source: 'status',
    label: 'Status',
    kind: 'status',
    choices: [
      { id: 'active', name: 'Active', colour: 'success' },
      { id: 'closed', name: 'Closed', colour: 'error' },
    ],
  },
  { source: 'createdAt', label: 'Created', kind: 'date-range' },
  { source: 'enabled', label: 'Enabled', kind: 'boolean' },
  { source: 'type', label: 'Type', kind: 'combo', choices: [{ id: 'text', name: 'Text' }] },
];

describe('serializeFilters', () => {
  it('serializes simple key-value pairs', () => {
    const result = serializeFilters({ status: 'active', q: 'hello' });
    const params = new URLSearchParams(result);
    expect(params.get('status')).toBe('active');
    expect(params.get('q')).toBe('hello');
  });

  it('serializes date-range values with _gte and _lte suffixes', () => {
    const result = serializeFilters({
      createdAt: { gte: '2026-01-01', lte: '2026-12-31' },
    });
    const params = new URLSearchParams(result);
    expect(params.get('createdAt_gte')).toBe('2026-01-01');
    expect(params.get('createdAt_lte')).toBe('2026-12-31');
  });

  it('skips null and undefined values', () => {
    const result = serializeFilters({ status: null, q: undefined as unknown as FilterValue });
    expect(result).toBe('');
  });

  it('serializes boolean values', () => {
    const result = serializeFilters({ enabled: true });
    const params = new URLSearchParams(result);
    expect(params.get('enabled')).toBe('true');
  });
});

describe('parseUrlFilters', () => {
  it('round-trips through serialize → parse', () => {
    const original: Record<string, FilterValue> = {
      q: 'search term',
      status: 'active',
      createdAt: { gte: '2026-01-01', lte: '2026-06-30' },
      enabled: true,
      type: 'text',
    };
    const serialized = serializeFilters(original);
    const parsed = parseUrlFilters(serialized, sampleDefinitions);
    expect(parsed.q).toBe('search term');
    expect(parsed.status).toBe('active');
    expect(parsed.createdAt).toEqual({ gte: '2026-01-01', lte: '2026-06-30' });
    expect(parsed.enabled).toBe(true);
    expect(parsed.type).toBe('text');
  });

  it('handles empty search string', () => {
    const parsed = parseUrlFilters('', sampleDefinitions);
    expect(Object.keys(parsed)).toHaveLength(0);
  });

  it('handles partial date range (gte only)', () => {
    const parsed = parseUrlFilters('createdAt_gte=2026-03-01', sampleDefinitions);
    expect(parsed.createdAt).toEqual({ gte: '2026-03-01', lte: undefined });
  });

  it('preserves unknown params not in definitions', () => {
    const parsed = parseUrlFilters('tenantId=5&unknown=xyz', sampleDefinitions);
    expect(parsed.tenantId).toBe('5');
    expect(parsed.unknown).toBe('xyz');
  });
});

describe('getActiveFilterLabels', () => {
  it('returns labels for active filters', () => {
    const labels = getActiveFilterLabels(
      { status: 'active', enabled: true },
      sampleDefinitions,
    );
    expect(labels).toEqual([
      { source: 'status', label: 'Status', displayValue: 'Active' },
      { source: 'enabled', label: 'Enabled', displayValue: 'Yes' },
    ]);
  });

  it('skips quick-search and tenantId', () => {
    const labels = getActiveFilterLabels(
      { q: 'hello', tenantId: 5 },
      sampleDefinitions,
    );
    expect(labels).toHaveLength(0);
  });

  it('formats date ranges with from/to', () => {
    const labels = getActiveFilterLabels(
      { createdAt: { gte: '2026-01-01', lte: '2026-12-31' } },
      sampleDefinitions,
    );
    expect(labels[0].displayValue).toBe('from 2026-01-01 to 2026-12-31');
  });

  it('resolves choice names for combo/status filters', () => {
    const labels = getActiveFilterLabels(
      { type: 'text' },
      sampleDefinitions,
    );
    expect(labels[0].displayValue).toBe('Text');
  });

  it('falls back to raw value when choice not found', () => {
    const labels = getActiveFilterLabels(
      { type: 'unknown-value' },
      sampleDefinitions,
    );
    expect(labels[0].displayValue).toBe('unknown-value');
  });

  it('skips null and empty values', () => {
    const labels = getActiveFilterLabels(
      { status: null, type: '' },
      sampleDefinitions,
    );
    expect(labels).toHaveLength(0);
  });
});

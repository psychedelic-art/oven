import { describe, it, expect } from 'vitest';
import {
  VECTOR_STORE_ADAPTER_COLORS,
  resolveAdapterColor,
  type VectorStoreRecord,
} from '../view/vector-store-record';

// F-06-02 + F-06-03: regression tests for the pure helpers extracted
// from `apps/dashboard/src/components/ai/VectorStoreShow.tsx` and
// `VectorStoreList.tsx`. The helpers are the unit under test; the views
// only pass values straight through.

describe('VECTOR_STORE_ADAPTER_COLORS', () => {
  it('maps every VectorStoreAdapter literal to an MUI Chip colour', () => {
    expect(Object.keys(VECTOR_STORE_ADAPTER_COLORS).sort()).toEqual([
      'pgvector',
      'pinecone',
    ]);
  });

  it('maps pgvector to primary', () => {
    expect(VECTOR_STORE_ADAPTER_COLORS.pgvector).toBe('primary');
  });

  it('maps pinecone to success', () => {
    expect(VECTOR_STORE_ADAPTER_COLORS.pinecone).toBe('success');
  });
});

describe('resolveAdapterColor — known adapters', () => {
  it.each([
    ['pgvector', 'primary'],
    ['pinecone', 'success'],
  ] as const)('returns %s -> %s', (adapter, expected) => {
    expect(resolveAdapterColor(adapter)).toBe(expected);
  });
});

describe('resolveAdapterColor — unknown / missing values', () => {
  it('returns default for undefined', () => {
    expect(resolveAdapterColor(undefined)).toBe('default');
  });

  it('returns default for null', () => {
    expect(resolveAdapterColor(null)).toBe('default');
  });

  it('returns default for empty string', () => {
    expect(resolveAdapterColor('')).toBe('default');
  });

  it('returns default for an unrecognised adapter string', () => {
    expect(resolveAdapterColor('milvus')).toBe('default');
  });

  it('returns default for a future adapter not yet in the map', () => {
    expect(resolveAdapterColor('chroma')).toBe('default');
  });
});

describe('resolveAdapterColor — prototype-chain defence', () => {
  it('returns default for hasOwnProperty', () => {
    expect(resolveAdapterColor('hasOwnProperty')).toBe('default');
  });

  it('returns default for toString', () => {
    expect(resolveAdapterColor('toString')).toBe('default');
  });

  it('returns default for __proto__', () => {
    expect(resolveAdapterColor('__proto__')).toBe('default');
  });

  it('returns default for constructor', () => {
    expect(resolveAdapterColor('constructor')).toBe('default');
  });
});

describe('VectorStoreRecord — structural compatibility', () => {
  it('accepts a minimal record with only id', () => {
    const record: VectorStoreRecord = { id: 1 };
    expect(record.id).toBe(1);
  });

  it('accepts a fully-populated record', () => {
    const record: VectorStoreRecord = {
      id: 42,
      tenantId: 7,
      name: 'Test Store',
      slug: 'test-store',
      adapter: 'pgvector',
      connectionConfig: { host: 'localhost' },
      embeddingModel: 'text-embedding-3-small',
      dimensions: 1536,
      distanceMetric: 'cosine',
      documentCount: 100,
      enabled: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: new Date(),
    };
    expect(record.name).toBe('Test Store');
    expect(record.adapter).toBe('pgvector');
  });

  it('accepts extra unknown keys via index signature', () => {
    const record: VectorStoreRecord = {
      id: 1,
      someFutureField: 'hello',
    };
    expect(record.someFutureField).toBe('hello');
  });

  it('tolerates null connectionConfig', () => {
    const record: VectorStoreRecord = {
      id: 1,
      connectionConfig: null,
    };
    expect(record.connectionConfig).toBeNull();
  });
});

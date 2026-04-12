import { describe, it, expect } from 'vitest';
import {
  VECTOR_STORE_ADAPTER_COLORS,
  resolveAdapterColor,
} from '../view/vector-store-record';
import type { VectorStoreRecord } from '../view/vector-store-record';

// ─── VectorStoreRecord interface tests ───────────────────────

describe('VectorStoreRecord', () => {
  it('accepts a fully-populated row', () => {
    const record: VectorStoreRecord = {
      id: 1,
      tenantId: 42,
      name: 'test-store',
      slug: 'test-store',
      adapter: 'pgvector',
      connectionConfig: { host: 'localhost' },
      embeddingProviderId: 3,
      embeddingModel: 'text-embedding-3-small',
      dimensions: 1536,
      distanceMetric: 'cosine',
      documentCount: 100,
      enabled: true,
      metadata: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    expect(record.id).toBe(1);
    expect(record.adapter).toBe('pgvector');
  });

  it('accepts a minimal row with only id', () => {
    const record: VectorStoreRecord = { id: 1 };
    expect(record.id).toBe(1);
  });

  it('accepts unknown extra fields via index signature', () => {
    const record: VectorStoreRecord = { id: 1, customField: 'value' };
    expect(record.customField).toBe('value');
  });
});

// ─── VECTOR_STORE_ADAPTER_COLORS ─────────────────────────────

describe('VECTOR_STORE_ADAPTER_COLORS', () => {
  it('maps pgvector to primary', () => {
    expect(VECTOR_STORE_ADAPTER_COLORS.pgvector).toBe('primary');
  });

  it('maps pinecone to success', () => {
    expect(VECTOR_STORE_ADAPTER_COLORS.pinecone).toBe('success');
  });

  it('contains exactly two entries', () => {
    expect(Object.keys(VECTOR_STORE_ADAPTER_COLORS)).toHaveLength(2);
  });
});

// ─── resolveAdapterColor ─────────────────────────────────────

describe('resolveAdapterColor', () => {
  it('returns primary for pgvector', () => {
    expect(resolveAdapterColor('pgvector')).toBe('primary');
  });

  it('returns success for pinecone', () => {
    expect(resolveAdapterColor('pinecone')).toBe('success');
  });

  it('returns default for undefined', () => {
    expect(resolveAdapterColor(undefined)).toBe('default');
  });

  it('returns default for null', () => {
    expect(resolveAdapterColor(null)).toBe('default');
  });

  it('returns default for empty string', () => {
    expect(resolveAdapterColor('')).toBe('default');
  });

  it('returns default for unknown adapter', () => {
    expect(resolveAdapterColor('milvus')).toBe('default');
  });

  it('guards against prototype-chain keys', () => {
    expect(resolveAdapterColor('hasOwnProperty')).toBe('default');
    expect(resolveAdapterColor('toString')).toBe('default');
    expect(resolveAdapterColor('__proto__')).toBe('default');
    expect(resolveAdapterColor('constructor')).toBe('default');
  });
});

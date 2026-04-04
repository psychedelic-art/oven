import { describe, it, expect, vi } from 'vitest';
import type { VectorStoreConfig } from '../types';

// Mock the dynamic imports used by the factory
vi.mock('../vector-store/pgvector', () => ({
  PgVectorAdapter: vi.fn().mockImplementation((config: unknown) => ({
    type: 'pgvector',
    config,
  })),
}));

vi.mock('../vector-store/pinecone', () => ({
  PineconeAdapter: vi.fn().mockImplementation((config: unknown) => ({
    type: 'pinecone',
    config,
  })),
}));

import { createVectorStoreAdapter } from '../vector-store/adapter';

describe('vector-store adapter factory', () => {
  const baseConfig: Omit<VectorStoreConfig, 'adapter'> = {
    name: 'test-store',
    slug: 'test-store',
    tenantId: 1,
    connectionConfig: { host: 'localhost' },
    dimensions: 1536,
    distanceMetric: 'cosine',
  };

  it('creates PgVectorAdapter for adapter="pgvector"', async () => {
    const config: VectorStoreConfig = { ...baseConfig, adapter: 'pgvector' };
    const adapter = await createVectorStoreAdapter(config);
    expect(adapter).toBeDefined();
    expect((adapter as { type: string }).type).toBe('pgvector');
  });

  it('creates PineconeAdapter for adapter="pinecone"', async () => {
    const config: VectorStoreConfig = { ...baseConfig, adapter: 'pinecone' };
    const adapter = await createVectorStoreAdapter(config);
    expect(adapter).toBeDefined();
    expect((adapter as { type: string }).type).toBe('pinecone');
  });

  it('throws for unknown adapter type', async () => {
    const config = { ...baseConfig, adapter: 'unknown' as VectorStoreConfig['adapter'] };
    await expect(createVectorStoreAdapter(config))
      .rejects.toThrow('Unknown vector store adapter: "unknown"');
  });

  it('passes config to the adapter constructor', async () => {
    const config: VectorStoreConfig = { ...baseConfig, adapter: 'pgvector' };
    const adapter = await createVectorStoreAdapter(config);
    expect((adapter as { config: VectorStoreConfig }).config).toEqual(config);
  });
});

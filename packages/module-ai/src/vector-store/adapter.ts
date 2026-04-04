import type { VectorDocument, VectorQueryResult, VectorStoreConfig } from '../types';

// ─── Interface ───────────────────────────────────────────────

export interface VectorStoreAdapterInterface {
  upsert(documents: VectorDocument[]): Promise<{ count: number }>;
  query(vector: number[], topK: number, filter?: Record<string, unknown>): Promise<VectorQueryResult[]>;
  delete(ids: string[]): Promise<{ count: number }>;
  count(): Promise<number>;
}

// ─── Factory ─────────────────────────────────────────────────

/**
 * Create a vector store adapter based on the config's adapter type.
 */
export async function createVectorStoreAdapter(
  config: VectorStoreConfig
): Promise<VectorStoreAdapterInterface> {
  switch (config.adapter) {
    case 'pgvector': {
      const { PgVectorAdapter } = await import('./pgvector');
      return new PgVectorAdapter(config);
    }
    case 'pinecone': {
      const { PineconeAdapter } = await import('./pinecone');
      return new PineconeAdapter(config);
    }
    default:
      throw new Error(
        `Unknown vector store adapter: "${config.adapter}". ` +
        `Supported adapters: pgvector, pinecone`
      );
  }
}

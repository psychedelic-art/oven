import { Pinecone } from '@pinecone-database/pinecone';
import type { VectorStoreAdapterInterface } from './adapter';
import type { VectorDocument, VectorQueryResult, VectorStoreConfig } from '../types';

// ─── Pinecone Adapter ────────────────────────────────────────

/**
 * Vector store implementation using Pinecone managed vector database.
 *
 * Requires:
 * - `@pinecone-database/pinecone` package
 * - `PINECONE_API_KEY` env var or apiKey in connectionConfig
 * - connectionConfig.indexName to specify the Pinecone index
 */
export class PineconeAdapter implements VectorStoreAdapterInterface {
  private client: Pinecone;
  private indexName: string;
  private namespace: string;

  constructor(config: VectorStoreConfig) {
    const connectionConfig = config.connectionConfig ?? {};
    const apiKey = (connectionConfig.apiKey as string) ?? process.env.PINECONE_API_KEY;

    if (!apiKey) {
      throw new Error(
        'Pinecone API key is required. Set PINECONE_API_KEY env var or provide ' +
        'apiKey in vector store connectionConfig.'
      );
    }

    this.indexName = (connectionConfig.indexName as string) ?? config.slug;
    this.namespace = (connectionConfig.namespace as string) ?? `tenant-${config.tenantId}`;

    this.client = new Pinecone({ apiKey });
  }

  async upsert(documents: VectorDocument[]): Promise<{ count: number }> {
    if (documents.length === 0) return { count: 0 };

    const index = this.client.index(this.indexName);

    const vectors = documents.map((doc) => {
      if (!doc.embedding) {
        throw new Error(`Document "${doc.id}" is missing an embedding vector`);
      }
      return {
        id: doc.id,
        values: doc.embedding,
        metadata: {
          content: doc.content,
          ...(doc.metadata ?? {}),
        },
      };
    });

    // Pinecone recommends batches of 100
    const batchSize = 100;
    let upserted = 0;

    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.namespace(this.namespace).upsert(batch);
      upserted += batch.length;
    }

    return { count: upserted };
  }

  async query(
    vector: number[],
    topK: number,
    filter?: Record<string, unknown>
  ): Promise<VectorQueryResult[]> {
    const index = this.client.index(this.indexName);

    const queryResult = await index.namespace(this.namespace).query({
      vector,
      topK,
      includeMetadata: true,
      filter: filter as Record<string, unknown> | undefined,
    });

    return (queryResult.matches ?? []).map((match) => ({
      id: match.id,
      content: (match.metadata?.content as string) ?? '',
      score: match.score ?? 0,
      metadata: match.metadata as Record<string, unknown> | undefined,
    }));
  }

  async delete(ids: string[]): Promise<{ count: number }> {
    if (ids.length === 0) return { count: 0 };

    const index = this.client.index(this.indexName);
    await index.namespace(this.namespace).deleteMany(ids);

    return { count: ids.length };
  }

  async count(): Promise<number> {
    const index = this.client.index(this.indexName);
    const stats = await index.describeIndexStats();

    const nsStats = stats.namespaces?.[this.namespace];
    return nsStats?.recordCount ?? 0;
  }
}

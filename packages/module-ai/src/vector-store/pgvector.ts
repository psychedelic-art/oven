import { sql } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import type { VectorStoreAdapterInterface } from './adapter';
import type { VectorDocument, VectorQueryResult, VectorStoreConfig } from '../types';

// ─── PgVector Adapter ────────────────────────────────────────

/**
 * Vector store implementation using pgvector extension with raw SQL via Drizzle.
 *
 * Requires:
 * - pgvector extension installed: `CREATE EXTENSION IF NOT EXISTS vector;`
 * - Table: `ai_embeddings` with columns: id, store_id, content, metadata, embedding
 */
export class PgVectorAdapter implements VectorStoreAdapterInterface {
  private storeSlug: string;
  private tenantId: number;
  private dimensions: number;

  constructor(config: VectorStoreConfig) {
    this.storeSlug = config.slug;
    this.tenantId = config.tenantId;
    this.dimensions = config.dimensions ?? 1536;
  }

  async upsert(documents: VectorDocument[]): Promise<{ count: number }> {
    if (documents.length === 0) return { count: 0 };

    const db = getDb();
    let upserted = 0;

    for (const doc of documents) {
      if (!doc.embedding) {
        throw new Error(`Document "${doc.id}" is missing an embedding vector`);
      }

      const embeddingStr = `[${doc.embedding.join(',')}]`;

      await db.execute(sql`
        INSERT INTO ai_embeddings (id, store_slug, tenant_id, content, metadata, embedding)
        VALUES (
          ${doc.id},
          ${this.storeSlug},
          ${this.tenantId},
          ${doc.content},
          ${JSON.stringify(doc.metadata ?? {})}::jsonb,
          ${embeddingStr}::vector
        )
        ON CONFLICT (id, store_slug)
        DO UPDATE SET
          content = EXCLUDED.content,
          metadata = EXCLUDED.metadata,
          embedding = EXCLUDED.embedding,
          updated_at = NOW()
      `);
      upserted++;
    }

    return { count: upserted };
  }

  async query(
    vector: number[],
    topK: number,
    filter?: Record<string, unknown>
  ): Promise<VectorQueryResult[]> {
    const db = getDb();
    const embeddingStr = `[${vector.join(',')}]`;

    // Build filter clause for metadata JSONB
    let filterClause = sql``;
    if (filter && Object.keys(filter).length > 0) {
      const conditions = Object.entries(filter).map(
        ([key, value]) => sql`metadata->>>${key} = ${String(value)}`
      );
      filterClause = sql`AND ${sql.join(conditions, sql` AND `)}`;
    }

    const results = await db.execute(sql`
      SELECT
        id,
        content,
        metadata,
        1 - (embedding <=> ${embeddingStr}::vector) AS score
      FROM ai_embeddings
      WHERE store_slug = ${this.storeSlug}
        AND tenant_id = ${this.tenantId}
        ${filterClause}
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT ${topK}
    `);

    const rows = results.rows ?? results;
    return (rows as Array<Record<string, unknown>>).map((row) => ({
      id: row.id as string,
      content: row.content as string,
      score: Number(row.score),
      metadata: (row.metadata as Record<string, unknown>) ?? undefined,
    }));
  }

  async delete(ids: string[]): Promise<{ count: number }> {
    if (ids.length === 0) return { count: 0 };

    const db = getDb();

    const result = await db.execute(sql`
      DELETE FROM ai_embeddings
      WHERE store_slug = ${this.storeSlug}
        AND tenant_id = ${this.tenantId}
        AND id = ANY(${ids}::text[])
    `);

    return { count: Number((result as Record<string, unknown>).rowCount ?? ids.length) };
  }

  async count(): Promise<number> {
    const db = getDb();

    const result = await db.execute(sql`
      SELECT COUNT(*) AS cnt
      FROM ai_embeddings
      WHERE store_slug = ${this.storeSlug}
        AND tenant_id = ${this.tenantId}
    `);

    const rows = result.rows ?? result;
    return Number((rows as Array<Record<string, unknown>>)[0]?.cnt ?? 0);
  }
}

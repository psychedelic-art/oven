/**
 * End-to-end: pgvector bootstrap + semantic search.
 *
 * This test is the Part A (cycle-39) smoke — it exercises the full real
 * path from a bare pglite instance through `seedKnowledgeBase()` (which
 * must issue `CREATE EXTENSION`, add the `embedding vector(1536)` column,
 * build the HNSW index) into `semanticSearch()` which runs an actual
 * pgvector cosine-distance query.
 *
 * `@oven/module-ai` is aliased to a deterministic fake in
 * `vitest.config.ts` (see `src/__fixtures__/fake-module-ai.ts`) so we can
 * steer `aiEmbed()` responses without loading the real handler graph.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { bootstrapHarness, oneHotEmbedding, type HarnessHandle } from '../src';
import { queueEmbedding, resetEmbedQueue } from '../src/__fixtures__/fake-module-ai';
import { seedKnowledgeBase } from '@oven/module-knowledge-base/seed';
import { semanticSearch } from '@oven/module-knowledge-base/engine/search-engine.ts';

describe('e2e: pgvector bootstrap + semantic search', () => {
  let harness: HarnessHandle;

  beforeEach(async () => {
    harness = await bootstrapHarness({ schemas: ['knowledge-base'] });
    resetEmbedQueue();
  });

  afterEach(async () => {
    await harness.cleanup();
  });

  it('seedKnowledgeBase creates vector extension + embedding column + HNSW index', async () => {
    // Drop the harness's pre-installed extension so we can observe the
    // seed creating it from scratch. We DROP the column (if any) too so
    // seed has a clean slate to ALTER.
    await harness.db.execute(sql`DROP EXTENSION IF EXISTS vector CASCADE`);

    const before = await harness.db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'kb_entries' AND column_name = 'embedding'
    `);
    expect(before.rows).toHaveLength(0);

    // Seed needs a tenant row to progress past step 4; insert one.
    await harness.db.execute(
      sql`INSERT INTO tenants (name, slug) VALUES ('Test Clinic', 'test-clinic')`,
    );

    // Run the real production seed. This is the Part A fix under test.
    await seedKnowledgeBase(harness.db);

    // Assert the vector extension is enabled.
    const ext = await harness.db.execute(
      sql`SELECT extname FROM pg_extension WHERE extname = 'vector'`,
    );
    expect(ext.rows).toHaveLength(1);

    // Assert the embedding column exists (ALTER TABLE fired after CREATE EXTENSION).
    const col = await harness.db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'kb_entries' AND column_name = 'embedding'
    `);
    expect(col.rows).toHaveLength(1);

    // Assert the HNSW index exists.
    const idx = await harness.db.execute(sql`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'kb_entries' AND indexname = 'kbe_embedding_hnsw_idx'
    `);
    expect(idx.rows).toHaveLength(1);
  });

  it('semanticSearch returns entries ordered by cosine similarity', async () => {
    await harness.db.execute(
      sql`INSERT INTO tenants (name, slug) VALUES ('Test Clinic', 'test-clinic')`,
    );
    await seedKnowledgeBase(harness.db);

    // Attach deterministic embeddings to three seeded entries so cosine
    // similarity is predictable.
    const rowsResult = await harness.db.execute(sql`
      SELECT id FROM kb_entries
      WHERE enabled = true
      ORDER BY id ASC
      LIMIT 3
    `);
    const ids = (rowsResult.rows as Array<{ id: number }>).map((r) => r.id);
    expect(ids.length).toBeGreaterThanOrEqual(3);

    const targetDim = 100;
    const nearVec = oneHotEmbedding(targetDim, 1);
    const orthoVec = oneHotEmbedding(500, 1);
    const oppositeVec = oneHotEmbedding(targetDim, 1).map((x) => -x);

    const attach = async (id: number, v: number[]) => {
      const literal = `[${v.join(',')}]`;
      await harness.db.execute(
        sql`UPDATE kb_entries SET embedding = ${literal}::vector WHERE id = ${id}`,
      );
    };
    await attach(ids[0], nearVec);
    await attach(ids[1], orthoVec);
    await attach(ids[2], oppositeVec);

    // Queue the query embedding. It points at the same dim as ids[0].
    queueEmbedding(nearVec);

    const tenantId = 1;
    const response = await semanticSearch(
      { query: 'whatever', tenantId, maxResults: 3 },
      0.5,
    );

    expect(response.results).toHaveLength(3);
    expect(response.results[0].id).toBe(ids[0]);
    expect(response.results[0].score).toBeCloseTo(1, 3);
    expect(response.results[1].id).toBe(ids[1]);
    expect(response.results[1].score).toBeCloseTo(0, 3);
    expect(response.results[2].id).toBe(ids[2]);
    expect(response.results[2].score).toBeLessThan(0);
    expect(response.topResultConfident).toBe(true);
  });
});

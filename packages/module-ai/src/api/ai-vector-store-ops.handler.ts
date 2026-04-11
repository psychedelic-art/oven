import { NextRequest, NextResponse } from 'next/server';
import { badRequest, notFound } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { aiVectorStores } from '../schema';
import { createVectorStoreAdapter } from '../vector-store/adapter';
import { aiEmbed } from '../tools/embed';
import { eq } from 'drizzle-orm';
import type { VectorDocument, VectorStoreConfig } from '../types';

// ─── Helpers ─────────────────────────────────────────────────

async function getStoreConfig(id: number): Promise<VectorStoreConfig | null> {
  const db = getDb();
  const rows = await db.select().from(aiVectorStores).where(eq(aiVectorStores.id, id));
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    name: row.name,
    slug: row.slug,
    tenantId: row.tenantId,
    adapter: row.adapter as VectorStoreConfig['adapter'],
    connectionConfig: (row.connectionConfig ?? {}) as Record<string, unknown>,
    embeddingModel: row.embeddingModel ?? undefined,
    dimensions: row.dimensions ?? undefined,
    distanceMetric: (row.distanceMetric ?? 'cosine') as VectorStoreConfig['distanceMetric'],
  };
}

// ─── POST /api/ai/vector-stores/[id]/query ───────────────────

export async function queryPOST(
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) {
  const { id } = await context!.params;
  const storeId = Number(id);
  if (isNaN(storeId)) return badRequest('Invalid store ID');

  const body = await request.json();
  const { query, topK = 5, filter, model } = body;

  if (!query || typeof query !== 'string') {
    return badRequest('Missing or invalid "query" field (string required)');
  }

  const config = await getStoreConfig(storeId);
  if (!config) return notFound();

  // Embed the query text
  const embResult = await aiEmbed(query, model ?? config.embeddingModel);

  // Query the vector store
  const adapter = await createVectorStoreAdapter(config);
  const results = await adapter.query(embResult.embedding, topK, filter);

  return NextResponse.json({
    results,
    totalResults: results.length,
    embeddingTokens: embResult.tokens,
  });
}

// ─── POST /api/ai/vector-stores/[id]/upsert ─────────────────

export async function upsertPOST(
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) {
  const { id } = await context!.params;
  const storeId = Number(id);
  if (isNaN(storeId)) return badRequest('Invalid store ID');

  const body = await request.json();
  const { documents } = body;

  if (!Array.isArray(documents) || documents.length === 0) {
    return badRequest('Missing or empty "documents" array');
  }

  const config = await getStoreConfig(storeId);
  if (!config) return notFound();

  // Embed documents that don't already have embeddings
  const docsToEmbed: VectorDocument[] = [];
  for (const doc of documents) {
    if (!doc.id || !doc.content) {
      return badRequest('Each document must have "id" and "content" fields');
    }
    if (!doc.embedding) {
      docsToEmbed.push(doc);
    }
  }

  if (docsToEmbed.length > 0) {
    const { aiEmbedMany } = await import('../tools/embed');
    const embedResult = await aiEmbedMany(
      docsToEmbed.map(d => d.content),
      config.embeddingModel
    );
    for (let i = 0; i < docsToEmbed.length; i++) {
      docsToEmbed[i].embedding = embedResult.embeddings[i];
    }
  }

  // Upsert all documents
  const adapter = await createVectorStoreAdapter(config);
  const result = await adapter.upsert(documents);

  return NextResponse.json(result, { status: 201 });
}

// ─── DELETE /api/ai/vector-stores/[id]/documents ─────────────

export async function documentsDELETE(
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) {
  const { id } = await context!.params;
  const storeId = Number(id);
  if (isNaN(storeId)) return badRequest('Invalid store ID');

  const body = await request.json();
  const { ids } = body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return badRequest('Missing or empty "ids" array');
  }

  const config = await getStoreConfig(storeId);
  if (!config) return notFound();

  const adapter = await createVectorStoreAdapter(config);
  const result = await adapter.delete(ids);

  return NextResponse.json(result);
}

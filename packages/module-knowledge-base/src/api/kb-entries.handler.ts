import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseListParams, listResponse, badRequest } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { kbEntries } from '../schema';
import { embedEntry } from '../engine/embedding-pipeline';
import { eq, and, desc, sql, ilike } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const db = getDb();

  const conditions = [];
  if (params.filter?.tenantId) conditions.push(eq(kbEntries.tenantId, Number(params.filter.tenantId)));
  if (params.filter?.knowledgeBaseId) conditions.push(eq(kbEntries.knowledgeBaseId, Number(params.filter.knowledgeBaseId)));
  if (params.filter?.categoryId) conditions.push(eq(kbEntries.categoryId, Number(params.filter.categoryId)));
  if (params.filter?.enabled !== undefined) conditions.push(eq(kbEntries.enabled, Boolean(params.filter.enabled)));
  if (params.filter?.language) conditions.push(eq(kbEntries.language, String(params.filter.language)));
  if (params.filter?.q) conditions.push(ilike(kbEntries.question, `%${params.filter.q}%`));

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ count }]] = await Promise.all([
    db.select().from(kbEntries).where(where)
      .orderBy(desc(kbEntries.priority), desc(kbEntries.updatedAt))
      .offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(kbEntries).where(where),
  ]);

  // Note: embedding vector column is excluded from Drizzle schema
  // so it's never included in list responses (too large)

  return listResponse(rows, 'kb-entries', params, Number(count));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = getDb();

  const { tenantId, knowledgeBaseId, categoryId, question, answer, keywords, tags, priority, language, enabled } = body;

  if (!tenantId) return badRequest('Missing required field: tenantId');
  if (!knowledgeBaseId) return badRequest('Missing required field: knowledgeBaseId');
  if (!categoryId) return badRequest('Missing required field: categoryId');
  if (!question) return badRequest('Missing required field: question');
  if (!answer) return badRequest('Missing required field: answer');

  const [created] = await db.insert(kbEntries).values({
    tenantId: Number(tenantId),
    knowledgeBaseId: Number(knowledgeBaseId),
    categoryId: Number(categoryId),
    question,
    answer,
    keywords: keywords ?? null,
    tags: tags ?? null,
    priority: priority ?? 0,
    language: language ?? 'es',
    enabled: enabled ?? true,
    version: 1,
    metadata: { embeddingStatus: 'pending' },
  }).returning();

  // Emit creation event
  await eventBus.emit('kb.entry.created', {
    id: created.id,
    tenantId: created.tenantId,
    categoryId: created.categoryId,
    question: created.question,
    language: created.language,
  });

  // Auto-embed (non-blocking — don't await to avoid blocking response)
  embedEntry(created.id).catch((err) => {
    console.error(`[KB] Failed to embed entry ${created.id}:`, err);
  });

  return NextResponse.json(created, { status: 201 });
}

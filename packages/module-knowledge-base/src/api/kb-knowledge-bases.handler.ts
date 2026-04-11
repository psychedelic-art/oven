import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseListParams, listResponse, badRequest } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { kbKnowledgeBases, kbEntries } from '../schema';
import { eq, and, sql, ilike } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const db = getDb();

  const conditions = [];
  if (params.filter?.tenantId) conditions.push(eq(kbKnowledgeBases.tenantId, Number(params.filter.tenantId)));
  if (params.filter?.enabled !== undefined) conditions.push(eq(kbKnowledgeBases.enabled, Boolean(params.filter.enabled)));
  if (params.filter?.q) conditions.push(ilike(kbKnowledgeBases.name, `%${params.filter.q}%`));

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ count }]] = await Promise.all([
    db.select().from(kbKnowledgeBases).where(where)
      .orderBy(kbKnowledgeBases.name)
      .offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(kbKnowledgeBases).where(where),
  ]);

  // Attach entry counts
  const kbsWithCounts = await Promise.all(
    rows.map(async (kb) => {
      const [{ count: entryCount }] = await db
        .select({ count: sql`count(*)` })
        .from(kbEntries)
        .where(eq(kbEntries.knowledgeBaseId, kb.id));
      return { ...kb, entryCount: Number(entryCount) };
    })
  );

  return listResponse(kbsWithCounts, 'kb-knowledge-bases', params, Number(count));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = getDb();

  const { name, slug, description, enabled, tenantId, metadata } = body;

  if (!name) return badRequest('Missing required field: name');
  if (!tenantId) return badRequest('Missing required field: tenantId');

  const kbSlug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const [created] = await db.insert(kbKnowledgeBases).values({
    tenantId: Number(tenantId),
    name,
    slug: kbSlug,
    description: description ?? null,
    enabled: enabled ?? true,
    metadata: metadata ?? null,
  }).returning();

  await eventBus.emit('kb.knowledgeBase.created', {
    id: created.id,
    tenantId: created.tenantId,
    name: created.name,
    slug: created.slug,
  });

  return NextResponse.json(created, { status: 201 });
}

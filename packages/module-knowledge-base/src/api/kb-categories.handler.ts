import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseListParams, listResponse, badRequest } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { kbCategories, kbEntries } from '../schema';
import { eq, and, desc, sql, ilike } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const db = getDb();

  const conditions = [];
  if (params.filter?.tenantId) conditions.push(eq(kbCategories.tenantId, Number(params.filter.tenantId)));
  if (params.filter?.knowledgeBaseId) conditions.push(eq(kbCategories.knowledgeBaseId, Number(params.filter.knowledgeBaseId)));
  if (params.filter?.enabled !== undefined) conditions.push(eq(kbCategories.enabled, Boolean(params.filter.enabled)));
  if (params.filter?.q) conditions.push(ilike(kbCategories.name, `%${params.filter.q}%`));

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ count }]] = await Promise.all([
    db.select().from(kbCategories).where(where)
      .orderBy(kbCategories.order)
      .offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(kbCategories).where(where),
  ]);

  // Attach entry counts
  const categoriesWithCounts = await Promise.all(
    rows.map(async (cat) => {
      const [{ count: entryCount }] = await db
        .select({ count: sql`count(*)` })
        .from(kbEntries)
        .where(eq(kbEntries.categoryId, cat.id));
      return { ...cat, entryCount: Number(entryCount) };
    })
  );

  return listResponse(categoriesWithCounts, 'kb-categories', params, Number(count));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = getDb();

  const { name, slug, description, icon, order, enabled, tenantId, knowledgeBaseId } = body;

  if (!name) return badRequest('Missing required field: name');
  if (!tenantId) return badRequest('Missing required field: tenantId');
  if (!knowledgeBaseId) return badRequest('Missing required field: knowledgeBaseId');

  const categorySlug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const [created] = await db.insert(kbCategories).values({
    tenantId: Number(tenantId),
    knowledgeBaseId: Number(knowledgeBaseId),
    name,
    slug: categorySlug,
    description: description ?? null,
    icon: icon ?? null,
    order: order ?? 0,
    enabled: enabled ?? true,
  }).returning();

  await eventBus.emit('kb.category.created', {
    id: created.id,
    tenantId: created.tenantId,
    name: created.name,
    slug: created.slug,
  });

  return NextResponse.json(created, { status: 201 });
}

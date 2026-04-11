import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and, ilike } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { aiVectorStores } from '../schema';

// GET /api/ai-vector-stores — List vector stores
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (aiVectorStores as any)[params.sort] ?? aiVectorStores.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  const conditions: any[] = [];
  if (params.filter.q) {
    conditions.push(ilike(aiVectorStores.name, `%${params.filter.q}%`));
  }
  if (params.filter.tenantId) {
    conditions.push(eq(aiVectorStores.tenantId, parseInt(params.filter.tenantId as string, 10)));
  }
  if (params.filter.adapter) {
    conditions.push(eq(aiVectorStores.adapter, params.filter.adapter as string));
  }
  if (params.filter.enabled !== undefined) {
    conditions.push(eq(aiVectorStores.enabled, params.filter.enabled === 'true' || params.filter.enabled === true));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.select().from(aiVectorStores).where(where).orderBy(orderFn).limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(aiVectorStores).where(where),
  ]);

  return listResponse(data, 'ai-vector-stores', params, countResult[0].count);
}

// POST /api/ai-vector-stores — Create vector store
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const [result] = await db.insert(aiVectorStores).values(body).returning();

  eventBus.emit('ai.vectorStore.created', {
    id: result.id,
    name: result.name,
    slug: result.slug,
    tenantId: result.tenantId,
    adapter: result.adapter,
  });

  return NextResponse.json(result, { status: 201 });
}

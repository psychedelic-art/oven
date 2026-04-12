import { type NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and, ilike } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse, badRequest } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { aiVectorStores } from '../schema';
import { getOrderColumn } from './_utils/sort';

// Whitelisted sort columns for GET /api/ai-vector-stores (F-05-02).
// Keep this array explicit — do NOT reach for Object.keys(aiVectorStores).
const ALLOWED_SORTS = [
  'id',
  'tenantId',
  'name',
  'slug',
  'adapter',
  'embeddingProviderId',
  'embeddingModel',
  'dimensions',
  'distanceMetric',
  'documentCount',
  'enabled',
  'createdAt',
  'updatedAt',
] as const;

// GET /api/ai-vector-stores — List vector stores
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const resolved = getOrderColumn(aiVectorStores, params.sort, ALLOWED_SORTS);
  if (!resolved.ok) {
    return badRequest(
      `Invalid sort field "${resolved.received}". Allowed: ${resolved.allowed.join(', ')}`,
    );
  }
  const orderFn = params.order === 'desc' ? desc(resolved.column) : asc(resolved.column);

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

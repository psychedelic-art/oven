import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and, ilike } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { services } from '../schema';

// GET /api/services — List services
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (services as any)[params.sort] ?? services.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  const conditions: any[] = [];
  if (params.filter.q) {
    conditions.push(ilike(services.name, `%${params.filter.q}%`));
  }
  if (params.filter.categoryId) {
    conditions.push(eq(services.categoryId, parseInt(params.filter.categoryId as string, 10)));
  }
  if (params.filter.enabled !== undefined) {
    conditions.push(eq(services.enabled, params.filter.enabled === 'true' || params.filter.enabled === true));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.select().from(services).where(where).orderBy(orderFn).limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(services).where(where),
  ]);

  return listResponse(data, 'services', params, countResult[0].count);
}

// POST /api/services — Create service
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const [result] = await db.insert(services).values(body).returning();

  eventBus.emit('subscriptions.service.created', {
    id: result.id,
    name: result.name,
    slug: result.slug,
    categoryId: result.categoryId,
    unit: result.unit,
  });

  return NextResponse.json(result, { status: 201 });
}

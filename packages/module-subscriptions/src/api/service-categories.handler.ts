import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and, ilike } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { serviceCategories } from '../schema';

// GET /api/service-categories — List service categories
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (serviceCategories as any)[params.sort] ?? serviceCategories.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  const conditions: any[] = [];
  if (params.filter.q) {
    conditions.push(ilike(serviceCategories.name, `%${params.filter.q}%`));
  }
  if (params.filter.enabled !== undefined) {
    conditions.push(eq(serviceCategories.enabled, params.filter.enabled === 'true' || params.filter.enabled === true));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.select().from(serviceCategories).where(where).orderBy(orderFn).limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(serviceCategories).where(where),
  ]);

  return listResponse(data, 'service-categories', params, countResult[0].count);
}

// POST /api/service-categories — Create service category
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const [result] = await db.insert(serviceCategories).values(body).returning();

  eventBus.emit('subscriptions.category.created', {
    id: result.id,
    name: result.name,
    slug: result.slug,
  });

  return NextResponse.json(result, { status: 201 });
}

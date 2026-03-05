import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and, ilike } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { tenants } from '../schema';

// GET /api/tenants — List tenants with filtering
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (tenants as any)[params.sort] ?? tenants.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  const conditions = [];
  if (params.filter.enabled !== undefined) {
    conditions.push(eq(tenants.enabled, params.filter.enabled === 'true' || params.filter.enabled === true));
  }
  if (params.filter.q) {
    conditions.push(ilike(tenants.name, `%${params.filter.q}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.select().from(tenants).where(where).orderBy(orderFn).limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(tenants).where(where),
  ]);

  return listResponse(data, 'tenants', params, countResult[0].count);
}

// POST /api/tenants — Create a new tenant
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const [result] = await db.insert(tenants).values(body).returning();

  eventBus.emit('tenants.tenant.created', {
    id: result.id,
    name: result.name,
    slug: result.slug,
  });

  return NextResponse.json(result, { status: 201 });
}

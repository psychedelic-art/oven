import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { tenantSubscriptions } from '../schema';

// GET /api/tenant-subscriptions — List subscriptions
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (tenantSubscriptions as any)[params.sort] ?? tenantSubscriptions.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  const conditions: any[] = [];
  if (params.filter.tenantId) {
    conditions.push(eq(tenantSubscriptions.tenantId, parseInt(params.filter.tenantId as string, 10)));
  }
  if (params.filter.planId) {
    conditions.push(eq(tenantSubscriptions.planId, parseInt(params.filter.planId as string, 10)));
  }
  if (params.filter.status) {
    conditions.push(eq(tenantSubscriptions.status, params.filter.status as string));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.select().from(tenantSubscriptions).where(where).orderBy(orderFn).limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(tenantSubscriptions).where(where),
  ]);

  return listResponse(data, 'tenant-subscriptions', params, countResult[0].count);
}

// POST /api/tenant-subscriptions — Create subscription
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const [result] = await db.insert(tenantSubscriptions).values(body).returning();

  eventBus.emit('subscriptions.subscription.created', {
    id: result.id,
    tenantId: result.tenantId,
    planId: result.planId,
    status: result.status,
  });

  return NextResponse.json(result, { status: 201 });
}

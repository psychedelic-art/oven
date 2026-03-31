import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and, ilike } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { billingPlans } from '../schema';

// GET /api/billing-plans — List billing plans
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (billingPlans as any)[params.sort] ?? billingPlans.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  const conditions: any[] = [];
  if (params.filter.q) {
    conditions.push(ilike(billingPlans.name, `%${params.filter.q}%`));
  }
  if (params.filter.isPublic !== undefined) {
    conditions.push(eq(billingPlans.isPublic, params.filter.isPublic === 'true' || params.filter.isPublic === true));
  }
  if (params.filter.enabled !== undefined) {
    conditions.push(eq(billingPlans.enabled, params.filter.enabled === 'true' || params.filter.enabled === true));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.select().from(billingPlans).where(where).orderBy(orderFn).limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(billingPlans).where(where),
  ]);

  return listResponse(data, 'billing-plans', params, countResult[0].count);
}

// POST /api/billing-plans — Create billing plan
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const [result] = await db.insert(billingPlans).values(body).returning();

  eventBus.emit('subscriptions.plan.created', {
    id: result.id,
    name: result.name,
    slug: result.slug,
    price: result.price,
  });

  return NextResponse.json(result, { status: 201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { planQuotas } from '../schema';

// GET /api/billing-plans/[id]/quotas — List quotas for a plan
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const planId = parseInt(id, 10);
  const listParams = parseListParams(request);

  const orderCol = (planQuotas as any)[listParams.sort] ?? planQuotas.id;
  const orderFn = listParams.order === 'desc' ? desc(orderCol) : asc(orderCol);

  const where = eq(planQuotas.planId, planId);

  const [data, countResult] = await Promise.all([
    db.select().from(planQuotas).where(where).orderBy(orderFn).limit(listParams.limit).offset(listParams.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(planQuotas).where(where),
  ]);

  return listResponse(data, 'plan-quotas', listParams, countResult[0].count);
}

// POST /api/billing-plans/[id]/quotas — Add quota to plan
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();

  const [result] = await db
    .insert(planQuotas)
    .values({ ...body, planId: parseInt(id, 10) })
    .returning();

  return NextResponse.json(result, { status: 201 });
}

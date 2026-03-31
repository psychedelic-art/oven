import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { subscriptionQuotaOverrides } from '../schema';

// GET /api/tenant-subscriptions/[id]/overrides — List overrides for a subscription
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const subscriptionId = parseInt(id, 10);
  const listParams = parseListParams(request);

  const orderCol = (subscriptionQuotaOverrides as any)[listParams.sort] ?? subscriptionQuotaOverrides.id;
  const orderFn = listParams.order === 'desc' ? desc(orderCol) : asc(orderCol);

  const where = eq(subscriptionQuotaOverrides.subscriptionId, subscriptionId);

  const [data, countResult] = await Promise.all([
    db.select().from(subscriptionQuotaOverrides).where(where).orderBy(orderFn).limit(listParams.limit).offset(listParams.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(subscriptionQuotaOverrides).where(where),
  ]);

  return listResponse(data, 'quota-overrides', listParams, countResult[0].count);
}

// POST /api/tenant-subscriptions/[id]/overrides — Add quota override
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();

  const [result] = await db
    .insert(subscriptionQuotaOverrides)
    .values({ ...body, subscriptionId: parseInt(id, 10) })
    .returning();

  return NextResponse.json(result, { status: 201 });
}

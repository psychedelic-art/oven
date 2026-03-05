import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { tenantMembers } from '../schema';

// GET /api/tenant-members — List tenant members with filtering
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (tenantMembers as any)[params.sort] ?? tenantMembers.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  let query = db.select().from(tenantMembers).orderBy(orderFn);

  if (params.filter.tenantId) {
    query = query.where(eq(tenantMembers.tenantId, parseInt(params.filter.tenantId as string, 10))) as any;
  }

  const countCondition = params.filter.tenantId
    ? eq(tenantMembers.tenantId, parseInt(params.filter.tenantId as string, 10))
    : undefined;

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(tenantMembers).where(countCondition),
  ]);

  return listResponse(data, 'tenant-members', params, countResult[0].count);
}

// POST /api/tenant-members — Add a member to a tenant
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const [result] = await db.insert(tenantMembers).values(body).returning();

  eventBus.emit('tenants.member.added', {
    tenantId: result.tenantId,
    userId: result.userId,
    role: result.role,
  });

  return NextResponse.json(result, { status: 201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, ilike } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { roles } from '../schema';

export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (roles as any)[params.sort] ?? roles.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  let query = db.select().from(roles).orderBy(orderFn);

  if (params.filter.enabled !== undefined) {
    query = query.where(eq(roles.enabled, params.filter.enabled as boolean));
  }
  if (params.filter.hierarchyNodeId) {
    query = query.where(eq(roles.hierarchyNodeId, params.filter.hierarchyNodeId as number));
  }
  if (params.filter.q) {
    query = query.where(ilike(roles.name, `%${params.filter.q}%`));
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(roles),
  ]);

  return listResponse(data, 'roles', params, countResult[0].count);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();
  const [result] = await db.insert(roles).values(body).returning();
  return NextResponse.json(result, { status: 201 });
}

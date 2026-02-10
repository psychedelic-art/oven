import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { worldConfigs } from '../schema';

export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (worldConfigs as any)[params.sort] ?? worldConfigs.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  let query = db.select().from(worldConfigs).orderBy(orderFn);

  if (params.filter.is_active !== undefined) {
    query = query.where(eq(worldConfigs.isActive, params.filter.is_active as boolean));
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(worldConfigs),
  ]);

  return listResponse(data, 'world-configs', params, countResult[0].count);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();
  const [result] = await db.insert(worldConfigs).values(body).returning();
  return NextResponse.json(result, { status: 201 });
}

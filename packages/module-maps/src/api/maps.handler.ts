import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, ilike } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { maps } from '../schema';

export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (maps as any)[params.sort] ?? maps.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  let query = db.select().from(maps).orderBy(orderFn);

  if (params.filter.status) {
    query = query.where(eq(maps.status, params.filter.status as string));
  }
  if (params.filter.mode) {
    query = query.where(eq(maps.mode, params.filter.mode as string));
  }
  if (params.filter.q) {
    query = query.where(ilike(maps.name, `%${params.filter.q}%`));
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(maps),
  ]);

  return listResponse(data, 'maps', params, countResult[0].count);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();
  const [result] = await db.insert(maps).values(body).returning();
  return NextResponse.json(result, { status: 201 });
}

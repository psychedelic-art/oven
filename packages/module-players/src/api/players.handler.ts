import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, ilike } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { players } from '../schema';

export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (players as any)[params.sort] ?? players.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  let query = db.select().from(players).orderBy(orderFn);

  if (params.filter.status) {
    query = query.where(eq(players.status, params.filter.status as string));
  }
  if (params.filter.q) {
    query = query.where(ilike(players.username, `%${params.filter.q}%`));
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(players),
  ]);

  return listResponse(data, 'players', params, countResult[0].count);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();
  const [result] = await db.insert(players).values(body).returning();
  return NextResponse.json(result, { status: 201 });
}

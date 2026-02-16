import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, ilike } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { withHandler } from '@oven/module-registry/api-errors';
import { tilesets } from '../schema';

export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (tilesets as any)[params.sort] ?? tilesets.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  let query = db.select().from(tilesets).orderBy(orderFn);

  if (params.filter.q) {
    query = query.where(ilike(tilesets.name, `%${params.filter.q}%`));
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(tilesets),
  ]);

  return listResponse(data, 'tilesets', params, countResult[0].count);
}

export const POST = withHandler(async (request: NextRequest) => {
  const db = getDb();
  const body = await request.json();
  const [result] = await db.insert(tilesets).values(body).returning();
  return NextResponse.json(result, { status: 201 });
});

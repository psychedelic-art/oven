import { NextRequest, NextResponse } from 'next/server';
import { eq, sql, asc, desc, ilike } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { withHandler } from '@oven/module-registry/api-errors';
import { tileDefinitions } from '../schema';

export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (tileDefinitions as any)[params.sort] ?? tileDefinitions.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  let query = db.select().from(tileDefinitions).orderBy(orderFn);

  // Apply filters
  if (params.filter.category) {
    query = query.where(eq(tileDefinitions.category, params.filter.category as string));
  }
  if (params.filter.q) {
    query = query.where(ilike(tileDefinitions.name, `%${params.filter.q}%`));
  }
  if (params.filter.tilesetId) {
    query = query.where(eq(tileDefinitions.tilesetId, parseInt(params.filter.tilesetId as string, 10)));
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(tileDefinitions),
  ]);

  return listResponse(data, 'tiles', params, countResult[0].count);
}

export const POST = withHandler(async (request: NextRequest) => {
  const db = getDb();
  const body = await request.json();
  const [result] = await db.insert(tileDefinitions).values(body).returning();
  return NextResponse.json(result, { status: 201 });
});

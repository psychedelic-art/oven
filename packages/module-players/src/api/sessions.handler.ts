import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, isNull } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { playerSessions } from '../schema';

export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (playerSessions as any)[params.sort] ?? playerSessions.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  let query = db.select().from(playerSessions).orderBy(orderFn);

  if (params.filter.player_id) {
    query = query.where(eq(playerSessions.playerId, params.filter.player_id as number));
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(playerSessions),
  ]);

  return listResponse(data, 'sessions', params, countResult[0].count);
}

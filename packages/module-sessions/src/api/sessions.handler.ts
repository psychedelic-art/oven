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

  if (params.filter.player_id || params.filter.playerId) {
    const pid = (params.filter.player_id ?? params.filter.playerId) as number;
    query = query.where(eq(playerSessions.playerId, pid));
  }
  if (params.filter.map_id || params.filter.mapId) {
    const mid = (params.filter.map_id ?? params.filter.mapId) as number;
    query = query.where(eq(playerSessions.mapId, mid));
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(playerSessions),
  ]);

  return listResponse(data, 'sessions', params, countResult[0].count);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const [result] = await db
    .insert(playerSessions)
    .values({
      playerId: body.playerId,
      mapId: body.mapId,
      startTileX: body.startTileX ?? 0,
      startTileY: body.startTileY ?? 0,
    })
    .returning();

  return NextResponse.json(result, { status: 201 });
}

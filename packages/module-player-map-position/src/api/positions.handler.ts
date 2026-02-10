import { NextRequest, NextResponse } from 'next/server';
import { sql, desc, eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { playerPositions } from '../schema';

export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  let query = db
    .select()
    .from(playerPositions)
    .orderBy(desc(playerPositions.recordedAt));

  if (params.filter.playerId || params.filter.player_id) {
    const pid = (params.filter.playerId ?? params.filter.player_id) as number;
    query = query.where(eq(playerPositions.playerId, pid));
  }
  if (params.filter.sessionId || params.filter.session_id) {
    const sid = (params.filter.sessionId ?? params.filter.session_id) as number;
    query = query.where(eq(playerPositions.sessionId, sid));
  }
  if (params.filter.mapId || params.filter.map_id) {
    const mid = (params.filter.mapId ?? params.filter.map_id) as number;
    query = query.where(eq(playerPositions.mapId, mid));
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(playerPositions),
  ]);

  return listResponse(data, 'player-positions', params, countResult[0].count);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const [result] = await db
    .insert(playerPositions)
    .values({
      playerId: body.playerId,
      sessionId: body.sessionId,
      mapId: body.mapId,
      tileX: body.tileX,
      tileY: body.tileY,
      chunkX: body.chunkX,
      chunkY: body.chunkY,
      worldX: body.worldX,
      worldY: body.worldY,
    })
    .returning();

  return NextResponse.json(result, { status: 201 });
}

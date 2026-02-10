import { NextRequest, NextResponse } from 'next/server';
import { sql, eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { playerVisitedChunks } from '../schema';

export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  let query = db.select().from(playerVisitedChunks);

  if (params.filter.playerId || params.filter.player_id) {
    const pid = (params.filter.playerId ?? params.filter.player_id) as number;
    query = query.where(eq(playerVisitedChunks.playerId, pid));
  }
  if (params.filter.mapId || params.filter.map_id) {
    const mid = (params.filter.mapId ?? params.filter.map_id) as number;
    query = query.where(eq(playerVisitedChunks.mapId, mid));
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(playerVisitedChunks),
  ]);

  return listResponse(data, 'visited-chunks', params, countResult[0].count);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  // Upsert: if already visited, increment visitCount
  const [result] = await db
    .insert(playerVisitedChunks)
    .values({
      playerId: body.playerId,
      mapId: body.mapId,
      chunkX: body.chunkX,
      chunkY: body.chunkY,
    })
    .onConflictDoUpdate({
      target: [
        playerVisitedChunks.playerId,
        playerVisitedChunks.mapId,
        playerVisitedChunks.chunkX,
        playerVisitedChunks.chunkY,
      ],
      set: {
        visitCount: sql`${playerVisitedChunks.visitCount} + 1`,
      },
    })
    .returning();

  return NextResponse.json(result, { status: 201 });
}

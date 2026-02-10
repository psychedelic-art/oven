import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { playerMapAssignments } from '../schema';

export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (playerMapAssignments as any)[params.sort] ?? playerMapAssignments.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  let query = db.select().from(playerMapAssignments).orderBy(orderFn);

  if (params.filter.playerId || params.filter.player_id) {
    const pid = (params.filter.playerId ?? params.filter.player_id) as number;
    query = query.where(eq(playerMapAssignments.playerId, pid));
  }
  if (params.filter.mapId || params.filter.map_id) {
    const mid = (params.filter.mapId ?? params.filter.map_id) as number;
    query = query.where(eq(playerMapAssignments.mapId, mid));
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(playerMapAssignments),
  ]);

  return listResponse(data, 'map-assignments', params, countResult[0].count);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  // Deactivate any existing active assignment for this player
  if (body.playerId) {
    await db
      .update(playerMapAssignments)
      .set({ isActive: false, leftAt: new Date() })
      .where(
        and(
          eq(playerMapAssignments.playerId, body.playerId),
          eq(playerMapAssignments.isActive, true)
        )
      );
  }

  const [result] = await db
    .insert(playerMapAssignments)
    .values({
      playerId: body.playerId,
      mapId: body.mapId,
      spawnTileX: body.spawnTileX ?? 0,
      spawnTileY: body.spawnTileY ?? 0,
      isActive: true,
    })
    .returning();

  return NextResponse.json(result, { status: 201 });
}

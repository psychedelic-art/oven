import { NextRequest, NextResponse } from 'next/server';
import { eq, desc, sql, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound, parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { players, playerPositions } from '../schema';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const playerId = parseInt(id, 10);

  // Verify player exists
  const [player] = await db.select().from(players).where(eq(players.id, playerId));
  if (!player) return notFound('Player not found');

  const listParams = parseListParams(request);

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(playerPositions)
      .where(eq(playerPositions.playerId, playerId))
      .orderBy(desc(playerPositions.recordedAt))
      .limit(listParams.limit)
      .offset(listParams.offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(playerPositions)
      .where(eq(playerPositions.playerId, playerId)),
  ]);

  return listResponse(data, 'positions', listParams, countResult[0].count);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const playerId = parseInt(id, 10);
  const body = await request.json();

  const [result] = await db
    .insert(playerPositions)
    .values({ ...body, playerId })
    .returning();

  // Update last_seen_at on the player
  await db
    .update(players)
    .set({ lastSeenAt: new Date(), updatedAt: new Date() })
    .where(eq(players.id, playerId));

  return NextResponse.json(result, { status: 201 });
}

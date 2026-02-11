import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry/event-bus';
import { playerSessions } from '../schema';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(playerSessions)
    .where(eq(playerSessions.id, parseInt(id, 10)));

  if (!result) return notFound('Session not found');
  return NextResponse.json(result);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const sessionId = parseInt(id, 10);
  const body = await request.json();

  const [existing] = await db
    .select()
    .from(playerSessions)
    .where(eq(playerSessions.id, sessionId));

  if (!existing) return notFound('Session not found');

  const [result] = await db
    .update(playerSessions)
    .set({
      ...body,
      // If endedAt is being set, this ends the session. "now" → current time.
      ...(body.endedAt
        ? { endedAt: body.endedAt === 'now' ? new Date() : new Date(body.endedAt) }
        : {}),
    })
    .where(eq(playerSessions.id, sessionId))
    .returning();

  // Emit session.ended if endedAt was set (session is being closed)
  if (body.endedAt) {
    await eventBus.emit('sessions.session.ended', {
      id: result.id,
      playerId: result.playerId,
      mapId: result.mapId,
      endTileX: result.endTileX,
      endTileY: result.endTileY,
      tilesTraveled: result.tilesTraveled,
      chunksLoaded: result.chunksLoaded,
      endedAt: result.endedAt,
    });
  }

  return NextResponse.json(result);
}

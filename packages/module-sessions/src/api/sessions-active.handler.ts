import { NextRequest, NextResponse } from 'next/server';
import { isNull, eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { playerSessions } from '../schema';

export async function GET(request: NextRequest) {
  const db = getDb();
  const url = request.nextUrl;
  const playerId = url.searchParams.get('playerId') || url.searchParams.get('player_id');

  let conditions = isNull(playerSessions.endedAt);

  if (playerId) {
    const activeSessions = await db
      .select()
      .from(playerSessions)
      .where(and(isNull(playerSessions.endedAt), eq(playerSessions.playerId, parseInt(playerId, 10))));
    return NextResponse.json(activeSessions);
  }

  // Active sessions have no ended_at timestamp
  const activeSessions = await db
    .select()
    .from(playerSessions)
    .where(isNull(playerSessions.endedAt));

  return NextResponse.json(activeSessions);
}

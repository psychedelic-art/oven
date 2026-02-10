import { NextRequest, NextResponse } from 'next/server';
import { isNull } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { playerSessions } from '../schema';

export async function GET(_request: NextRequest) {
  const db = getDb();

  // Active sessions have no ended_at timestamp
  const activeSessions = await db
    .select()
    .from(playerSessions)
    .where(isNull(playerSessions.endedAt));

  return NextResponse.json(activeSessions);
}

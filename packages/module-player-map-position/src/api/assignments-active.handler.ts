import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { playerMapAssignments } from '../schema';

export async function GET(request: NextRequest) {
  const db = getDb();
  const url = request.nextUrl;
  const playerId = url.searchParams.get('playerId') || url.searchParams.get('player_id');

  if (playerId) {
    const [result] = await db
      .select()
      .from(playerMapAssignments)
      .where(
        and(
          eq(playerMapAssignments.playerId, parseInt(playerId, 10)),
          eq(playerMapAssignments.isActive, true)
        )
      );

    if (!result) {
      return NextResponse.json(null);
    }
    return NextResponse.json(result);
  }

  // Return all active assignments
  const results = await db
    .select()
    .from(playerMapAssignments)
    .where(eq(playerMapAssignments.isActive, true));

  return NextResponse.json(results);
}

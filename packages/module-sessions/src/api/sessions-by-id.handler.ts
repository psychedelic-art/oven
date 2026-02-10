import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
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
      // If endedAt is being set, this ends the session
      ...(body.endedAt ? { endedAt: new Date(body.endedAt) } : {}),
    })
    .where(eq(playerSessions.id, sessionId))
    .returning();

  return NextResponse.json(result);
}

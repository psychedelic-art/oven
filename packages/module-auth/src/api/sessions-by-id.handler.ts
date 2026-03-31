import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { authSessions } from '../schema';

// DELETE /api/auth-sessions/[id] — Revoke (delete) a session
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;

  const [deleted] = await db
    .delete(authSessions)
    .where(eq(authSessions.id, parseInt(id, 10)))
    .returning();

  if (!deleted) return notFound('Session not found');

  eventBus.emit('auth.session.revoked', {
    sessionId: deleted.id,
    userId: deleted.userId,
  });

  return NextResponse.json(deleted);
}

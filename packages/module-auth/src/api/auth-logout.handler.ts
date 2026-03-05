import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { authSessions } from '../schema';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// POST /api/auth/logout — Invalidate current session
export async function POST(request: NextRequest) {
  const db = getDb();

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Authorization header required' },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);
  const tokenHash = hashToken(token);

  // Find and delete the session
  const [deleted] = await db
    .delete(authSessions)
    .where(eq(authSessions.token, tokenHash))
    .returning();

  if (deleted) {
    eventBus.emit('auth.user.logout', {
      userId: deleted.userId,
      sessionId: deleted.id,
    });
  }

  return NextResponse.json({ success: true });
}

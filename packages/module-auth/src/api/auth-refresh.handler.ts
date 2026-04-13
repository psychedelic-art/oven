import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { checkRateLimit } from '@oven/module-registry/rate-limit';
import { authSessions, users } from '../schema';
import { createSession } from '../auth-utils';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// POST /api/auth/refresh — Refresh an expired access token
// Rate limit: 60 req / 60s per user_id (applied after session lookup)
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const { refreshToken } = body;
  if (!refreshToken) {
    return NextResponse.json(
      { error: 'Refresh token is required' },
      { status: 400 }
    );
  }

  const refreshHash = hashToken(refreshToken);

  // Look up session by refresh token
  const [session] = await db
    .select()
    .from(authSessions)
    .where(eq(authSessions.refreshToken, refreshHash))
    .limit(1);

  if (!session) {
    return NextResponse.json(
      { error: 'Invalid refresh token' },
      { status: 401 }
    );
  }

  // Rate limit: 60 requests per 60 seconds, keyed by user_id
  const rl = checkRateLimit(`refresh:${session.userId}`, { maxRequests: 60, windowSeconds: 60 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: { code: 'AUTH_RATE_LIMITED', message: 'Too many refresh requests. Try again later.' } },
      { status: 429 }
    );
  }

  // Check refresh token expiry
  if (session.refreshExpiresAt && session.refreshExpiresAt < new Date()) {
    // Clean up expired session
    await db.delete(authSessions).where(eq(authSessions.id, session.id));
    return NextResponse.json(
      { error: 'Refresh token expired' },
      { status: 401 }
    );
  }

  // Look up the user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  // Create new session via adapter
  const authUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar ?? undefined,
    defaultTenantId: user.defaultTenantId ?? undefined,
  };

  const newTokens = await createSession(authUser);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + newTokens.expiresIn * 1000);

  // Update session record with new tokens
  await db
    .update(authSessions)
    .set({
      token: hashToken(newTokens.accessToken),
      refreshToken: newTokens.refreshToken
        ? hashToken(newTokens.refreshToken)
        : session.refreshToken,
      expiresAt,
      refreshExpiresAt: newTokens.refreshToken
        ? new Date(now.getTime() + newTokens.expiresIn * 2 * 1000)
        : session.refreshExpiresAt,
    })
    .where(eq(authSessions.id, session.id));

  return NextResponse.json({
    accessToken: newTokens.accessToken,
    refreshToken: newTokens.refreshToken,
    expiresIn: newTokens.expiresIn,
  });
}

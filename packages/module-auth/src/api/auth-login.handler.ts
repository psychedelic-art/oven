import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { users, authSessions } from '../schema';
import { verifyPassword, createSession } from '../auth-utils';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// POST /api/auth/login — Authenticate with email + password
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    );
  }

  // Look up user by email
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    );
  }

  if (user.status !== 'active') {
    return NextResponse.json(
      { error: 'Account is not active' },
      { status: 403 }
    );
  }

  if (!user.passwordHash) {
    return NextResponse.json(
      { error: 'Password login not available for this account' },
      { status: 400 }
    );
  }

  // Verify password
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    );
  }

  // Create session via adapter
  const authUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar ?? undefined,
    defaultTenantId: user.defaultTenantId ?? undefined,
  };

  const sessionToken = await createSession(authUser);

  // Store session in DB
  const now = new Date();
  const expiresAt = new Date(now.getTime() + sessionToken.expiresIn * 1000);

  await db.insert(authSessions).values({
    userId: user.id,
    token: hashToken(sessionToken.accessToken),
    refreshToken: sessionToken.refreshToken
      ? hashToken(sessionToken.refreshToken)
      : null,
    expiresAt,
    refreshExpiresAt: sessionToken.refreshToken
      ? new Date(now.getTime() + sessionToken.expiresIn * 2 * 1000)
      : null,
    ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
    userAgent: request.headers.get('user-agent'),
  });

  // Update last login
  await db
    .update(users)
    .set({ lastLoginAt: now, updatedAt: now })
    .where(eq(users.id, user.id));

  eventBus.emit('auth.user.login', {
    userId: user.id,
    email: user.email,
    method: 'password',
  });

  return NextResponse.json({
    accessToken: sessionToken.accessToken,
    refreshToken: sessionToken.refreshToken,
    expiresIn: sessionToken.expiresIn,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      defaultTenantId: user.defaultTenantId,
    },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { users, passwordResetTokens } from '../schema';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// POST /api/auth/forgot-password — Request a password reset token
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const { email } = body;
  if (!email) {
    return NextResponse.json(
      { error: 'Email is required' },
      { status: 400 }
    );
  }

  // Look up user — always return success to prevent email enumeration
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (user) {
    // Generate a random reset token
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    // Emit event — actual email sending is handled by
    // the notifications module listening to this event
    eventBus.emit('auth.user.passwordReset', {
      userId: user.id,
      email: user.email,
      token: rawToken,
      expiresAt: expiresAt.toISOString(),
    });
  }

  // Always return success to prevent email enumeration
  return NextResponse.json({ success: true });
}

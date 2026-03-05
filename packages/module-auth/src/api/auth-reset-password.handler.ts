import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { eq, and, isNull } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { users, passwordResetTokens } from '../schema';
import { hashPassword } from '../auth-utils';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// POST /api/auth/reset-password — Reset password using a token
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const { token, newPassword } = body;
  if (!token || !newPassword) {
    return NextResponse.json(
      { error: 'Token and new password are required' },
      { status: 400 }
    );
  }

  const tokenHash = hashToken(token);

  // Look up the reset token — must not be used yet
  const [resetToken] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt)
      )
    )
    .limit(1);

  if (!resetToken) {
    return NextResponse.json(
      { error: 'Invalid or already used reset token' },
      { status: 400 }
    );
  }

  // Check expiry
  if (resetToken.expiresAt < new Date()) {
    return NextResponse.json(
      { error: 'Reset token has expired' },
      { status: 400 }
    );
  }

  // Hash the new password
  const newPasswordHash = await hashPassword(newPassword);
  const now = new Date();

  // Update the user's password
  await db
    .update(users)
    .set({ passwordHash: newPasswordHash, updatedAt: now })
    .where(eq(users.id, resetToken.userId));

  // Mark token as used
  await db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(eq(passwordResetTokens.id, resetToken.id));

  eventBus.emit('auth.user.passwordChanged', {
    userId: resetToken.userId,
    method: 'reset-token',
  });

  return NextResponse.json({ success: true });
}

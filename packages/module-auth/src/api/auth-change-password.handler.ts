import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { users } from '../schema';
import { verifyToken, verifyPassword, hashPassword } from '../auth-utils';

// POST /api/auth/change-password — Self-service password change
export async function POST(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json(
      { error: { code: 'AUTH_MISSING_CREDENTIAL', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  const authUser = await verifyToken(token);
  if (!authUser) {
    return NextResponse.json(
      { error: { code: 'AUTH_INVALID_TOKEN', message: 'Invalid or expired token' } },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: { code: 'AUTH_VALIDATION_ERROR', message: 'Current password and new password are required' } },
      { status: 400 }
    );
  }

  const db = getDb();

  // Look up user to get current password hash
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  if (!user || !user.passwordHash) {
    return NextResponse.json(
      { error: { code: 'AUTH_INVALID_CREDENTIAL', message: 'Invalid credentials' } },
      { status: 401 }
    );
  }

  // Verify current password
  const isValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) {
    return NextResponse.json(
      { error: { code: 'AUTH_INVALID_CREDENTIAL', message: 'Current password is incorrect' } },
      { status: 401 }
    );
  }

  // Hash and update
  const newPasswordHash = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
    .where(eq(users.id, authUser.id));

  eventBus.emit('auth.user.passwordChanged', {
    userId: authUser.id,
    method: 'self-service',
  });

  return NextResponse.json({ success: true });
}

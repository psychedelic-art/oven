import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { users } from '../schema';

// GET /api/users/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(users)
    .where(eq(users.id, parseInt(id, 10)));

  if (!result) return notFound('User not found');
  return NextResponse.json(result);
}

// PUT /api/users/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();

  // Get current record for event payload
  const [current] = await db
    .select()
    .from(users)
    .where(eq(users.id, parseInt(id, 10)));

  if (!current) return notFound('User not found');

  // Don't allow updating passwordHash directly through this endpoint
  const { passwordHash: _ph, ...safeBody } = body;

  const [result] = await db
    .update(users)
    .set({ ...safeBody, updatedAt: new Date() })
    .where(eq(users.id, parseInt(id, 10)))
    .returning();

  if (!result) return notFound('User not found');

  eventBus.emit('auth.user.updated', {
    userId: result.id,
    email: result.email,
    name: result.name,
    changes: Object.keys(safeBody),
  });

  return NextResponse.json(result);
}

// DELETE /api/users/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;

  const [deleted] = await db
    .delete(users)
    .where(eq(users.id, parseInt(id, 10)))
    .returning();

  if (!deleted) return notFound('User not found');

  eventBus.emit('auth.user.deleted', {
    userId: deleted.id,
    email: deleted.email,
  });

  return NextResponse.json(deleted);
}

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { roles } from '../schema';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(roles)
    .where(eq(roles.id, parseInt(id, 10)));

  if (!result) return notFound('Role not found');
  return NextResponse.json(result);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();

  // Prevent modification of system roles' slug
  const [existing] = await db.select().from(roles).where(eq(roles.id, parseInt(id, 10)));
  if (!existing) return notFound('Role not found');
  if (existing.isSystem && body.slug && body.slug !== existing.slug) {
    return NextResponse.json({ error: 'Cannot change slug of system role' }, { status: 400 });
  }

  const [result] = await db
    .update(roles)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(roles.id, parseInt(id, 10)))
    .returning();

  return NextResponse.json(result);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;

  const [existing] = await db.select().from(roles).where(eq(roles.id, parseInt(id, 10)));
  if (!existing) return notFound('Role not found');
  if (existing.isSystem) {
    return NextResponse.json({ error: 'Cannot delete system role' }, { status: 400 });
  }

  await db.delete(roles).where(eq(roles.id, parseInt(id, 10)));
  return NextResponse.json(existing);
}

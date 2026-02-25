import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { permissions } from '../schema';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(permissions)
    .where(eq(permissions.id, parseInt(id, 10)));

  if (!result) return notFound('Permission not found');
  return NextResponse.json(result);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();

  // Auto-update slug when resource/action changes
  if (body.resource && body.action) {
    body.slug = `${body.resource}.${body.action}`;
  }

  const [result] = await db
    .update(permissions)
    .set(body)
    .where(eq(permissions.id, parseInt(id, 10)))
    .returning();

  if (!result) return notFound('Permission not found');
  return NextResponse.json(result);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .delete(permissions)
    .where(eq(permissions.id, parseInt(id, 10)))
    .returning();

  if (!result) return notFound('Permission not found');
  return NextResponse.json(result);
}

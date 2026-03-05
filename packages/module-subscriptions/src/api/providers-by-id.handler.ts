import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { providers } from '../schema';

// GET /api/providers/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(providers)
    .where(eq(providers.id, parseInt(id, 10)));

  if (!result) return notFound('Provider not found');
  return NextResponse.json(result);
}

// PUT /api/providers/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();

  const [result] = await db
    .update(providers)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(providers.id, parseInt(id, 10)))
    .returning();

  if (!result) return notFound('Provider not found');

  eventBus.emit('subscriptions.provider.updated', {
    id: result.id,
    name: result.name,
    slug: result.slug,
  });

  return NextResponse.json(result);
}

// DELETE /api/providers/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;

  const [deleted] = await db
    .delete(providers)
    .where(eq(providers.id, parseInt(id, 10)))
    .returning();

  if (!deleted) return notFound('Provider not found');

  eventBus.emit('subscriptions.provider.deleted', {
    id: deleted.id,
    slug: deleted.slug,
  });

  return NextResponse.json(deleted);
}

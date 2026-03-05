import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { services } from '../schema';

// GET /api/services/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(services)
    .where(eq(services.id, parseInt(id, 10)));

  if (!result) return notFound('Service not found');
  return NextResponse.json(result);
}

// PUT /api/services/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();

  const [result] = await db
    .update(services)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(services.id, parseInt(id, 10)))
    .returning();

  if (!result) return notFound('Service not found');

  eventBus.emit('subscriptions.service.updated', {
    id: result.id,
    name: result.name,
    slug: result.slug,
  });

  return NextResponse.json(result);
}

// DELETE /api/services/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;

  const [deleted] = await db
    .delete(services)
    .where(eq(services.id, parseInt(id, 10)))
    .returning();

  if (!deleted) return notFound('Service not found');

  eventBus.emit('subscriptions.service.deleted', {
    id: deleted.id,
    slug: deleted.slug,
  });

  return NextResponse.json(deleted);
}

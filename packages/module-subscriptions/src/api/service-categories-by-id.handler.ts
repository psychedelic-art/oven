import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { serviceCategories } from '../schema';

// GET /api/service-categories/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(serviceCategories)
    .where(eq(serviceCategories.id, parseInt(id, 10)));

  if (!result) return notFound('Service category not found');
  return NextResponse.json(result);
}

// PUT /api/service-categories/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();

  const [result] = await db
    .update(serviceCategories)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(serviceCategories.id, parseInt(id, 10)))
    .returning();

  if (!result) return notFound('Service category not found');

  eventBus.emit('subscriptions.category.updated', {
    id: result.id,
    name: result.name,
    slug: result.slug,
  });

  return NextResponse.json(result);
}

// DELETE /api/service-categories/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;

  const [deleted] = await db
    .delete(serviceCategories)
    .where(eq(serviceCategories.id, parseInt(id, 10)))
    .returning();

  if (!deleted) return notFound('Service category not found');

  eventBus.emit('subscriptions.category.deleted', {
    id: deleted.id,
    slug: deleted.slug,
  });

  return NextResponse.json(deleted);
}

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { tenants } from '../schema';

// GET /api/tenants/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, parseInt(id, 10)));

  if (!result) return notFound('Tenant not found');
  return NextResponse.json(result);
}

// PUT /api/tenants/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();

  const [result] = await db
    .update(tenants)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(tenants.id, parseInt(id, 10)))
    .returning();

  if (!result) return notFound('Tenant not found');

  eventBus.emit('tenants.tenant.updated', {
    id: result.id,
    name: result.name,
    slug: result.slug,
  });

  return NextResponse.json(result);
}

// DELETE /api/tenants/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;

  const [deleted] = await db
    .delete(tenants)
    .where(eq(tenants.id, parseInt(id, 10)))
    .returning();

  if (!deleted) return notFound('Tenant not found');

  eventBus.emit('tenants.tenant.deleted', {
    id: deleted.id,
    slug: deleted.slug,
  });

  return NextResponse.json(deleted);
}

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { flows } from '../schema';

// GET /api/flows/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(flows)
    .where(eq(flows.id, parseInt(id, 10)));

  if (!result) return notFound('Flow not found');
  return NextResponse.json(result);
}

// PUT /api/flows/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();

  const [result] = await db
    .update(flows)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(flows.id, parseInt(id, 10)))
    .returning();

  if (!result) return notFound('Flow not found');

  eventBus.emit('flows.flow.updated', {
    id: result.id,
    tenantId: result.tenantId,
    name: result.name,
  });

  return NextResponse.json(result);
}

// DELETE /api/flows/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;

  const [deleted] = await db
    .delete(flows)
    .where(eq(flows.id, parseInt(id, 10)))
    .returning();

  if (!deleted) return notFound('Flow not found');

  return NextResponse.json(deleted);
}

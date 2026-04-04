import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { aiVectorStores } from '../schema';

// GET /api/ai-vector-stores/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(aiVectorStores)
    .where(eq(aiVectorStores.id, parseInt(id, 10)));

  if (!result) return notFound('Vector store not found');
  return NextResponse.json(result);
}

// PUT /api/ai-vector-stores/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();
  delete body.id;
  delete body.createdAt;
  delete body.updatedAt;

  const [result] = await db
    .update(aiVectorStores)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(aiVectorStores.id, parseInt(id, 10)))
    .returning();

  if (!result) return notFound('Vector store not found');

  eventBus.emit('ai.vectorStore.updated', {
    id: result.id,
    name: result.name,
    slug: result.slug,
    tenantId: result.tenantId,
  });

  return NextResponse.json(result);
}

// DELETE /api/ai-vector-stores/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;

  const [deleted] = await db
    .delete(aiVectorStores)
    .where(eq(aiVectorStores.id, parseInt(id, 10)))
    .returning();

  if (!deleted) return notFound('Vector store not found');

  eventBus.emit('ai.vectorStore.deleted', {
    id: deleted.id,
    slug: deleted.slug,
    tenantId: deleted.tenantId,
  });

  return NextResponse.json(deleted);
}

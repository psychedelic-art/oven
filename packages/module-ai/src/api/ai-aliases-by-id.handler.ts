import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { aiModelAliases } from '../schema';

// GET /api/ai-aliases/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(aiModelAliases)
    .where(eq(aiModelAliases.id, parseInt(id, 10)));

  if (!result) return notFound('AI alias not found');
  return NextResponse.json(result);
}

// PUT /api/ai-aliases/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();

  // Strip read-only fields that React Admin sends back as strings
  delete body.id;
  delete body.createdAt;
  delete body.updatedAt;

  const [result] = await db
    .update(aiModelAliases)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(aiModelAliases.id, parseInt(id, 10)))
    .returning();

  if (!result) return notFound('AI alias not found');

  eventBus.emit('ai.alias.updated', {
    id: result.id,
    alias: result.alias,
    providerId: result.providerId,
    modelId: result.modelId,
  });

  return NextResponse.json(result);
}

// DELETE /api/ai-aliases/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;

  const [deleted] = await db
    .delete(aiModelAliases)
    .where(eq(aiModelAliases.id, parseInt(id, 10)))
    .returning();

  if (!deleted) return notFound('AI alias not found');

  eventBus.emit('ai.alias.deleted', {
    id: deleted.id,
    alias: deleted.alias,
  });

  return NextResponse.json(deleted);
}

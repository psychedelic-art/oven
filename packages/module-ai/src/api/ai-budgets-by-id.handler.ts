import { type NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { aiBudgets } from '../schema';

// GET /api/ai-budgets/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(aiBudgets)
    .where(eq(aiBudgets.id, parseInt(id, 10)));

  if (!result) return notFound('AI budget not found');
  return NextResponse.json(result);
}

// PUT /api/ai-budgets/[id]
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
    .update(aiBudgets)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(aiBudgets.id, parseInt(id, 10)))
    .returning();

  if (!result) return notFound('AI budget not found');

  eventBus.emit('ai.budget.updated', {
    id: result.id,
    scope: result.scope,
    scopeId: result.scopeId,
  });

  return NextResponse.json(result);
}

// DELETE /api/ai-budgets/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;

  const [deleted] = await db
    .delete(aiBudgets)
    .where(eq(aiBudgets.id, parseInt(id, 10)))
    .returning();

  if (!deleted) return notFound('AI budget not found');

  eventBus.emit('ai.budget.deleted', {
    id: deleted.id,
    scope: deleted.scope,
    scopeId: deleted.scopeId,
  });

  return NextResponse.json(deleted);
}

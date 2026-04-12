import { type NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { aiGuardrails } from '../schema';

// GET /api/ai-guardrails/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(aiGuardrails)
    .where(eq(aiGuardrails.id, parseInt(id, 10)));

  if (!result) return notFound('Guardrail not found');
  return NextResponse.json(result);
}

// PUT /api/ai-guardrails/[id]
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
    .update(aiGuardrails)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(aiGuardrails.id, parseInt(id, 10)))
    .returning();

  if (!result) return notFound('Guardrail not found');

  eventBus.emit('ai.guardrail.updated', {
    id: result.id,
    name: result.name,
    ruleType: result.ruleType,
  });

  return NextResponse.json(result);
}

// DELETE /api/ai-guardrails/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;

  const [deleted] = await db
    .delete(aiGuardrails)
    .where(eq(aiGuardrails.id, parseInt(id, 10)))
    .returning();

  if (!deleted) return notFound('Guardrail not found');

  eventBus.emit('ai.guardrail.deleted', {
    id: deleted.id,
    name: deleted.name,
  });

  return NextResponse.json(deleted);
}

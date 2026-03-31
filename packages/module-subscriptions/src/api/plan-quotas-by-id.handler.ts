import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { planQuotas } from '../schema';

// PUT /api/billing-plans/[id]/quotas/[quotaId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; quotaId: string }> }
) {
  const db = getDb();
  const { quotaId } = await params;
  const body = await request.json();

  const [result] = await db
    .update(planQuotas)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(planQuotas.id, parseInt(quotaId, 10)))
    .returning();

  if (!result) return notFound('Plan quota not found');
  return NextResponse.json(result);
}

// DELETE /api/billing-plans/[id]/quotas/[quotaId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; quotaId: string }> }
) {
  const db = getDb();
  const { quotaId } = await params;

  const [deleted] = await db
    .delete(planQuotas)
    .where(eq(planQuotas.id, parseInt(quotaId, 10)))
    .returning();

  if (!deleted) return notFound('Plan quota not found');
  return NextResponse.json(deleted);
}

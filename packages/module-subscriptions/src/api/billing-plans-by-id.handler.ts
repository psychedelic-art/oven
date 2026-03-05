import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { billingPlans } from '../schema';

// GET /api/billing-plans/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(billingPlans)
    .where(eq(billingPlans.id, parseInt(id, 10)));

  if (!result) return notFound('Billing plan not found');
  return NextResponse.json(result);
}

// PUT /api/billing-plans/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();

  const [result] = await db
    .update(billingPlans)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(billingPlans.id, parseInt(id, 10)))
    .returning();

  if (!result) return notFound('Billing plan not found');

  eventBus.emit('subscriptions.plan.updated', {
    id: result.id,
    name: result.name,
    slug: result.slug,
    price: result.price,
  });

  return NextResponse.json(result);
}

// DELETE /api/billing-plans/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;

  const [deleted] = await db
    .delete(billingPlans)
    .where(eq(billingPlans.id, parseInt(id, 10)))
    .returning();

  if (!deleted) return notFound('Billing plan not found');

  eventBus.emit('subscriptions.plan.deleted', {
    id: deleted.id,
    slug: deleted.slug,
  });

  return NextResponse.json(deleted);
}

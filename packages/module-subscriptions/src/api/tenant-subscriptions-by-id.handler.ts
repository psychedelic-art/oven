import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { tenantSubscriptions } from '../schema';

// GET /api/tenant-subscriptions/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(tenantSubscriptions)
    .where(eq(tenantSubscriptions.id, parseInt(id, 10)));

  if (!result) return notFound('Subscription not found');
  return NextResponse.json(result);
}

// PUT /api/tenant-subscriptions/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();

  const [result] = await db
    .update(tenantSubscriptions)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(tenantSubscriptions.id, parseInt(id, 10)))
    .returning();

  if (!result) return notFound('Subscription not found');

  eventBus.emit('subscriptions.subscription.updated', {
    id: result.id,
    tenantId: result.tenantId,
    planId: result.planId,
    status: result.status,
  });

  // If status changed to cancelled, emit cancellation event
  if (body.status === 'cancelled') {
    eventBus.emit('subscriptions.subscription.cancelled', {
      id: result.id,
      tenantId: result.tenantId,
      planId: result.planId,
    });
  }

  return NextResponse.json(result);
}

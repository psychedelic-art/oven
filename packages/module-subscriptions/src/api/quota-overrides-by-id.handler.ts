import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { subscriptionQuotaOverrides } from '../schema';

// PUT /api/tenant-subscriptions/[id]/overrides/[overrideId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; overrideId: string }> }
) {
  const db = getDb();
  const { overrideId } = await params;
  const body = await request.json();

  const [result] = await db
    .update(subscriptionQuotaOverrides)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(subscriptionQuotaOverrides.id, parseInt(overrideId, 10)))
    .returning();

  if (!result) return notFound('Quota override not found');
  return NextResponse.json(result);
}

// DELETE /api/tenant-subscriptions/[id]/overrides/[overrideId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; overrideId: string }> }
) {
  const db = getDb();
  const { overrideId } = await params;

  const [deleted] = await db
    .delete(subscriptionQuotaOverrides)
    .where(eq(subscriptionQuotaOverrides.id, parseInt(overrideId, 10)))
    .returning();

  if (!deleted) return notFound('Quota override not found');
  return NextResponse.json(deleted);
}

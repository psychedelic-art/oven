import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { moduleConfigs } from '../schema';

// GET /api/module-configs/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(moduleConfigs)
    .where(eq(moduleConfigs.id, parseInt(id, 10)));

  if (!result) return notFound('Config entry not found');
  return NextResponse.json(result);
}

// PUT /api/module-configs/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();

  // Get current value for event payload
  const [current] = await db
    .select()
    .from(moduleConfigs)
    .where(eq(moduleConfigs.id, parseInt(id, 10)));

  if (!current) return notFound('Config entry not found');

  const oldValue = current.value;
  const [result] = await db
    .update(moduleConfigs)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(moduleConfigs.id, parseInt(id, 10)))
    .returning();

  if (!result) return notFound('Config entry not found');

  eventBus.emit('config.entry.updated', {
    id: result.id,
    tenantId: result.tenantId,
    moduleName: result.moduleName,
    key: result.key,
    oldValue,
    newValue: result.value,
  });

  return NextResponse.json(result);
}

// DELETE /api/module-configs/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;

  const [deleted] = await db
    .delete(moduleConfigs)
    .where(eq(moduleConfigs.id, parseInt(id, 10)))
    .returning();

  if (!deleted) return notFound('Config entry not found');

  eventBus.emit('config.entry.deleted', {
    id: deleted.id,
    tenantId: deleted.tenantId,
    moduleName: deleted.moduleName,
    key: deleted.key,
  });

  return NextResponse.json(deleted);
}

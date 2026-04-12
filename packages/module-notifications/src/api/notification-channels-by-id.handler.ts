import { type NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { notificationChannels } from '../schema';

// GET /api/notification-channels/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const db = getDb();
  const id = parseInt(params.id, 10);
  const rows = await db
    .select()
    .from(notificationChannels)
    .where(eq(notificationChannels.id, id))
    .limit(1);

  if (rows.length === 0) return notFound('Channel not found');
  return NextResponse.json(rows[0]);
}

// PUT /api/notification-channels/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const db = getDb();
  const id = parseInt(params.id, 10);
  const body = await request.json();

  const updated = await db
    .update(notificationChannels)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(notificationChannels.id, id))
    .returning();

  if (updated.length === 0) return notFound('Channel not found');

  await eventBus.emit('notifications.channel.updated', {
    id: updated[0].id,
    tenantId: updated[0].tenantId,
    channelType: updated[0].channelType,
  });

  return NextResponse.json(updated[0]);
}

// DELETE /api/notification-channels/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const db = getDb();
  const id = parseInt(params.id, 10);
  const deleted = await db
    .delete(notificationChannels)
    .where(eq(notificationChannels.id, id))
    .returning();

  if (deleted.length === 0) return notFound('Channel not found');

  await eventBus.emit('notifications.channel.deleted', {
    id: deleted[0].id,
    tenantId: deleted[0].tenantId,
    channelType: deleted[0].channelType,
  });

  return NextResponse.json(deleted[0]);
}

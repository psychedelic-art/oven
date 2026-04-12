import { type NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { notificationChannels } from '../schema';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const db = getDb();
  const [channel] = await db
    .select()
    .from(notificationChannels)
    .where(eq(notificationChannels.id, Number(params.id)))
    .limit(1);

  if (!channel) return notFound('Channel not found');
  return NextResponse.json(channel);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await request.json();
  const db = getDb();

  const [updated] = await db
    .update(notificationChannels)
    .set({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.config !== undefined && { config: body.config }),
      ...(body.webhookVerifyToken !== undefined && {
        webhookVerifyToken: body.webhookVerifyToken,
      }),
      ...(body.enabled !== undefined && { enabled: body.enabled }),
      updatedAt: new Date(),
    })
    .where(eq(notificationChannels.id, Number(params.id)))
    .returning();

  if (!updated) return notFound('Channel not found');
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const db = getDb();
  const [deleted] = await db
    .delete(notificationChannels)
    .where(eq(notificationChannels.id, Number(params.id)))
    .returning({ id: notificationChannels.id });

  if (!deleted) return notFound('Channel not found');
  return NextResponse.json(deleted);
}

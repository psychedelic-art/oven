import { type NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { notificationConversations, notificationMessages } from '../schema';

// GET /api/notification-conversations/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const db = getDb();
  const id = parseInt(params.id, 10);

  const rows = await db
    .select()
    .from(notificationConversations)
    .where(eq(notificationConversations.id, id))
    .limit(1);

  if (rows.length === 0) return notFound('Conversation not found');

  const messages = await db
    .select()
    .from(notificationMessages)
    .where(eq(notificationMessages.conversationId, id))
    .orderBy(notificationMessages.createdAt);

  return NextResponse.json({ ...rows[0], messages });
}

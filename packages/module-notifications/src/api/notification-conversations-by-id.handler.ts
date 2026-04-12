import { type NextRequest, NextResponse } from 'next/server';
import { eq, asc } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { notificationConversations, notificationMessages } from '../schema';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const db = getDb();
  const [conversation] = await db
    .select()
    .from(notificationConversations)
    .where(eq(notificationConversations.id, Number(params.id)))
    .limit(1);

  if (!conversation) return notFound('Conversation not found');

  const messages = await db
    .select()
    .from(notificationMessages)
    .where(eq(notificationMessages.conversationId, conversation.id))
    .orderBy(asc(notificationMessages.createdAt));

  return NextResponse.json({ ...conversation, messages });
}

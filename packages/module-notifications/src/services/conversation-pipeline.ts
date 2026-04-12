import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import {
  notificationConversations,
  notificationMessages,
  notificationUsage,
} from '../schema';
import type { InboundMessage } from '../types';

interface IngestParams {
  tenantId: number;
  channelId: number;
  channelType: string;
  message: InboundMessage;
}

interface IngestResult {
  conversationId: number;
  messageId: number;
  isNewConversation: boolean;
}

/**
 * Ingest an inbound message into the conversation pipeline.
 *
 * 1. Look up or create a conversation for the sender.
 * 2. Insert the message row.
 * 3. Increment the usage counter for the tenant/channel/period.
 * 4. Emit events.
 */
export async function ingestInboundMessage(
  params: IngestParams,
): Promise<IngestResult> {
  const { tenantId, channelId, channelType, message } = params;
  const db = getDb();

  // 1. Find or create conversation
  let isNewConversation = false;
  const existing = await db
    .select()
    .from(notificationConversations)
    .where(
      and(
        eq(notificationConversations.channelId, channelId),
        eq(notificationConversations.externalUserId, message.from),
        eq(notificationConversations.status, 'active'),
      ),
    )
    .limit(1);

  let conversationId: number;
  if (existing.length > 0) {
    conversationId = existing[0].id;
  } else {
    isNewConversation = true;
    const [inserted] = await db
      .insert(notificationConversations)
      .values({
        tenantId,
        channelId,
        channelType,
        externalUserId: message.from,
        status: 'active',
      })
      .returning({ id: notificationConversations.id });
    conversationId = inserted.id;
  }

  // 2. Insert message
  const [msg] = await db
    .insert(notificationMessages)
    .values({
      conversationId,
      direction: 'inbound',
      messageType: message.content.type,
      content: message.content,
      externalMessageId: message.externalMessageId,
      status: 'delivered',
    })
    .returning({ id: notificationMessages.id });

  // 3. Increment usage (current month)
  const now = new Date();
  const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const periodEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

  await db
    .insert(notificationUsage)
    .values({
      tenantId,
      channelType,
      period: 'monthly',
      periodStart,
      periodEnd,
      messageCount: 1,
      limit: 0,
    })
    .onConflictDoUpdate({
      target: [
        notificationUsage.tenantId,
        notificationUsage.channelType,
        notificationUsage.periodStart,
      ],
      set: {
        messageCount: sql`${notificationUsage.messageCount} + 1`,
        updatedAt: new Date(),
      },
    });

  // 4. Emit events
  if (isNewConversation) {
    await eventBus.emit('notifications.conversation.created', {
      conversationId,
      tenantId,
      channelId,
      channelType,
      externalUserId: message.from,
    });
  }

  await eventBus.emit('notifications.message.received', {
    conversationId,
    messageId: msg.id,
    tenantId,
    channelId,
    channelType,
    from: message.from,
    messageType: message.content.type,
    externalMessageId: message.externalMessageId,
  });

  return {
    conversationId,
    messageId: msg.id,
    isNewConversation,
  };
}

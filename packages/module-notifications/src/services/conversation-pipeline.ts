import { eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import {
  notificationConversations,
  notificationMessages,
  notificationUsage,
} from '../schema';
import { NOTIFICATION_EVENTS } from '../events';
import type { InboundMessage, ChannelType } from '../types';

interface IngestParams {
  tenantId: number;
  channelId: number;
  channelType: ChannelType;
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
 * 1. Find or create a conversation for the (channel, externalUserId) pair.
 * 2. Insert the message row.
 * 3. Increment the usage counter for the current period.
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
    const [conv] = await db
      .insert(notificationConversations)
      .values({
        tenantId,
        channelId,
        channelType,
        externalUserId: message.from,
        status: 'active',
      })
      .returning({ id: notificationConversations.id });
    conversationId = conv.id;
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
      status: 'sent',
    })
    .returning({ id: notificationMessages.id });

  // 3. Increment usage (upsert for current period)
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];

  const existingUsage = await db
    .select()
    .from(notificationUsage)
    .where(
      and(
        eq(notificationUsage.tenantId, tenantId),
        eq(notificationUsage.channelType, channelType),
        eq(notificationUsage.periodStart, periodStart),
      ),
    )
    .limit(1);

  if (existingUsage.length > 0) {
    await db
      .update(notificationUsage)
      .set({
        messageCount: existingUsage[0].messageCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(notificationUsage.id, existingUsage[0].id));
  } else {
    await db.insert(notificationUsage).values({
      tenantId,
      channelType,
      period: 'monthly',
      periodStart,
      periodEnd,
      messageCount: 1,
      limit: 300, // fallback; resolved from module-config in sprint-03
    });
  }

  // 4. Emit events
  eventBus.emit(NOTIFICATION_EVENTS.MESSAGE_RECEIVED, {
    conversationId,
    tenantId,
    channelType,
    from: message.from,
    messageType: message.content.type,
  });

  if (isNewConversation) {
    eventBus.emit(NOTIFICATION_EVENTS.CONVERSATION_CREATED, {
      id: conversationId,
      tenantId,
      channelType,
      externalUserId: message.from,
    });
  }

  return {
    conversationId,
    messageId: msg.id,
    isNewConversation,
  };
}

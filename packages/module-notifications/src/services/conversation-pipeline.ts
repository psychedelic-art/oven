import { eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import {
  notificationConversations,
  notificationMessages,
} from '../schema';
import { NOTIFICATION_EVENTS } from '../events';
import { checkUsageLimit, incrementUsage } from './usage-metering';
import type { UsageLimitResolverDeps } from './usage-limit-resolver';
import type { InboundMessage, ChannelType } from '../types';

interface IngestParams {
  tenantId: number;
  channelId: number;
  channelType: ChannelType;
  message: InboundMessage;
  /** Optional: injected deps for usage-limit resolution (tests). */
  usageDeps?: UsageLimitResolverDeps;
}

interface IngestResult {
  conversationId: number;
  messageId: number;
  isNewConversation: boolean;
  limitExceeded: boolean;
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
  const { tenantId, channelId, channelType, message, usageDeps } = params;
  const db = getDb();

  // 1. Check usage limit before processing
  const usageCheck = await checkUsageLimit(tenantId, channelType, usageDeps);

  if (!usageCheck.allowed) {
    // Short-circuit: limit already exceeded — do not process the message,
    // emit limit-exceeded if not already emitted this period.
    return {
      conversationId: 0,
      messageId: 0,
      isNewConversation: false,
      limitExceeded: true,
    };
  }

  // 2. Find or create conversation
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

  // 3. Insert message
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

  // 4. Increment usage via the metering service (atomic upsert + event emission)
  await incrementUsage(tenantId, channelType, usageCheck.limit);

  // 5. Emit events
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
    limitExceeded: false,
  };
}

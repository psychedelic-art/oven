import type { InboundMessage, MessageContent } from '@oven/module-notifications/adapters';

/**
 * Parse an inbound Meta WhatsApp webhook payload into an InboundMessage.
 *
 * Meta's webhook payload shape (simplified):
 * {
 *   entry: [{
 *     changes: [{
 *       value: {
 *         messages: [{
 *           from: "15551234567",
 *           id: "wamid.xxx",
 *           timestamp: "1234567890",
 *           type: "text",
 *           text?: { body: "hello" },
 *           image?: { id: "...", mime_type: "...", caption?: "..." },
 *           audio?: { id: "...", mime_type: "..." },
 *           document?: { id: "...", mime_type: "...", filename: "..." }
 *         }]
 *       }
 *     }]
 *   }]
 * }
 */
export function parseInboundMetaWebhook(payload: unknown): InboundMessage {
  const obj = payload as Record<string, unknown>;
  const entry = obj?.entry as Array<Record<string, unknown>> | undefined;
  if (!entry || entry.length === 0) {
    throw new Error('Meta webhook payload missing entry array');
  }

  const changes = entry[0].changes as Array<Record<string, unknown>> | undefined;
  if (!changes || changes.length === 0) {
    throw new Error('Meta webhook payload missing changes array');
  }

  const value = changes[0].value as Record<string, unknown>;
  const messages = value?.messages as Array<Record<string, unknown>> | undefined;
  if (!messages || messages.length === 0) {
    throw new Error('Meta webhook payload missing messages array');
  }

  const msg = messages[0];
  const from = msg.from as string;
  const externalMessageId = msg.id as string;
  const timestamp = new Date(Number(msg.timestamp as string) * 1000);
  const type = msg.type as string;

  const content = resolveContent(type, msg);

  return {
    from,
    externalMessageId,
    timestamp,
    content,
    metadata: { rawType: type },
  };
}

function resolveContent(
  type: string,
  msg: Record<string, unknown>,
): MessageContent {
  switch (type) {
    case 'text': {
      const text = msg.text as Record<string, unknown> | undefined;
      return { type: 'text', text: text?.body as string };
    }
    case 'image': {
      const image = msg.image as Record<string, unknown> | undefined;
      return {
        type: 'image',
        mediaUrl: image?.id as string,
        text: image?.caption as string | undefined,
      };
    }
    case 'audio': {
      const audio = msg.audio as Record<string, unknown> | undefined;
      return { type: 'audio', mediaUrl: audio?.id as string };
    }
    case 'document': {
      const doc = msg.document as Record<string, unknown> | undefined;
      return { type: 'document', mediaUrl: doc?.id as string };
    }
    default:
      return { type: 'text', text: `[unsupported message type: ${type}]` };
  }
}

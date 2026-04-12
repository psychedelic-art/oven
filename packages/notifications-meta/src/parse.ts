import type { InboundMessage, MessageContent } from '@oven/module-notifications/adapters';

// ---------------------------------------------------------------------------
// Meta WhatsApp webhook payload types (subset we care about)
// ---------------------------------------------------------------------------

interface MetaTextBody {
  body: string;
}

interface MetaMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: MetaTextBody;
}

interface MetaValue {
  messages?: MetaMessage[];
  metadata?: { phone_number_id?: string };
}

interface MetaChange {
  value?: MetaValue;
}

interface MetaEntry {
  changes?: MetaChange[];
}

interface MetaWebhookPayload {
  object?: string;
  entry?: MetaEntry[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertMetaPayload(payload: unknown): asserts payload is MetaWebhookPayload {
  if (!isObject(payload)) {
    throw new Error('Invalid Meta webhook payload: expected an object');
  }

  const p = payload as MetaWebhookPayload;

  if (p.object !== 'whatsapp_business_account') {
    throw new Error(
      `Invalid Meta webhook payload: unexpected object type "${String(p.object)}"`,
    );
  }

  if (!Array.isArray(p.entry) || p.entry.length === 0) {
    throw new Error('Invalid Meta webhook payload: missing entry array');
  }

  const changes = p.entry[0]?.changes;
  if (!Array.isArray(changes) || changes.length === 0) {
    throw new Error('Invalid Meta webhook payload: missing changes array');
  }

  const value = changes[0]?.value;
  if (!isObject(value)) {
    throw new Error('Invalid Meta webhook payload: missing value object');
  }

  if (!Array.isArray(value.messages) || value.messages.length === 0) {
    throw new Error('Invalid Meta webhook payload: missing messages array');
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a Meta WhatsApp Business webhook payload into an InboundMessage.
 *
 * The function validates the structure and throws with a descriptive message
 * when the shape doesn't match the expected format.
 */
export function parseInboundMetaWebhook(payload: unknown): InboundMessage {
  assertMetaPayload(payload);

  const value = payload.entry![0]!.changes![0]!.value!;
  const msg = value.messages![0]!;

  const content: MessageContent = buildContent(msg);

  return {
    from: msg.from,
    externalMessageId: msg.id,
    timestamp: new Date(Number(msg.timestamp) * 1000),
    content,
    metadata: value.metadata ? { phoneNumberId: value.metadata.phone_number_id } : undefined,
  };
}

function buildContent(msg: MetaMessage): MessageContent {
  switch (msg.type) {
    case 'text':
      return { type: 'text', text: msg.text?.body ?? '' };
    case 'image':
      return { type: 'image' };
    case 'audio':
      return { type: 'audio' };
    case 'document':
      return { type: 'document' };
    default:
      // Fallback: treat unknown types as text with empty body
      return { type: 'text', text: '' };
  }
}

// Public types for @oven/module-notifications.
// Adapter packages (@oven/notifications-meta, @oven/notifications-twilio,
// @oven/notifications-resend) import NotificationAdapter and the message
// shape types from the `/adapters` subpath to avoid cyclic build deps.

export type ChannelType = 'whatsapp' | 'sms' | 'email';

export type MessageDirection = 'inbound' | 'outbound';

export type MessageKind = 'text' | 'template' | 'interactive' | 'image' | 'audio' | 'document';

export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

export type ConversationStatus = 'active' | 'escalated' | 'closed';

export type EscalationReason =
  | 'out-of-scope'
  | 'clinical'
  | 'user-requested'
  | 'limit-exceeded';

export interface MessageContent {
  type: MessageKind;
  text?: string;
  mediaUrl?: string;
  templateName?: string;
  templateParams?: Record<string, string>;
}

export interface InteractiveMessage {
  type: 'button' | 'list';
  body: string;
  options: Array<{ id: string; title: string }>;
}

export interface SendResult {
  externalMessageId: string;
  status: 'sent' | 'queued' | 'failed';
  error?: string;
}

export interface InboundMessage {
  from: string;
  content: MessageContent;
  externalMessageId: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface DeliveryStatus {
  externalMessageId: string;
  status: MessageStatus;
  timestamp: Date;
  error?: string;
}

/**
 * Adapter-specific channel configuration. Values come from the
 * `config` JSONB column of notification_channels. Sensitive fields
 * are decrypted just-in-time by the send pipeline.
 */
export type ChannelConfig = Record<string, unknown>;

/**
 * The NotificationAdapter interface every external adapter package
 * implements. Module-notifications never imports adapter packages;
 * adapters are registered at app startup via
 * `registerNotificationAdapter(adapter)`.
 */
export interface NotificationAdapter {
  name: string;
  channelType: ChannelType;

  sendMessage(
    channel: ChannelConfig,
    to: string,
    content: MessageContent
  ): Promise<SendResult>;

  sendInteractive?(
    channel: ChannelConfig,
    to: string,
    interactive: InteractiveMessage
  ): Promise<SendResult>;

  /**
   * Parse an already-parsed webhook payload into an InboundMessage.
   * The raw body is verified separately by verifyWebhookSignature
   * BEFORE this is called.
   */
  parseInboundWebhook(payload: unknown): Promise<InboundMessage>;

  /**
   * Verify the HMAC signature against the raw body.
   * Handlers must call this with the raw body obtained via
   * `await request.text()` BEFORE any JSON parsing.
   */
  verifyWebhookSignature(input: {
    rawBody: string;
    signatureHeader: string | null;
    appSecret: string;
  }): Promise<boolean>;

  /**
   * Optional: parse a delivery status webhook payload into a
   * DeliveryStatus. Returns null when the payload is not a delivery
   * status event (e.g. it's an inbound message instead).
   */
  parseDeliveryStatus?(payload: unknown): Promise<DeliveryStatus | null>;
}

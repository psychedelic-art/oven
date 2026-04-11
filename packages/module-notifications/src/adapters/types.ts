// Subpath export for adapter packages to import the adapter interface
// without pulling the module runtime. Adapter packages
// (@oven/notifications-meta, @oven/notifications-twilio,
// @oven/notifications-resend) import from
// '@oven/module-notifications/adapters' — never from the package root.

export type {
  NotificationAdapter,
  ChannelType,
  ChannelConfig,
  MessageContent,
  MessageKind,
  InteractiveMessage,
  SendResult,
  InboundMessage,
  DeliveryStatus,
  MessageStatus,
} from '../types';

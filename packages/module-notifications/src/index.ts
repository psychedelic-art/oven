import type { ModuleDefinition } from '@oven/module-registry';
import { notificationsSchema } from './schema';
import { seedNotifications } from './seed';
import {
  NOTIFICATION_EVENT_NAMES,
  notificationEventSchemas,
} from './events';

// ─── Module Definition ──────────────────────────────────────────
//
// Notifications is a multi-channel messaging module. It ships with an
// adapter interface (src/adapters/types.ts) that external packages
// (@oven/notifications-meta, @oven/notifications-twilio,
// @oven/notifications-resend) implement. This package never imports
// those adapter packages — they are registered at app startup from
// apps/dashboard/src/lib/modules.ts via registerNotificationAdapter().
//
// Sprint-01 (this sprint) delivers: schema, adapter interface +
// registry, seed, ModuleDefinition.
// Sprint-02: Meta adapter + webhook + channel/conversation handlers.
// Sprint-03: usage metering + rule-13-compliant limit resolver +
//            notifications.checkLimit workflow node.
// Sprint-04: React Admin dashboard UI.
// Sprint-05: end-to-end acceptance.
//
// See docs/modules/notifications/ for the full doc set.
//
// The `chat`, `description`, and `capabilities` fields are not declared
// on ModuleDefinition in module-registry/src/types.ts yet, but
// module-rules.md Rule 2.1 requires them for agent tool discovery and
// existing modules (module-tenants, module-ai) ship with the same shape.

export const notificationsModule: ModuleDefinition = {
  name: 'notifications',
  dependencies: ['config', 'tenants', 'agent-core'],
  description:
    'Multi-channel messaging with WhatsApp Business, usage metering, and escalation handling',
  capabilities: [
    'send WhatsApp messages',
    'receive WhatsApp messages',
    'track message usage',
    'handle escalations',
    'manage channels',
  ],
  schema: notificationsSchema,
  seed: seedNotifications,
  // Handlers ship in sprint-02; keep empty for now.
  apiHandlers: {},
  // Dashboard resources + menu items ship in sprint-04; keep empty.
  resources: [],
  menuItems: [],
  customRoutes: [],
  // configSchema — see docs/modules/notifications/module-design.md#configschema.
  // DEFAULT_*_LIMIT keys close the Rule 13 drift described in
  // docs/modules/todo/notifications/CODE-REVIEW.md DRIFT-1.
  configSchema: [
    {
      key: 'WHATSAPP_API_VERSION',
      type: 'string',
      description: 'Meta Graph API version for WhatsApp Business',
      defaultValue: 'v21.0',
      instanceScoped: false,
    },
    {
      key: 'USAGE_WARNING_THRESHOLD',
      type: 'number',
      description: 'Percentage of usage limit that triggers a warning event',
      defaultValue: 80,
      instanceScoped: true,
    },
    {
      key: 'AUTO_CLOSE_CONVERSATION_HOURS',
      type: 'number',
      description: 'Hours of inactivity before a conversation is auto-closed',
      defaultValue: 24,
      instanceScoped: true,
    },
    {
      key: 'ESCALATION_NOTIFY_OFFICE',
      type: 'boolean',
      description: 'Emit an extra notification event when a conversation escalates',
      defaultValue: true,
      instanceScoped: true,
    },
    {
      key: 'DEFAULT_WHATSAPP_LIMIT',
      type: 'number',
      description:
        'Fallback monthly WhatsApp message limit used when no module-subscriptions plan quota is attached (Rule 13 tier-2 resolver)',
      defaultValue: 300,
      instanceScoped: true,
    },
    {
      key: 'DEFAULT_SMS_LIMIT',
      type: 'number',
      description:
        'Fallback monthly SMS message limit used when no module-subscriptions plan quota is attached',
      defaultValue: 200,
      instanceScoped: true,
    },
    {
      key: 'DEFAULT_EMAIL_LIMIT',
      type: 'number',
      description:
        'Fallback monthly email message limit used when no module-subscriptions plan quota is attached',
      defaultValue: 1000,
      instanceScoped: true,
    },
  ],
  events: {
    emits: NOTIFICATION_EVENT_NAMES,
    schemas: notificationEventSchemas,
  },
  chat: {
    description:
      'Multi-channel messaging with WhatsApp Business, usage metering, and escalation handling. Tracks conversations and enforces per-tenant message limits resolved from module-subscriptions plan quotas with module-config fallbacks.',
    capabilities: [
      'list conversations',
      'check usage limits',
      'view escalations',
      'resolve escalations',
    ],
    actionSchemas: [
      {
        name: 'notifications.listConversations',
        description: 'List notification conversations with filtering',
        parameters: {
          tenantId: { type: 'number' },
          channelType: { type: 'string' },
          status: { type: 'string' },
        },
        returns: { data: { type: 'array' }, total: { type: 'number' } },
        requiredPermissions: ['notification-conversations.read'],
        endpoint: { method: 'GET', path: 'notification-conversations' },
      },
      {
        name: 'notifications.getUsage',
        description: 'Get usage report for a tenant and channel',
        parameters: {
          tenantId: { type: 'number', required: true },
          channelType: { type: 'string' },
        },
        returns: {
          used: { type: 'number' },
          limit: { type: 'number' },
          remaining: { type: 'number' },
        },
        requiredPermissions: ['notification-usage.read'],
        endpoint: { method: 'GET', path: 'notifications/usage' },
      },
      {
        name: 'notifications.listEscalations',
        description: 'List escalations for a tenant',
        parameters: {
          tenantId: { type: 'number' },
          status: { type: 'string' },
        },
        returns: { data: { type: 'array' }, total: { type: 'number' } },
        requiredPermissions: ['notification-escalations.read'],
        endpoint: { method: 'GET', path: 'notification-escalations' },
      },
      {
        name: 'notifications.checkLimit',
        description:
          'Check whether a tenant still has inbound message budget for a channel. Resolves from module-subscriptions plan quotas with module-config fallback.',
        parameters: {
          tenantId: { type: 'number', required: true },
          channelType: { type: 'string', required: true },
        },
        returns: {
          allowed: { type: 'boolean' },
          used: { type: 'number' },
          limit: { type: 'number' },
          remaining: { type: 'number' },
          source: { type: 'string' },
        },
        requiredPermissions: ['notification-usage.read'],
      },
    ],
  },
};

export { notificationsSchema } from './schema';
export { seedNotifications } from './seed';
export {
  NOTIFICATION_EVENTS,
  NOTIFICATION_EVENT_NAMES,
  notificationEventSchemas,
} from './events';
export {
  registerNotificationAdapter,
  getAdapter,
  getAdapterForChannelType,
  listAdapters,
  clearAdapters,
} from './adapters/registry';
export type {
  NotificationAdapter,
  ChannelType,
  ChannelConfig,
  MessageContent,
  MessageKind,
  MessageDirection,
  MessageStatus,
  ConversationStatus,
  EscalationReason,
  InteractiveMessage,
  SendResult,
  InboundMessage,
  DeliveryStatus,
} from './types';

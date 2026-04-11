import type { EventSchemaMap } from '@oven/module-registry';

// Event name constants. Exported for both the ModuleDefinition and
// for consumers that want to listen (e.g. module-workflow-agents).
export const NOTIFICATION_EVENTS = {
  MESSAGE_RECEIVED: 'notifications.message.received',
  MESSAGE_SENT: 'notifications.message.sent',
  MESSAGE_DELIVERED: 'notifications.message.delivered',
  MESSAGE_FAILED: 'notifications.message.failed',
  CONVERSATION_CREATED: 'notifications.conversation.created',
  CONVERSATION_ESCALATED: 'notifications.conversation.escalated',
  USAGE_LIMIT_WARNING: 'notifications.usage.limitWarning',
  USAGE_LIMIT_EXCEEDED: 'notifications.usage.limitExceeded',
} as const;

// Every event payload includes tenantId per Rule 5.6.
export const notificationEventSchemas: EventSchemaMap = {
  'notifications.message.received': {
    conversationId: { type: 'number', description: 'Conversation DB ID', required: true },
    tenantId: { type: 'number', description: 'Tenant DB ID', required: true },
    channelType: { type: 'string', description: 'Channel type (whatsapp/sms/email)' },
    from: { type: 'string', description: 'External user identifier (phone/email)' },
    messageType: { type: 'string', description: 'Message content type' },
  },
  'notifications.message.sent': {
    conversationId: { type: 'number', description: 'Conversation DB ID', required: true },
    tenantId: { type: 'number', description: 'Tenant DB ID', required: true },
    channelType: { type: 'string', description: 'Channel type' },
    to: { type: 'string', description: 'External user identifier' },
    messageType: { type: 'string', description: 'Message content type' },
  },
  'notifications.message.delivered': {
    messageId: { type: 'number', description: 'Message DB ID', required: true },
    tenantId: { type: 'number', description: 'Tenant DB ID', required: true },
    externalMessageId: { type: 'string', description: 'Adapter-side message id' },
  },
  'notifications.message.failed': {
    messageId: { type: 'number', description: 'Message DB ID', required: true },
    tenantId: { type: 'number', description: 'Tenant DB ID', required: true },
    error: { type: 'string', description: 'Failure reason' },
  },
  'notifications.conversation.created': {
    id: { type: 'number', description: 'Conversation DB ID', required: true },
    tenantId: { type: 'number', description: 'Tenant DB ID', required: true },
    channelType: { type: 'string', description: 'Channel type' },
    externalUserId: { type: 'string', description: 'External user identifier' },
  },
  'notifications.conversation.escalated': {
    id: { type: 'number', description: 'Conversation DB ID', required: true },
    tenantId: { type: 'number', description: 'Tenant DB ID', required: true },
    reason: { type: 'string', description: 'Escalation reason' },
    userMessage: { type: 'string', description: 'Last user message before escalation' },
  },
  'notifications.usage.limitWarning': {
    tenantId: { type: 'number', description: 'Tenant DB ID', required: true },
    channelType: { type: 'string', description: 'Channel type' },
    used: { type: 'number', description: 'Messages used this period' },
    limit: { type: 'number', description: 'Period limit' },
    percentage: { type: 'number', description: 'Percent of limit reached (0-100)' },
  },
  'notifications.usage.limitExceeded': {
    tenantId: { type: 'number', description: 'Tenant DB ID', required: true },
    channelType: { type: 'string', description: 'Channel type' },
    used: { type: 'number', description: 'Messages used this period' },
    limit: { type: 'number', description: 'Period limit' },
  },
};

export const NOTIFICATION_EVENT_NAMES = Object.values(NOTIFICATION_EVENTS);

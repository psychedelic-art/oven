import {
  pgTable,
  serial,
  integer,
  varchar,
  boolean,
  jsonb,
  text,
  date,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core';

// ─── notification_channels ──────────────────────────────────────
// Per-tenant configured channel endpoints.
// config is JSONB with adapter-specific shape — sensitive fields
// (accessToken, authToken, apiKey) are encrypted before insert.
export const notificationChannels = pgTable(
  'notification_channels',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id').notNull(),
    channelType: varchar('channel_type', { length: 50 }).notNull(),
    adapterName: varchar('adapter_name', { length: 50 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    config: jsonb('config').notNull(),
    webhookVerifyToken: varchar('webhook_verify_token', { length: 255 }),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('nc_tenant_id_idx').on(table.tenantId),
    index('nc_channel_type_idx').on(table.channelType),
    index('nc_adapter_name_idx').on(table.adapterName),
    index('nc_enabled_idx').on(table.enabled),
  ]
);

// ─── notification_conversations ─────────────────────────────────
// Threaded exchanges between a channel and an external user.
export const notificationConversations = pgTable(
  'notification_conversations',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id').notNull(),
    channelId: integer('channel_id').notNull(),
    channelType: varchar('channel_type', { length: 50 }).notNull(),
    externalUserId: varchar('external_user_id', { length: 255 }).notNull(),
    agentSessionId: integer('agent_session_id'),
    status: varchar('status', { length: 50 }).notNull().default('active'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('nconv_tenant_id_idx').on(table.tenantId),
    index('nconv_channel_id_idx').on(table.channelId),
    index('nconv_external_user_idx').on(table.externalUserId),
    index('nconv_agent_session_idx').on(table.agentSessionId),
    index('nconv_status_idx').on(table.status),
  ]
);

// ─── notification_messages ──────────────────────────────────────
// Individual messages within a conversation. Immutable except for status lifecycle.
export const notificationMessages = pgTable(
  'notification_messages',
  {
    id: serial('id').primaryKey(),
    conversationId: integer('conversation_id').notNull(),
    direction: varchar('direction', { length: 20 }).notNull(),
    messageType: varchar('message_type', { length: 50 }).notNull(),
    content: jsonb('content').notNull(),
    externalMessageId: varchar('external_message_id', { length: 255 }),
    status: varchar('status', { length: 50 }).notNull().default('sent'),
    error: text('error'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('nmsg_conversation_id_idx').on(table.conversationId),
    index('nmsg_direction_idx').on(table.direction),
    index('nmsg_status_idx').on(table.status),
    index('nmsg_external_msg_id_idx').on(table.externalMessageId),
    index('nmsg_created_at_idx').on(table.createdAt),
  ]
);

// ─── notification_usage ─────────────────────────────────────────
// Per-tenant, per-channel, per-period inbound message counter.
// Atomic upsert via ON CONFLICT (tenant_id, channel_type, period_start).
export const notificationUsage = pgTable(
  'notification_usage',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id').notNull(),
    channelType: varchar('channel_type', { length: 50 }).notNull(),
    period: varchar('period', { length: 20 }).notNull().default('monthly'),
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    messageCount: integer('message_count').notNull().default(0),
    limit: integer('limit').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('nu_tenant_id_idx').on(table.tenantId),
    index('nu_channel_type_idx').on(table.channelType),
    index('nu_period_start_idx').on(table.periodStart),
    unique('nu_tenant_channel_period').on(
      table.tenantId,
      table.channelType,
      table.periodStart
    ),
  ]
);

// ─── notification_escalations ───────────────────────────────────
// Structured records capturing when a conversation cannot be handled automatically.
export const notificationEscalations = pgTable(
  'notification_escalations',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id').notNull(),
    channelType: varchar('channel_type', { length: 50 }).notNull(),
    conversationId: integer('conversation_id').notNull(),
    reason: varchar('reason', { length: 100 }).notNull(),
    userMessage: text('user_message'),
    status: varchar('status', { length: 50 }).notNull().default('pending'),
    resolvedBy: integer('resolved_by'),
    resolvedAt: timestamp('resolved_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('nesc_tenant_id_idx').on(table.tenantId),
    index('nesc_conversation_id_idx').on(table.conversationId),
    index('nesc_status_idx').on(table.status),
    index('nesc_reason_idx').on(table.reason),
  ]
);

// Export all schemas for registry composition
export const notificationsSchema = {
  notificationChannels,
  notificationConversations,
  notificationMessages,
  notificationUsage,
  notificationEscalations,
};

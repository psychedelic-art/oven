import {
  pgTable, serial, integer, varchar, text, boolean, timestamp, jsonb, index, unique,
} from 'drizzle-orm/pg-core';

// ─── chat_sessions ──────────────────────────────────────────

export const chatSessions = pgTable('chat_sessions', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id'),
  agentId: integer('agent_id'),
  userId: integer('user_id'),
  sessionToken: varchar('session_token', { length: 256 }),
  channel: varchar('channel', { length: 32 }).notNull().default('web'),
  title: varchar('title', { length: 255 }),
  context: jsonb('context'),
  status: varchar('status', { length: 32 }).notNull().default('active'),
  isPinned: boolean('is_pinned').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('cs_tenant_id_idx').on(table.tenantId),
  index('cs_agent_id_idx').on(table.agentId),
  index('cs_user_id_idx').on(table.userId),
  index('cs_session_token_idx').on(table.sessionToken),
  index('cs_status_idx').on(table.status),
]);

// ─── chat_messages ──────────────────────────────────────────

export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').notNull(),
  role: varchar('role', { length: 32 }).notNull(),
  content: jsonb('content').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('cm_session_id_idx').on(table.sessionId),
  index('cm_role_idx').on(table.role),
  index('cm_created_at_idx').on(table.createdAt),
]);

// ─── chat_actions (tool calls logged per message) ───────────

export const chatActions = pgTable('chat_actions', {
  id: serial('id').primaryKey(),
  messageId: integer('message_id').notNull(),
  sessionId: integer('session_id').notNull(),
  toolName: varchar('tool_name', { length: 255 }).notNull(),
  input: jsonb('input'),
  output: jsonb('output'),
  status: varchar('status', { length: 32 }).notNull().default('success'),
  durationMs: integer('duration_ms'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('ca_message_id_idx').on(table.messageId),
  index('ca_session_id_idx').on(table.sessionId),
]);

// ─── chat_commands ──────────────────────────────────────────

export const chatCommands = pgTable('chat_commands', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id'),
  name: varchar('name', { length: 128 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull(),
  description: text('description').notNull(),
  category: varchar('category', { length: 64 }).notNull().default('general'),
  handler: varchar('handler', { length: 128 }).notNull(),
  args: jsonb('args'),
  isBuiltIn: boolean('is_built_in').notNull().default(false),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('cc_tenant_id_idx').on(table.tenantId),
  unique('cc_slug_tenant').on(table.slug, table.tenantId),
]);

// ─── chat_skills ────────────────────────────────────────────

export const chatSkills = pgTable('chat_skills', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id'),
  name: varchar('name', { length: 128 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull(),
  description: text('description').notNull(),
  promptTemplate: text('prompt_template').notNull(),
  source: varchar('source', { length: 32 }).notNull().default('custom'),
  params: jsonb('params'),
  isBuiltIn: boolean('is_built_in').notNull().default(false),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('csk_tenant_id_idx').on(table.tenantId),
  unique('csk_slug_tenant').on(table.slug, table.tenantId),
]);

// ─── chat_hooks ─────────────────────────────────────────────

export const chatHooks = pgTable('chat_hooks', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id'),
  name: varchar('name', { length: 128 }).notNull(),
  event: varchar('event', { length: 64 }).notNull(),
  handler: jsonb('handler').notNull(),
  priority: integer('priority').notNull().default(100),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('ch_tenant_id_idx').on(table.tenantId),
  index('ch_event_idx').on(table.event),
  index('ch_priority_idx').on(table.priority),
]);

// ─── chat_mcp_connections ───────────────────────────────────

export const chatMcpConnections = pgTable('chat_mcp_connections', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id'),
  name: varchar('name', { length: 128 }).notNull(),
  transport: varchar('transport', { length: 32 }).notNull(),
  url: text('url').notNull(),
  credentials: jsonb('credentials'),
  status: varchar('status', { length: 32 }).notNull().default('disconnected'),
  discoveredTools: jsonb('discovered_tools'),
  lastConnectedAt: timestamp('last_connected_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('cmc_tenant_id_idx').on(table.tenantId),
  index('cmc_status_idx').on(table.status),
]);

// ─── chat_feedback ──────────────────────────────────────────

export const chatFeedback = pgTable('chat_feedback', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').notNull(),
  messageId: integer('message_id').notNull(),
  userId: integer('user_id'),
  rating: varchar('rating', { length: 16 }).notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('cf_session_id_idx').on(table.sessionId),
  index('cf_message_id_idx').on(table.messageId),
  unique('cf_message_user').on(table.messageId, table.userId),
]);

// ─── Composed Schema Export ─────────────────────────────────

export const chatSchema = {
  chatSessions,
  chatMessages,
  chatActions,
  chatCommands,
  chatSkills,
  chatHooks,
  chatMcpConnections,
  chatFeedback,
};

import {
  pgTable, serial, integer, varchar, text, boolean, timestamp, jsonb, index, unique,
} from 'drizzle-orm/pg-core';

// ─── agents ─────────────────────────────────────────────────

export const agents = pgTable('agents', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id'),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  description: text('description'),
  llmConfig: jsonb('llm_config'),
  systemPrompt: text('system_prompt'),
  exposedParams: jsonb('exposed_params'),
  toolBindings: jsonb('tool_bindings'),
  inputConfig: jsonb('input_config'),
  inputSchema: jsonb('input_schema'),
  workflowAgentId: integer('workflow_agent_id'),
  metadata: jsonb('metadata'),
  enabled: boolean('enabled').notNull().default(true),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('agents_tenant_id_idx').on(table.tenantId),
  index('agents_slug_idx').on(table.slug),
  index('agents_enabled_idx').on(table.enabled),
]);

// ─── agent_versions ─────────────────────────────────────────

export const agentVersions = pgTable('agent_versions', {
  id: serial('id').primaryKey(),
  agentId: integer('agent_id').notNull(),
  version: integer('version').notNull(),
  definition: jsonb('definition').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('av_agent_id_idx').on(table.agentId),
  unique('av_agent_version').on(table.agentId, table.version),
]);

// ─── agent_node_definitions ─────────────────────────────────

export const agentNodeDefinitions = pgTable('agent_node_definitions', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  category: varchar('category', { length: 64 }).notNull(),
  description: text('description'),
  inputs: jsonb('inputs'),
  outputs: jsonb('outputs'),
  config: jsonb('config'),
  code: text('code'),
  isSystem: boolean('is_system').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('and_slug_idx').on(table.slug),
  index('and_category_idx').on(table.category),
  index('and_is_system_idx').on(table.isSystem),
]);

// ─── agent_sessions ─────────────────────────────────────────

export const agentSessions = pgTable('agent_sessions', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id'),
  agentId: integer('agent_id').notNull(),
  userId: integer('user_id'),
  title: varchar('title', { length: 255 }),
  context: jsonb('context'),
  status: varchar('status', { length: 32 }).notNull().default('active'),
  isPlayground: boolean('is_playground').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('as_tenant_id_idx').on(table.tenantId),
  index('as_agent_id_idx').on(table.agentId),
  index('as_user_id_idx').on(table.userId),
  index('as_status_idx').on(table.status),
]);

// ─── agent_messages ─────────────────────────────────────────

export const agentMessages = pgTable('agent_messages', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').notNull(),
  role: varchar('role', { length: 32 }).notNull(),
  content: jsonb('content').notNull(),
  toolCalls: jsonb('tool_calls'),
  toolResults: jsonb('tool_results'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('am_session_id_idx').on(table.sessionId),
  index('am_role_idx').on(table.role),
]);

// ─── agent_executions ───────────────────────────────────────

export const agentExecutions = pgTable('agent_executions', {
  id: serial('id').primaryKey(),
  agentId: integer('agent_id').notNull(),
  sessionId: integer('session_id').notNull(),
  messageId: integer('message_id'),
  status: varchar('status', { length: 32 }).notNull().default('running'),
  llmConfig: jsonb('llm_config'),
  toolsUsed: jsonb('tools_used'),
  tokenUsage: jsonb('token_usage'),
  latencyMs: integer('latency_ms'),
  error: text('error'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
}, (table) => [
  index('ae_agent_id_idx').on(table.agentId),
  index('ae_session_id_idx').on(table.sessionId),
  index('ae_status_idx').on(table.status),
]);

// ─── Composed Schema Export ─────────────────────────────────

export const agentCoreSchema = {
  agents,
  agentVersions,
  agentNodeDefinitions,
  agentSessions,
  agentMessages,
  agentExecutions,
};

import {
  pgTable, serial, integer, varchar, text, boolean, timestamp, jsonb, index, unique,
} from 'drizzle-orm/pg-core';

// ─── agent_workflows ────────────────────────────────────────

export const agentWorkflows = pgTable('agent_workflows', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id'),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull(),
  description: text('description'),
  agentId: integer('agent_id'),
  definition: jsonb('definition').notNull(),
  agentConfig: jsonb('agent_config'),
  memoryConfig: jsonb('memory_config'),
  status: varchar('status', { length: 32 }).notNull().default('draft'),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('aw_tenant_id_idx').on(table.tenantId),
  index('aw_agent_id_idx').on(table.agentId),
  index('aw_status_idx').on(table.status),
  unique('aw_slug_tenant').on(table.slug, table.tenantId),
]);

// ─── agent_workflow_versions ────────────────────────────────

export const agentWorkflowVersions = pgTable('agent_workflow_versions', {
  id: serial('id').primaryKey(),
  workflowId: integer('workflow_id').notNull(),
  version: integer('version').notNull(),
  definition: jsonb('definition').notNull(),
  agentConfig: jsonb('agent_config'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('awv_workflow_id_idx').on(table.workflowId),
  unique('awv_workflow_version').on(table.workflowId, table.version),
]);

// ─── agent_workflow_executions ──────────────────────────────

export const agentWorkflowExecutions = pgTable('agent_workflow_executions', {
  id: serial('id').primaryKey(),
  workflowId: integer('workflow_id').notNull(),
  tenantId: integer('tenant_id'),
  status: varchar('status', { length: 32 }).notNull().default('pending'),
  triggerSource: varchar('trigger_source', { length: 128 }),
  triggerPayload: jsonb('trigger_payload'),
  context: jsonb('context').notNull().default({}),
  currentState: varchar('current_state', { length: 128 }),
  checkpoint: jsonb('checkpoint'),
  stepsExecuted: integer('steps_executed').notNull().default(0),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  error: text('error'),
}, (table) => [
  index('awe_workflow_id_idx').on(table.workflowId),
  index('awe_tenant_id_idx').on(table.tenantId),
  index('awe_status_idx').on(table.status),
]);

// ─── agent_workflow_node_executions ─────────────────────────

export const agentWorkflowNodeExecutions = pgTable('agent_workflow_node_executions', {
  id: serial('id').primaryKey(),
  executionId: integer('execution_id').notNull(),
  nodeId: varchar('node_id', { length: 128 }).notNull(),
  nodeType: varchar('node_type', { length: 64 }).notNull(),
  status: varchar('status', { length: 32 }).notNull().default('pending'),
  input: jsonb('input'),
  output: jsonb('output'),
  error: text('error'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  durationMs: integer('duration_ms'),
}, (table) => [
  index('awne_execution_id_idx').on(table.executionId),
  index('awne_node_id_idx').on(table.nodeId),
]);

// ─── agent_memory ───────────────────────────────────────────

export const agentMemory = pgTable('agent_memory', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id'),
  agentId: integer('agent_id'),
  key: varchar('key', { length: 255 }).notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata'),
  // embedding column added via raw SQL when pgvector is available
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('am_tenant_id_idx').on(table.tenantId),
  index('am_agent_id_idx').on(table.agentId),
  index('am_key_idx').on(table.key),
]);

// ─── mcp_server_definitions ─────────────────────────────────

export const mcpServerDefinitions = pgTable('mcp_server_definitions', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id'),
  workflowId: integer('workflow_id'),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull(),
  description: text('description'),
  toolDefinitions: jsonb('tool_definitions'),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('msd_tenant_id_idx').on(table.tenantId),
  index('msd_workflow_id_idx').on(table.workflowId),
  unique('msd_slug_tenant').on(table.slug, table.tenantId),
]);

// ─── Composed Schema Export ─────────────────────────────────

export const workflowAgentsSchema = {
  agentWorkflows,
  agentWorkflowVersions,
  agentWorkflowExecutions,
  agentWorkflowNodeExecutions,
  agentMemory,
  mcpServerDefinitions,
};

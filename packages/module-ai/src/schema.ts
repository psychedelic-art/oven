import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  unique,
  real,
} from 'drizzle-orm/pg-core';

// ─── AI Providers ─────────────────────────────────────────────

export const aiProviders = pgTable('ai_providers', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id'),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  type: varchar('type', { length: 32 }).notNull(),
  apiKeyEncrypted: text('api_key_encrypted'),
  baseUrl: varchar('base_url', { length: 500 }),
  defaultModel: varchar('default_model', { length: 128 }),
  rateLimitRpm: integer('rate_limit_rpm').notNull().default(60),
  rateLimitTpm: integer('rate_limit_tpm').notNull().default(100000),
  enabled: boolean('enabled').notNull().default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('ai_providers_tenant_idx').on(table.tenantId),
  index('ai_providers_slug_idx').on(table.slug),
  index('ai_providers_type_idx').on(table.type),
]);

// ─── AI Model Aliases ─────────────────────────────────────────

export const aiModelAliases = pgTable('ai_model_aliases', {
  id: serial('id').primaryKey(),
  alias: varchar('alias', { length: 128 }).notNull().unique(),
  providerId: integer('provider_id').notNull(),
  modelId: varchar('model_id', { length: 128 }).notNull(),
  type: varchar('type', { length: 32 }).notNull(),
  defaultSettings: jsonb('default_settings'),
  parametersSchema: jsonb('parameters_schema'),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('ai_aliases_alias_idx').on(table.alias),
  index('ai_aliases_provider_idx').on(table.providerId),
]);

// ─── AI Vector Stores ─────────────────────────────────────────

export const aiVectorStores = pgTable('ai_vector_stores', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull(),
  adapter: varchar('adapter', { length: 32 }).notNull(),
  connectionConfig: jsonb('connection_config'),
  embeddingProviderId: integer('embedding_provider_id'),
  embeddingModel: varchar('embedding_model', { length: 128 }),
  dimensions: integer('dimensions').notNull().default(1536),
  distanceMetric: varchar('distance_metric', { length: 32 }).notNull().default('cosine'),
  documentCount: integer('document_count').notNull().default(0),
  enabled: boolean('enabled').notNull().default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('ai_vs_tenant_idx').on(table.tenantId),
  index('ai_vs_slug_idx').on(table.slug),
  unique('ai_vs_tenant_slug').on(table.tenantId, table.slug),
]);

// ─── AI Usage Logs ────────────────────────────────────────────

export const aiUsageLogs = pgTable('ai_usage_logs', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  providerId: integer('provider_id'),
  modelId: varchar('model_id', { length: 128 }),
  toolName: varchar('tool_name', { length: 128 }),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  totalTokens: integer('total_tokens').notNull().default(0),
  costCents: real('cost_cents').notNull().default(0),
  latencyMs: integer('latency_ms'),
  status: varchar('status', { length: 32 }),
  requestMetadata: jsonb('request_metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('ai_usage_tenant_idx').on(table.tenantId),
  index('ai_usage_provider_idx').on(table.providerId),
  index('ai_usage_created_idx').on(table.createdAt),
]);

// ─── AI Budgets ───────────────────────────────────────────────

export const aiBudgets = pgTable('ai_budgets', {
  id: serial('id').primaryKey(),
  scope: varchar('scope', { length: 32 }).notNull(),
  scopeId: varchar('scope_id', { length: 128 }),
  periodType: varchar('period_type', { length: 32 }).notNull(),
  tokenLimit: integer('token_limit').notNull(),
  costLimitCents: integer('cost_limit_cents').notNull(),
  currentTokens: integer('current_tokens').notNull().default(0),
  currentCostCents: integer('current_cost_cents').notNull().default(0),
  alertThresholdPct: integer('alert_threshold_pct').notNull().default(80),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('ai_budgets_scope_idx').on(table.scope, table.scopeId),
]);

// ─── AI Budget Alerts ─────────────────────────────────────────

export const aiBudgetAlerts = pgTable('ai_budget_alerts', {
  id: serial('id').primaryKey(),
  budgetId: integer('budget_id').notNull(),
  type: varchar('type', { length: 32 }).notNull(),
  message: text('message'),
  acknowledged: boolean('acknowledged').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('ai_alerts_budget_idx').on(table.budgetId),
]);

// ─── AI Tools ─────────────────────────────────────────────────

export const aiTools = pgTable('ai_tools', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  category: varchar('category', { length: 64 }),
  description: text('description'),
  inputSchema: jsonb('input_schema'),
  outputSchema: jsonb('output_schema'),
  handler: varchar('handler', { length: 255 }),
  isSystem: boolean('is_system').notNull().default(false),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── AI Guardrails ────────────────────────────────────────────

export const aiGuardrails = pgTable('ai_guardrails', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id'),
  name: varchar('name', { length: 128 }).notNull(),
  ruleType: varchar('rule_type', { length: 32 }).notNull(),
  pattern: text('pattern').notNull(),
  scope: varchar('scope', { length: 32 }).notNull(),
  action: varchar('action', { length: 32 }).notNull(),
  message: text('message'),
  priority: integer('priority').notNull().default(0),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('ai_guardrails_tenant_idx').on(table.tenantId),
  index('ai_guardrails_type_idx').on(table.ruleType),
]);

// ─── AI Playground Executions ─────────────────────────────────

export const aiPlaygroundExecutions = pgTable('ai_playground_executions', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id'),
  type: varchar('type', { length: 32 }).notNull(), // text, embedding, image, structured-output
  model: varchar('model', { length: 128 }),
  input: jsonb('input').notNull(),
  output: jsonb('output'),
  status: varchar('status', { length: 32 }).notNull().default('completed'),
  tokenUsage: jsonb('token_usage'),
  costCents: integer('cost_cents').default(0),
  latencyMs: integer('latency_ms'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('ai_pe_tenant_idx').on(table.tenantId),
  index('ai_pe_type_idx').on(table.type),
  index('ai_pe_created_idx').on(table.createdAt),
]);

// ─── Schema export ────────────────────────────────────────────

export const aiSchema = {
  aiProviders,
  aiModelAliases,
  aiVectorStores,
  aiUsageLogs,
  aiBudgets,
  aiBudgetAlerts,
  aiTools,
  aiGuardrails,
  aiPlaygroundExecutions,
};

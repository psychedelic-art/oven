# Module AI -- Database Schema

> 8 tables with column-level documentation, index rationale, and relationship diagram.

---

## Table Overview

| Table | Purpose | Tenant-Scoped | Row Volume |
|-------|---------|--------------|------------|
| `ai_providers` | AI provider configurations with encrypted credentials | Optional (nullable tenantId) | Low (5-20) |
| `ai_model_aliases` | Friendly names mapping to provider:model pairs | No (global) | Low (10-30) |
| `ai_vector_stores` | Vector database store configurations | Yes | Low-Medium (10-100) |
| `ai_usage_logs` | Per-call usage tracking (append-only) | Yes | High (millions) |
| `ai_budgets` | Spending limits by scope and period | No (scoped via scope/scopeId) | Low (10-50) |
| `ai_budget_alerts` | Alert history for budget threshold events | No | Low-Medium |
| `ai_tools` | Registered AI tool definitions with Zod schemas | No (global) | Low (20-50) |
| `ai_guardrails` | Content filtering rules for input/output | Optional (nullable tenantId) | Low (10-50) |

---

## Relationship Diagram

```
  ai_providers (1)
       |
       +---< ai_model_aliases (N)        alias.providerId --> provider.id
       |
       +---< ai_vector_stores (N)        store.embeddingProviderId --> provider.id
       |
       +---< ai_usage_logs (N)           log.providerId --> provider.id
       |
       +---< ai_budgets (N)              budget.scopeId --> provider.id
       |                                  (when scope = 'provider')

  ai_budgets (1)
       |
       +---< ai_budget_alerts (N)        alert.budgetId --> budget.id

  ai_tools                               standalone (no FKs)
  ai_guardrails                          standalone (no FKs)
```

**Note**: All foreign keys are plain `integer()` columns, not Drizzle `references()`, per module-rules Rule 4.3. Referential integrity is enforced at the application layer.

---

## Table: ai_providers

Configured AI providers with encrypted credentials and rate limits.

```typescript
export const aiProviders = pgTable('ai_providers', {
  id:               serial('id').primaryKey(),
  tenantId:         integer('tenant_id'),
  name:             varchar('name', { length: 255 }).notNull(),
  slug:             varchar('slug', { length: 128 }).notNull().unique(),
  type:             varchar('type', { length: 64 }).notNull(),
  apiKeyEncrypted:  text('api_key_encrypted').notNull(),
  baseUrl:          varchar('base_url', { length: 512 }),
  defaultModel:     varchar('default_model', { length: 128 }),
  rateLimitRpm:     integer('rate_limit_rpm'),
  rateLimitTpm:     integer('rate_limit_tpm'),
  enabled:          boolean('enabled').notNull().default(true),
  metadata:         jsonb('metadata'),
  createdAt:        timestamp('created_at').defaultNow().notNull(),
  updatedAt:        timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('aip_tenant_id_idx').on(table.tenantId),
  index('aip_slug_idx').on(table.slug),
  index('aip_type_idx').on(table.type),
  index('aip_enabled_idx').on(table.enabled),
]);
```

### Column Details

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | serial | No | auto | Primary key |
| `tenantId` | integer | Yes | null | Null = platform-wide provider. Set = tenant-scoped (bring-your-own-key). FK to tenants.id |
| `name` | varchar(255) | No | -- | Human-readable display name (e.g., "OpenAI Production") |
| `slug` | varchar(128) | No | -- | Unique machine identifier (e.g., "openai"). Used in provider:model notation |
| `type` | varchar(64) | No | -- | AI SDK provider package name: `openai`, `anthropic`, `google`, `custom`. Determines which `@ai-sdk/*` package to use |
| `apiKeyEncrypted` | text | No | -- | API key encrypted with AES-256-GCM. Never returned in GET responses (masked as `"sk-...xxxx"`) |
| `baseUrl` | varchar(512) | Yes | null | Custom API endpoint URL. Used for self-hosted models, proxy endpoints, or Azure OpenAI |
| `defaultModel` | varchar(128) | Yes | null | Default model ID when caller doesn't specify. Used as last-resort fallback in model resolution |
| `rateLimitRpm` | integer | Yes | null | Maximum requests per minute. Null = no limit. Enforced by rate limiting middleware |
| `rateLimitTpm` | integer | Yes | null | Maximum tokens per minute. Null = no limit. Applied across all models for this provider |
| `enabled` | boolean | No | true | Disabled providers are skipped during resolution. Allows temporary suspension without deleting config |
| `metadata` | jsonb | Yes | null | Provider-specific configuration. Examples: `{ "organization": "org-xxx" }` for OpenAI, `{ "projectId": "..." }` for Google |
| `createdAt` | timestamp | No | now() | Record creation time |
| `updatedAt` | timestamp | No | now() | Last modification time |

### Index Rationale

| Index | Columns | Purpose |
|-------|---------|---------|
| `aip_tenant_id_idx` | tenantId | Filter providers by tenant (show platform + tenant-scoped) |
| `aip_slug_idx` | slug | Fast lookup by slug during provider resolution (unique constraint also creates an index, but explicit for clarity) |
| `aip_type_idx` | type | Filter by provider type in dashboard list |
| `aip_enabled_idx` | enabled | Exclude disabled providers during resolution |

---

## Table: ai_model_aliases

Custom model aliases mapping friendly names to provider:model pairs.

```typescript
export const aiModelAliases = pgTable('ai_model_aliases', {
  id:               serial('id').primaryKey(),
  alias:            varchar('alias', { length: 128 }).notNull().unique(),
  providerId:       integer('provider_id').notNull(),
  modelId:          varchar('model_id', { length: 128 }).notNull(),
  type:             varchar('type', { length: 32 }).notNull(),
  defaultSettings:  jsonb('default_settings'),
  enabled:          boolean('enabled').notNull().default(true),
  createdAt:        timestamp('created_at').defaultNow().notNull(),
  updatedAt:        timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('ama_provider_id_idx').on(table.providerId),
  index('ama_type_idx').on(table.type),
  index('ama_enabled_idx').on(table.enabled),
]);
```

### Column Details

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | serial | No | auto | Primary key |
| `alias` | varchar(128) | No | -- | Unique alias name (e.g., "fast", "smart", "cheap"). Used in API calls as model identifier |
| `providerId` | integer | No | -- | FK to ai_providers.id. Determines which provider to use when this alias is resolved |
| `modelId` | varchar(128) | No | -- | Provider-specific model identifier (e.g., "gpt-4o-mini", "claude-sonnet-4-20250514") |
| `type` | varchar(32) | No | -- | Model type: `text` (language model), `embedding`, `image`, `object` (structured output). Determines which resolution pool the alias belongs to |
| `defaultSettings` | jsonb | Yes | null | Default parameters applied when this alias is used. Schema: `{ temperature?: number, maxTokens?: number, topP?: number, frequencyPenalty?: number, presencePenalty?: number }` |
| `enabled` | boolean | No | true | Disabled aliases are skipped during resolution (fall through to next strategy) |
| `createdAt` | timestamp | No | now() | Record creation time |
| `updatedAt` | timestamp | No | now() | Last modification time |

### Index Rationale

| Index | Columns | Purpose |
|-------|---------|---------|
| `ama_provider_id_idx` | providerId | Find all aliases for a provider (cascade check on provider delete) |
| `ama_type_idx` | type | Filter aliases by model type in dashboard |
| `ama_enabled_idx` | enabled | Exclude disabled aliases during resolution |

---

## Table: ai_vector_stores

Vector database store configurations with adapter-specific connection details.

```typescript
export const aiVectorStores = pgTable('ai_vector_stores', {
  id:                   serial('id').primaryKey(),
  tenantId:             integer('tenant_id').notNull(),
  name:                 varchar('name', { length: 255 }).notNull(),
  slug:                 varchar('slug', { length: 128 }).notNull().unique(),
  adapter:              varchar('adapter', { length: 32 }).notNull(),
  connectionConfig:     jsonb('connection_config').notNull(),
  embeddingProviderId:  integer('embedding_provider_id'),
  embeddingModel:       varchar('embedding_model', { length: 128 }),
  dimensions:           integer('dimensions').notNull(),
  distanceMetric:       varchar('distance_metric', { length: 32 }).notNull().default('cosine'),
  documentCount:        integer('document_count').notNull().default(0),
  enabled:              boolean('enabled').notNull().default(true),
  metadata:             jsonb('metadata'),
  createdAt:            timestamp('created_at').defaultNow().notNull(),
  updatedAt:            timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('avs_tenant_id_idx').on(table.tenantId),
  index('avs_slug_idx').on(table.slug),
  index('avs_adapter_idx').on(table.adapter),
  index('avs_enabled_idx').on(table.enabled),
]);
```

### Column Details

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | serial | No | auto | Primary key |
| `tenantId` | integer | No | -- | FK to tenants.id. Every vector store belongs to a tenant. |
| `name` | varchar(255) | No | -- | Human-readable name (e.g., "Knowledge Base", "Product Catalog") |
| `slug` | varchar(128) | No | -- | Unique identifier used in API paths (`/api/ai-vector-stores/{slug}/query`) |
| `adapter` | varchar(32) | No | -- | Backend adapter: `pgvector` or `pinecone`. Determines which VectorStoreAdapter is used |
| `connectionConfig` | jsonb | No | -- | Adapter-specific connection params. **Encrypted at rest.** For pgvector: `{ tableName, schema }`. For Pinecone: `{ apiKey, environment, indexName, namespace }` |
| `embeddingProviderId` | integer | Yes | null | FK to ai_providers.id. Provider used for auto-embedding when queries contain text instead of vectors |
| `embeddingModel` | varchar(128) | Yes | null | Embedding model ID (e.g., "text-embedding-3-small"). Must match provider's available models |
| `dimensions` | integer | No | -- | Vector dimensionality. Must match the embedding model's output dimensions (e.g., 1536 for text-embedding-3-small) |
| `distanceMetric` | varchar(32) | No | cosine | Distance function: `cosine` (normalized, most common), `euclidean` (L2), `dotProduct` (inner product). Must match the index type in the backend |
| `documentCount` | integer | No | 0 | Running count of vectors stored. Updated on upsert/delete operations. Approximate for Pinecone |
| `enabled` | boolean | No | true | Disabled stores reject all operations with 503 |
| `metadata` | jsonb | Yes | null | Additional store-level metadata. Examples: `{ metadataSchema: {...}, chunkConfig: {...} }` |
| `createdAt` | timestamp | No | now() | Record creation time |
| `updatedAt` | timestamp | No | now() | Last modification time |

### Connection Config Schemas by Adapter

**pgvector**:
```json
{
  "tableName": "kb_vectors",
  "schema": "public",
  "indexType": "hnsw",
  "indexParams": { "m": 16, "efConstruction": 64 }
}
```

**Pinecone**:
```json
{
  "apiKey": "pc-...",
  "environment": "us-east-1",
  "indexName": "knowledge-base",
  "namespace": "tenant-5"
}
```

---

## Table: ai_usage_logs

Per-call usage tracking. Append-only, high-volume table.

```typescript
export const aiUsageLogs = pgTable('ai_usage_logs', {
  id:                serial('id').primaryKey(),
  tenantId:          integer('tenant_id'),
  providerId:        integer('provider_id'),
  modelId:           varchar('model_id', { length: 128 }),
  toolName:          varchar('tool_name', { length: 128 }),
  inputTokens:       integer('input_tokens'),
  outputTokens:      integer('output_tokens'),
  totalTokens:       integer('total_tokens'),
  costCents:         integer('cost_cents'),
  latencyMs:         integer('latency_ms'),
  status:            varchar('status', { length: 32 }).notNull(),
  requestMetadata:   jsonb('request_metadata'),
  createdAt:         timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('aul_tenant_id_idx').on(table.tenantId),
  index('aul_provider_id_idx').on(table.providerId),
  index('aul_model_id_idx').on(table.modelId),
  index('aul_tool_name_idx').on(table.toolName),
  index('aul_status_idx').on(table.status),
  index('aul_created_at_idx').on(table.createdAt),
]);
```

### Column Details

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | serial | No | auto | Primary key |
| `tenantId` | integer | Yes | null | FK to tenants.id. Null for platform-level operations |
| `providerId` | integer | Yes | null | FK to ai_providers.id. Which provider served this request |
| `modelId` | varchar(128) | Yes | null | Specific model used (e.g., "gpt-4o-mini"). Null if call failed before model resolution |
| `toolName` | varchar(128) | Yes | null | Tool invoked (e.g., "ai.generateText", "ai.embed"). Enables per-tool usage analysis |
| `inputTokens` | integer | Yes | null | Number of input/prompt tokens. Null for non-token operations (image gen) |
| `outputTokens` | integer | Yes | null | Number of output/completion tokens |
| `totalTokens` | integer | Yes | null | Sum of input + output tokens |
| `costCents` | integer | Yes | null | Estimated upstream cost in cents. Calculated from model pricing table |
| `latencyMs` | integer | Yes | null | End-to-end latency in milliseconds (including network) |
| `status` | varchar(32) | No | -- | Outcome: `success`, `error`, `rate_limited`, `guardrail_blocked`, `budget_exceeded` |
| `requestMetadata` | jsonb | Yes | null | Additional context: `{ userId, agentId, sessionId, error, imageSize, audioDurationSec }` |
| `createdAt` | timestamp | No | now() | When the call was made. Primary dimension for time-series queries |

**Note**: This table has no `updatedAt` -- it is append-only. Rows are never updated after creation.

### Index Rationale

| Index | Columns | Purpose |
|-------|---------|---------|
| `aul_tenant_id_idx` | tenantId | Filter usage by tenant (most common query pattern) |
| `aul_provider_id_idx` | providerId | Usage breakdown by provider |
| `aul_model_id_idx` | modelId | Usage breakdown by model |
| `aul_tool_name_idx` | toolName | Usage breakdown by tool type |
| `aul_status_idx` | status | Filter for errors, rate limits |
| `aul_created_at_idx` | createdAt | Time-range queries for dashboards and retention cleanup |

### Performance Considerations

This is the highest-volume table in module-ai. At scale:

- **Partitioning**: Consider range-partitioning by `createdAt` (monthly partitions) when the table exceeds 10M rows.
- **Retention**: The `USAGE_LOG_RETENTION_DAYS` config key (default 90) drives a cleanup job that deletes old rows.
- **Aggregation**: The `/api/ai/usage/summary` endpoint uses `GROUP BY` with date functions. For real-time dashboards, consider a materialized view refreshed on a schedule.

---

## Table: ai_budgets

Spending limits by scope (global, tenant, agent, provider) and period.

```typescript
export const aiBudgets = pgTable('ai_budgets', {
  id:                serial('id').primaryKey(),
  scope:             varchar('scope', { length: 32 }).notNull(),
  scopeId:           integer('scope_id'),
  periodType:        varchar('period_type', { length: 16 }).notNull(),
  tokenLimit:        integer('token_limit'),
  costLimitCents:    integer('cost_limit_cents'),
  currentTokens:     integer('current_tokens').notNull().default(0),
  currentCostCents:  integer('current_cost_cents').notNull().default(0),
  alertThresholdPct: integer('alert_threshold_pct').notNull().default(80),
  enabled:           boolean('enabled').notNull().default(true),
  createdAt:         timestamp('created_at').defaultNow().notNull(),
  updatedAt:         timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('aub_scope_idx').on(table.scope),
  index('aub_scope_id_idx').on(table.scopeId),
  index('aub_period_type_idx').on(table.periodType),
  index('aub_enabled_idx').on(table.enabled),
]);
```

### Column Details

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | serial | No | auto | Primary key |
| `scope` | varchar(32) | No | -- | Budget scope: `global` (platform-wide), `tenant`, `agent`, `provider`. Determines what entity is limited |
| `scopeId` | integer | Yes | null | FK to the scoped entity. Null when scope=global. For tenant: tenants.id. For agent: agents.id. For provider: ai_providers.id |
| `periodType` | varchar(16) | No | -- | Reset period: `daily`, `weekly`, `monthly`. Counters reset at period boundary |
| `tokenLimit` | integer | Yes | null | Maximum tokens allowed per period. Null = no token limit (only cost limit applies) |
| `costLimitCents` | integer | Yes | null | Maximum cost in cents per period. Null = no cost limit (only token limit applies) |
| `currentTokens` | integer | No | 0 | Rolling token counter for current period. Reset to 0 at period boundary |
| `currentCostCents` | integer | No | 0 | Rolling cost counter for current period. Reset to 0 at period boundary |
| `alertThresholdPct` | integer | No | 80 | Percentage threshold to trigger a warning alert (0-100). E.g., 80 means alert at 80% utilization |
| `enabled` | boolean | No | true | Disabled budgets are not enforced (calls proceed regardless of counters) |
| `createdAt` | timestamp | No | now() | Record creation time |
| `updatedAt` | timestamp | No | now() | Last counter update time |

### Budget Scope Examples

| Scope | scopeId | Meaning |
|-------|---------|---------|
| `global` | null | Platform-wide budget across all tenants and providers |
| `tenant` | 42 | Budget for tenant 42 across all providers |
| `provider` | 1 | Budget for provider 1 (OpenAI) across all tenants |
| `agent` | 15 | Budget for agent 15 across all providers |

---

## Table: ai_budget_alerts

Alert history for budget threshold events.

```typescript
export const aiBudgetAlerts = pgTable('ai_budget_alerts', {
  id:            serial('id').primaryKey(),
  budgetId:      integer('budget_id').notNull(),
  type:          varchar('type', { length: 32 }).notNull(),
  message:       text('message').notNull(),
  acknowledged:  boolean('acknowledged').notNull().default(false),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('aba_budget_id_idx').on(table.budgetId),
  index('aba_type_idx').on(table.type),
  index('aba_acknowledged_idx').on(table.acknowledged),
]);
```

### Column Details

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | serial | No | auto | Primary key |
| `budgetId` | integer | No | -- | FK to ai_budgets.id. Which budget triggered this alert |
| `type` | varchar(32) | No | -- | Alert type: `warning` (threshold reached) or `exceeded` (limit surpassed) |
| `message` | text | No | -- | Human-readable message: "Tenant 'Acme' monthly budget at 82% (410,000 / 500,000 tokens)" |
| `acknowledged` | boolean | No | false | Whether an admin has acknowledged this alert. Prevents repeated notifications |
| `createdAt` | timestamp | No | now() | When the alert was generated |

---

## Table: ai_tools

Registered AI tool definitions with Zod-derived schemas.

```typescript
export const aiTools = pgTable('ai_tools', {
  id:            serial('id').primaryKey(),
  name:          varchar('name', { length: 128 }).notNull().unique(),
  slug:          varchar('slug', { length: 128 }).notNull().unique(),
  category:      varchar('category', { length: 64 }).notNull(),
  description:   text('description').notNull(),
  inputSchema:   jsonb('input_schema').notNull(),
  outputSchema:  jsonb('output_schema'),
  handler:       varchar('handler', { length: 128 }).notNull(),
  isSystem:      boolean('is_system').notNull().default(false),
  enabled:       boolean('enabled').notNull().default(true),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
  updatedAt:     timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('ait_category_idx').on(table.category),
  index('ait_is_system_idx').on(table.isSystem),
  index('ait_enabled_idx').on(table.enabled),
]);
```

### Column Details

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | serial | No | auto | Primary key |
| `name` | varchar(128) | No | -- | Unique tool identifier (e.g., "ai.generateText", "ai.embed"). Used in API calls and agent bindings |
| `slug` | varchar(128) | No | -- | URL-safe unique slug (e.g., "ai-generate-text"). Used for React Admin resource routing |
| `category` | varchar(64) | No | -- | Tool category: `language`, `embedding`, `image`, `vector`, `document`, `speech` |
| `description` | text | No | -- | What this tool does. Used by LLMs for tool selection in agent workflows |
| `inputSchema` | jsonb | No | -- | JSON Schema for tool input validation. Derived from Zod schema at registration time |
| `outputSchema` | jsonb | Yes | null | JSON Schema for tool output typing. Null for tools with unstructured output |
| `handler` | varchar(128) | No | -- | Internal handler function name or endpoint path that executes this tool |
| `isSystem` | boolean | No | false | System tools are seeded by the module and cannot be deleted by users |
| `enabled` | boolean | No | true | Disabled tools are hidden from the catalog and reject invocations |
| `createdAt` | timestamp | No | now() | Record creation time |
| `updatedAt` | timestamp | No | now() | Last modification time |

---

## Table: ai_guardrails

Content filtering rules for AI inputs and outputs.

```typescript
export const aiGuardrails = pgTable('ai_guardrails', {
  id:          serial('id').primaryKey(),
  tenantId:    integer('tenant_id'),
  name:        varchar('name', { length: 255 }).notNull(),
  ruleType:    varchar('rule_type', { length: 32 }).notNull(),
  pattern:     text('pattern').notNull(),
  scope:       varchar('scope', { length: 16 }).notNull(),
  action:      varchar('action', { length: 16 }).notNull(),
  message:     text('message'),
  priority:    integer('priority').notNull().default(100),
  enabled:     boolean('enabled').notNull().default(true),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('agr_tenant_id_idx').on(table.tenantId),
  index('agr_rule_type_idx').on(table.ruleType),
  index('agr_scope_idx').on(table.scope),
  index('agr_enabled_idx').on(table.enabled),
  index('agr_priority_idx').on(table.priority),
]);
```

### Column Details

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | serial | No | auto | Primary key |
| `tenantId` | integer | Yes | null | Null = global rule (applies to all tenants). Set = tenant-specific rule. Global + tenant rules merge at evaluation |
| `name` | varchar(255) | No | -- | Human-readable rule name (e.g., "Block PII in prompts", "Filter profanity in output") |
| `ruleType` | varchar(32) | No | -- | Rule detection method: `keyword` (simple string match), `regex` (pattern match), `classifier` (AI-based classification) |
| `pattern` | text | No | -- | The detection pattern. For keyword: comma-separated words. For regex: regular expression. For classifier: classifier model ID or name |
| `scope` | varchar(16) | No | -- | When to apply: `input` (check prompts before sending to provider), `output` (check responses before returning to caller), `both` |
| `action` | varchar(16) | No | -- | What to do on match: `block` (reject request/response with 422), `warn` (log warning, proceed), `modify` (redact matched content, proceed) |
| `message` | text | Yes | null | Custom message returned to caller on block action. Default message used if null |
| `priority` | integer | No | 100 | Rule evaluation order. Lower number = higher priority. First matching block rule wins |
| `enabled` | boolean | No | true | Disabled rules are skipped during evaluation |
| `createdAt` | timestamp | No | now() | Record creation time |
| `updatedAt` | timestamp | No | now() | Last modification time |

### Guardrail Examples

| Name | Type | Pattern | Scope | Action |
|------|------|---------|-------|--------|
| Block PII | regex | `\b\d{3}-\d{2}-\d{4}\b` (SSN pattern) | input | block |
| Filter profanity | keyword | `word1,word2,word3` | output | modify |
| Detect jailbreak | classifier | `prompt-injection-v1` | input | block |
| Warn on competitor mention | keyword | `competitor1,competitor2` | output | warn |

---

## Schema Composition

All 8 tables are exported in the module's `schema` property and composed into the global schema via `registry.getComposedSchema()`:

```typescript
// packages/module-ai/src/schema.ts
export {
  aiProviders,
  aiModelAliases,
  aiVectorStores,
  aiUsageLogs,
  aiBudgets,
  aiBudgetAlerts,
  aiTools,
  aiGuardrails,
};

// packages/module-ai/src/index.ts
export const aiModule: ModuleDefinition = {
  name: 'ai',
  schema: {
    aiProviders,
    aiModelAliases,
    aiVectorStores,
    aiUsageLogs,
    aiBudgets,
    aiBudgetAlerts,
    aiTools,
    aiGuardrails,
  },
  // ...
};
```

---

## Migration Notes

- **pgvector extension**: Must be enabled separately via `/api/ai/extensions/install` before creating pgvector-backed vector stores. The extension is not part of the Drizzle migration.
- **Encryption**: The `apiKeyEncrypted` and `connectionConfig` columns store AES-256-GCM ciphertext. The encryption key is read from the `AI_ENCRYPTION_KEY` environment variable.
- **Retention**: The `ai_usage_logs` table grows unbounded. A retention cleanup job (configurable via `USAGE_LOG_RETENTION_DAYS`) should be scheduled to delete old rows.

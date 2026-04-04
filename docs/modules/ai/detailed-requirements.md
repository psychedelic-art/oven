# Module AI -- Detailed Requirements

> Functional requirements with acceptance criteria, priority, and use-case cross-references.

---

## Priority Legend

| Priority | Meaning |
|----------|---------|
| **P0** | Must-have for Phase 1 launch. Module is non-functional without it. |
| **P1** | Required for production readiness. Can be delivered shortly after Phase 1. |
| **P2** | Enhancement. Improves experience but system works without it. |

---

## FR-AI-001: Provider Management

**Description**: Administrators can create, read, update, and delete AI provider configurations. Each provider stores connection credentials, default models, rate limits, and enabled status. Providers can be global (platform-wide) or tenant-scoped.

**Priority**: P0

**Use-Case Cross-Reference**: UC-4 (Set Up Provider Credentials), UC-10 (Add a New Provider)

### Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | Admin can create a provider with name, slug, type, API key, and optional base URL | POST /api/ai-providers returns 201 with created record |
| 2 | API key is encrypted at rest using AES-256-GCM before storage | DB column contains ciphertext, not plaintext |
| 3 | GET responses mask the API key (return `"sk-...xxxx"` format) | GET /api/ai-providers/[id] never returns full key |
| 4 | Admin can update provider config without re-entering the API key | PUT with `apiKey: null` preserves existing key |
| 5 | Admin can delete a provider. Deletion fails if aliases reference it. | DELETE returns 409 if aliases exist, 204 otherwise |
| 6 | Admin can disable a provider without deleting it | PUT with `enabled: false` returns 200 |
| 7 | Provider list supports tenant filtering (show platform + tenant-scoped) | GET with `tenantId` header returns filtered results |
| 8 | Slug must be unique | POST with duplicate slug returns 409 |
| 9 | Provider type must be a supported AI SDK provider | POST with unknown type returns 422 |
| 10 | Provider CRUD emits lifecycle events | `ai.provider.created`, `.updated`, `.deleted` events fire |

---

## FR-AI-002: Model Alias Registry

**Description**: Administrators can create model aliases that map friendly names (e.g., `fast`, `smart`, `cheap`) to specific provider:model combinations. Aliases include optional default settings (temperature, maxTokens) applied when the alias is used.

**Priority**: P0

**Use-Case Cross-Reference**: UC-8 (Override Config)

### Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | Admin can create an alias with name, provider, model ID, and type | POST /api/ai-aliases returns 201 |
| 2 | Alias names must be unique | POST with duplicate alias returns 409 |
| 3 | Alias can specify default settings (JSONB: temperature, maxTokens, etc.) | Settings stored and returned correctly |
| 4 | Alias resolution returns the provider instance + model ID | Internal ModelResolver.resolve("fast") returns correct pair |
| 5 | Disabled aliases are skipped during resolution | Alias with `enabled: false` falls through to next strategy |
| 6 | Deleting a provider cascades to disable (not delete) its aliases | Aliases become orphaned but not lost |
| 7 | Alias type must be one of: text, embedding, image, object | POST with invalid type returns 422 |
| 8 | Alias list supports filtering by type and provider | GET with query params returns filtered results |

---

## FR-AI-003: Text Generation

**Description**: Callers can generate text using any configured language model via a single API endpoint. The endpoint supports model aliases, direct provider:model notation, and default model resolution.

**Priority**: P0

**Use-Case Cross-Reference**: N/A (core capability)

### Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | POST /api/ai/generate accepts model, prompt, system, temperature, maxTokens | Request body validated by Zod schema |
| 2 | Model parameter supports aliases ("fast"), direct ("openai:gpt-4o"), and null (use default) | All three formats resolve correctly |
| 3 | Response includes generated text, usage (inputTokens, outputTokens), and finishReason | Response body matches schema |
| 4 | Usage is logged in ai_usage_logs with all attribution fields | DB row created with correct values |
| 5 | Request respects provider rate limits | Exceeding RPM returns 429 with Retry-After header |
| 6 | Request respects tenant budget limits | Exceeding budget returns 429 with explanation |
| 7 | Error from upstream provider returns 502 with provider error details | Error response includes provider, model, error message |
| 8 | Timeout is configurable and defaults to 30 seconds | Request aborts after timeout, logs timeout status |

---

## FR-AI-004: Embeddings

**Description**: Callers can generate vector embeddings for single or batch text inputs using configured embedding models. Embeddings are used by vector stores, knowledge base, and RAG workflows.

**Priority**: P0

**Use-Case Cross-Reference**: N/A (core capability, enables FR-AI-008)

### Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | POST /api/ai/embed accepts model and value (string) | Single text embedded successfully |
| 2 | POST /api/ai/embed-many accepts model and values (string[]) | Batch embedding returns array of vectors |
| 3 | Default embedding model resolved from config cascade if not specified | Uses DEFAULT_EMBEDDING_MODEL from module-config |
| 4 | Response includes the embedding vector(s) and usage stats | Vectors are number arrays of correct dimension |
| 5 | Embedding dimension matches the model's native dimension | text-embedding-3-small returns 1536-dim vectors |
| 6 | Batch embedding respects provider batch size limits | Large batches auto-chunked to provider max |
| 7 | Usage tracked with separate `ai-embedding-tokens` service slug | ai_usage_logs row + subscription metering |

---

## FR-AI-005: Image Generation

**Description**: Callers can generate images from text prompts using configured image generation models (DALL-E, Imagen, etc.). Provider-specific options (size, quality, style) are supported.

**Priority**: P1

**Use-Case Cross-Reference**: N/A (extended capability)

### Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | POST /api/ai/generate-image accepts prompt, model, size, quality, style | Request validated |
| 2 | Response includes generated image URL(s) or base64 data | At least one image returned |
| 3 | Provider-specific options are passed through correctly | DALL-E receives size, quality, style |
| 4 | Usage tracked with `ai-image-generation` service slug | ai_usage_logs row with image metadata |
| 5 | Cost calculated per image based on model + size + quality | costCents populated correctly |
| 6 | Request respects budget limits for image generation | Budget check before generation |

---

## FR-AI-006: Structured Output

**Description**: Callers can generate structured objects that conform to a provided JSON Schema (Zod-derived). The AI SDK's structured output mode ensures the response is valid JSON matching the schema.

**Priority**: P0

**Use-Case Cross-Reference**: N/A (core capability, used by agents)

### Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | POST /api/ai/generate-object accepts model, prompt, schema (JSON Schema) | Request validated |
| 2 | Response is a valid JSON object conforming to the provided schema | Output validates against input schema |
| 3 | Streaming variant (POST /api/ai/stream-object) returns SSE with partial objects | Compatible with @ai-sdk/react useObject |
| 4 | Schema validation errors from the AI SDK are returned as 422 | Error includes schema path and violation |
| 5 | Usage tracked as text generation (same token counting) | ai_usage_logs row with tool name |

---

## FR-AI-007: Vector Store Management

**Description**: Administrators can create, read, update, and delete vector store configurations. Each store specifies a backend adapter (pgvector or Pinecone), embedding model, dimensions, and distance metric.

**Priority**: P0

**Use-Case Cross-Reference**: N/A (enables FR-AI-008)

### Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | Admin can create a vector store with name, slug, adapter, connection config | POST /api/ai-vector-stores returns 201 |
| 2 | Connection config is encrypted at rest | DB column contains ciphertext |
| 3 | Adapter must be one of: pgvector, pinecone | POST with invalid adapter returns 422 |
| 4 | Dimensions must be a positive integer matching the embedding model | Validation on create/update |
| 5 | Distance metric must be one of: cosine, euclidean, dotProduct | POST with invalid metric returns 422 |
| 6 | Admin can disable a store without deleting it | PUT with `enabled: false` |
| 7 | Slug must be unique | POST with duplicate slug returns 409 |
| 8 | Store creation emits `ai.vectorStore.created` event | Event payload includes id, slug, adapter |
| 9 | Deleting a store with documents warns but proceeds | DELETE returns 200 with warning |
| 10 | Document count is tracked and returned in store info | `documentCount` field updated on upsert/delete |

---

## FR-AI-008: Vector Store Operations

**Description**: Callers can upsert, query, and delete vectors in any configured vector store. Operations are abstracted through the VectorStoreAdapter interface -- callers do not need to know which backend is in use.

**Priority**: P0

**Use-Case Cross-Reference**: N/A (core capability for RAG)

### Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | POST /api/ai-vector-stores/[slug]/upsert accepts vectors with IDs, values, and metadata | Vectors stored in backend |
| 2 | POST /api/ai-vector-stores/[slug]/query accepts text or vector, returns top-K matches | Results include id, score, metadata |
| 3 | Text queries auto-embed using the store's configured embedding model | Embedding happens transparently |
| 4 | POST /api/ai-vector-stores/[slug]/delete accepts IDs or filter | Vectors removed from backend |
| 5 | Metadata filtering is supported in queries | Filter syntax works on both pgvector and Pinecone |
| 6 | pgvector adapter uses the configured distance metric | cosine/euclidean/dotProduct applied correctly |
| 7 | Pinecone adapter uses the configured namespace (from connection config) | Namespace isolation works |
| 8 | Usage tracked with `ai-vector-queries` service slug | ai_usage_logs row per operation |
| 9 | Tenant isolation enforced: vectors include tenantId in metadata | Cross-tenant queries impossible |
| 10 | Operations on disabled stores return 503 | Clear error message with store status |

---

## FR-AI-009: Usage Tracking

**Description**: Every AI API call is logged with token counts, costs, latency, and attribution metadata. Usage logs are queryable and filterable for the usage dashboard.

**Priority**: P0

**Use-Case Cross-Reference**: UC-9 (Check Tenant Full Profile)

### Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | Every successful AI call creates a row in ai_usage_logs | Row exists after each call |
| 2 | Failed calls are logged with status='error' and error message | Error details captured |
| 3 | Rate-limited calls are logged with status='rate_limited' | Rate limit events tracked |
| 4 | Usage logs include: tenantId, providerId, modelId, toolName, tokens, cost, latency | All fields populated correctly |
| 5 | GET /api/ai-usage-logs supports filtering by tenant, provider, model, date range | Filters work correctly |
| 6 | GET /api/ai/usage/summary returns aggregated stats | Totals by provider, model, time period |
| 7 | Usage events emitted for real-time dashboard updates | `ai.tool.invoked` event fires |
| 8 | Usage logs integrate with module-subscriptions metering | UsageMeteringService receives events |
| 9 | Old logs are retained per USAGE_LOG_RETENTION_DAYS config | Cleanup job respects retention setting |
| 10 | List endpoint returns Content-Range header for React Admin pagination | Standard listResponse format |

---

## FR-AI-010: Budget Management

**Description**: Administrators can set spending limits (token budgets and cost caps) at global, tenant, agent, or provider scope. Budgets track current period usage and emit alerts at configurable thresholds.

**Priority**: P1

**Use-Case Cross-Reference**: UC-12 (VIP Tenant Extra Quotas)

### Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | Admin can create budgets with scope (global/tenant/agent/provider), period, and limits | POST /api/ai-budgets returns 201 |
| 2 | Budget supports both token limits and cost limits (one or both) | Either field nullable |
| 3 | Budget counters auto-increment after each AI call | currentTokens, currentCostCents updated |
| 4 | Alert emitted when usage reaches alertThresholdPct | `ai.usage.budgetWarning` event |
| 5 | Hard limit blocks further calls when exceeded | Returns 429 with budget exhaustion message |
| 6 | Budget counters reset at period boundary (daily/weekly/monthly) | Counters reset on new period |
| 7 | Budget alerts are persisted in ai_budget_alerts | Alert row with type, message, timestamp |
| 8 | Alerts can be acknowledged (to prevent repeated notifications) | PUT /api/ai-budget-alerts/[id] with acknowledged=true |
| 9 | Disabled budgets are not enforced | Calls proceed even if counters exceed limits |
| 10 | Budget list shows utilization percentage | Computed field: currentTokens / tokenLimit * 100 |

---

## FR-AI-011: Guardrails

**Description**: Administrators can configure content filtering rules that check AI inputs and/or outputs for prohibited content. Rules use keyword matching, regex patterns, or classifier-based detection. Actions include block, warn, or modify.

**Priority**: P2

**Use-Case Cross-Reference**: N/A (security enhancement)

### Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | Admin can create guardrail rules with name, type, pattern, scope, and action | POST /api/ai-guardrails returns 201 |
| 2 | Rule types: keyword (simple match), regex (pattern match), classifier (AI-based) | All three types work |
| 3 | Scope: input (check prompts), output (check responses), both | Scope determines when rule runs |
| 4 | Action block: request rejected with 422 and guardrail violation message | Blocked calls never reach provider |
| 5 | Action warn: request proceeds, warning logged | Warning in ai_usage_logs metadata |
| 6 | Action modify: flagged content redacted in output | Response modified before return |
| 7 | Guardrails can be global (tenantId null) or tenant-specific | Tenant rules merge with global rules |
| 8 | Rules have priority ordering (lower number = higher priority) | Priority determines evaluation order |
| 9 | Disabled rules are skipped | Rule with `enabled: false` not evaluated |
| 10 | Guardrail evaluation adds minimal latency (<10ms for keyword/regex) | Performance within bounds |

---

## FR-AI-012: AI Tool Catalog

**Description**: All AI capabilities are registered as tools with Zod schemas, descriptions, and categories. Tools are discoverable by agents through the Module Registry and invokable through the tool invoke endpoint.

**Priority**: P0

**Use-Case Cross-Reference**: UC-7 (Add a New Service)

### Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | GET /api/ai/tools returns all registered tools with schemas | Tool list with name, category, description, schemas |
| 2 | Each tool has inputSchema and outputSchema as JSON Schema | Schemas are valid JSON Schema |
| 3 | Tools are categorized: language, embedding, image, vector, document | Category filtering works |
| 4 | Tools registered in module's `chat.actionSchemas` for agent discovery | Module Registry exposes tools |
| 5 | System tools (isSystem=true) cannot be deleted | DELETE returns 403 for system tools |
| 6 | Custom tools can be registered by other modules or administrators | POST /api/ai-tools for non-system tools |
| 7 | Tool invoke endpoint validates input against inputSchema | Invalid input returns 422 |
| 8 | Tool invoke endpoint requires `ai-tools.invoke` permission | Unauthorized returns 403 |

---

## FR-AI-013: pgvector Extension Management

**Description**: Administrators can check the status of the pgvector PostgreSQL extension and install it if not already enabled. This is required before creating pgvector-backed vector stores.

**Priority**: P1

**Use-Case Cross-Reference**: N/A (infrastructure requirement)

### Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | GET /api/ai/extensions/status returns pgvector installed status and version | Status includes installed boolean + version string |
| 2 | POST /api/ai/extensions/install runs CREATE EXTENSION IF NOT EXISTS vector | Extension enabled after call |
| 3 | Install is idempotent (safe to call multiple times) | Second call returns success without error |
| 4 | If pgvector is not available on the database host, install returns clear error | Error message explains host limitation |
| 5 | Creating a pgvector store when extension is not installed returns helpful error | Error includes link to install endpoint |

---

## FR-AI-014: Quota Integration

**Description**: AI calls are checked against the tenant's subscription quota before execution, and usage is tracked against the quota after execution. This integrates with module-subscriptions via EventBus.

**Priority**: P0

**Use-Case Cross-Reference**: UC-12 (VIP Tenant Extra Quotas)

### Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | Before each AI call, remaining quota is checked for the relevant service | Quota check happens in middleware |
| 2 | If quota exhausted, request rejected with 429 and quota information | Response includes service, limit, used, remaining |
| 3 | After each successful call, usage is reported to subscription metering | UsageMeteringService receives event |
| 4 | Different AI operations map to different service slugs | LLM tokens, embeddings, images tracked separately |
| 5 | Quota overrides for VIP tenants are respected | Override quotas take precedence over plan quotas |
| 6 | Quota check latency is under 50ms (cached where possible) | Performance within bounds |
| 7 | When module-subscriptions is not registered, quota checks are skipped | Graceful degradation |

---

## Requirements Traceability Matrix

| Requirement | Priority | Use Cases | Database Tables | API Endpoints | Events |
|------------|----------|-----------|----------------|---------------|--------|
| FR-AI-001 | P0 | UC-4, UC-10 | ai_providers | /api/ai-providers/* | ai.provider.* |
| FR-AI-002 | P0 | UC-8 | ai_model_aliases | /api/ai-aliases/* | ai.alias.* |
| FR-AI-003 | P0 | -- | ai_usage_logs | /api/ai/generate | ai.tool.invoked |
| FR-AI-004 | P0 | -- | ai_usage_logs | /api/ai/embed* | ai.tool.invoked |
| FR-AI-005 | P1 | -- | ai_usage_logs | /api/ai/generate-image | ai.tool.invoked |
| FR-AI-006 | P0 | -- | ai_usage_logs | /api/ai/generate-object | ai.tool.invoked |
| FR-AI-007 | P0 | -- | ai_vector_stores | /api/ai-vector-stores/* | ai.vectorStore.* |
| FR-AI-008 | P0 | -- | ai_vector_stores, ai_usage_logs | /api/ai-vector-stores/[slug]/* | ai.tool.invoked |
| FR-AI-009 | P0 | UC-9 | ai_usage_logs | /api/ai-usage-logs, /api/ai/usage/summary | ai.tool.invoked |
| FR-AI-010 | P1 | UC-12 | ai_budgets, ai_budget_alerts | /api/ai-budgets/* | ai.usage.budget* |
| FR-AI-011 | P2 | -- | ai_guardrails | /api/ai-guardrails/* | -- |
| FR-AI-012 | P0 | UC-7 | ai_tools | /api/ai/tools | -- |
| FR-AI-013 | P1 | -- | -- | /api/ai/extensions/* | -- |
| FR-AI-014 | P0 | UC-12 | -- (uses subscriptions) | -- (middleware) | ai.tool.invoked |

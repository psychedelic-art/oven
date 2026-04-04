# Module AI -- Module Design

> High-level and low-level design: dependency graph, internal components, data flows, and integration points.

---

## 1. Dependency Graph Position

Module AI is a **foundation layer** -- it has minimal dependencies and is depended upon by the AI-consuming modules higher in the stack.

```
                          DEPENDS ON module-ai
                 +----------------------------------+
                 |                                  |
   module-knowledge-base      module-agent-core     module-chat
   (embed documents,          (tool wrapper,        (@ai-sdk/react hooks,
    vector search)             invoke AI tools)      streaming endpoints)
         |                         |                      |
         |                         v                      |
         |              module-workflow-agents             |
         |              (LLM nodes, tool loops)           |
         |                         |                      |
         +------------+------------+----------------------+
                      |
                      v
              +---------------+
              |   module-ai   |   <-- THIS MODULE
              +---------------+
              |  depends on:  |
              |  - module-    |
              |    registry   |
              |  - module-    |
              |    roles      |
              +---------------+
                      |
                      | integrates with (via EventBus / API)
                      v
              +------------------+     +------------------+
              | module-          |     | module-config    |
              | subscriptions    |     | (config cascade) |
              | (usage metering, |     +------------------+
              |  plan quotas)    |
              +------------------+
```

**Key constraint**: Module AI never imports from modules that depend on it. All communication upward is through the EventBus, Module Registry discovery, or REST API calls (per module-rules Rule 3.1).

---

## 2. Internal Component Diagram

```
  +====================================================================+
  |                          module-ai                                 |
  +====================================================================+
  |                                                                    |
  |  +------------------+    +------------------+    +--------------+  |
  |  | ProviderRegistry |    | ModelResolver    |    | ToolCatalog  |  |
  |  |------------------|    |------------------|    |--------------|  |
  |  | register()       |    | resolve(alias)   |    | register()   |  |
  |  | resolve(slug)    |    | resolveChain()   |    | get(name)    |  |
  |  | testConnection() |    | getDefaults()    |    | list()       |  |
  |  | invalidate()     |    |                  |    | invoke()     |  |
  |  +--------+---------+    +--------+---------+    +------+-------+  |
  |           |                       |                     |          |
  |           +----------+------------+---------------------+          |
  |                      |                                             |
  |                      v                                             |
  |           +---------------------+                                  |
  |           | MiddlewareBuilder   |                                  |
  |           |---------------------|                                  |
  |           | buildStack(context) |                                  |
  |           | wrapModel(model)    |                                  |
  |           +----------+----------+                                  |
  |                      |                                             |
  |         +------------+------------+                                |
  |         |            |            |                                |
  |         v            v            v                                |
  |  +-----------+ +-----------+ +----------------+                   |
  |  | Guardrail | | Usage     | | Cost           |                   |
  |  | Engine    | | Tracker   | | Calculator     |                   |
  |  |-----------| |-----------| |----------------|                   |
  |  | checkIn() | | record()  | | calculate()    |                   |
  |  | checkOut()| | getSummary| | getModelPrice()|                   |
  |  | loadRules | | query()   | | estimateCall() |                   |
  |  +-----------+ +-----------+ +----------------+                   |
  |                      |                                             |
  |                      v                                             |
  |  +-------------------+-------------------+                        |
  |  | VectorStoreManager                    |                        |
  |  |---------------------------------------|                        |
  |  | createStore(config) --> store          |                        |
  |  | getAdapter(storeId) --> adapter        |                        |
  |  | registerAdapter(type, factory)         |                        |
  |  |                                        |                        |
  |  |  +--------------+  +---------------+  |                        |
  |  |  | PgVector     |  | Pinecone      |  |                        |
  |  |  | Adapter      |  | Adapter       |  |                        |
  |  |  +--------------+  +---------------+  |                        |
  |  +----------------------------------------+                        |
  |                                                                    |
  +====================================================================+
```

### Component Responsibilities

| Component | Responsibility | State |
|-----------|---------------|-------|
| **ProviderRegistry** | Manages AI SDK provider instances. Lazy construction from DB config. Cache with invalidation on updates. | In-memory Map + DB-backed |
| **ModelResolver** | Resolves model identifiers (alias, direct, default) to a concrete provider + model pair. Implements the 4-step strategy chain. | Stateless (reads from ProviderRegistry + DB) |
| **ToolCatalog** | Registers all AI tools with Zod schemas. Provides discovery (list/get) and invocation (invoke) for agents and direct callers. | In-memory registry (populated at module init) |
| **MiddlewareBuilder** | Constructs the AI SDK middleware stack for a given request context (tenant, user, provider). Conditionally includes guardrails, caching. | Stateless (builds per-request) |
| **GuardrailEngine** | Evaluates input/output against configured guardrail rules (keyword, regex, classifier). Returns block/warn/modify actions. | DB-backed rules (cached per tenant) |
| **UsageTracker** | Records every AI call in `ai_usage_logs`. Provides aggregation queries for the usage dashboard. Emits usage events. | DB (write-heavy, append-only) |
| **CostCalculator** | Computes upstream cost based on model pricing tables. Provides cost estimates before calls and actual costs after. | Pricing config in provider JSONB |
| **VectorStoreManager** | Manages vector store lifecycle. Delegates operations to the appropriate adapter based on store config. | DB config + adapter instances |

---

## 3. Data Flow -- AI Call Request

The primary data flow through module-ai for a text generation request:

```
  Caller (agent / chat / API)
       |
       | POST /api/ai/generate
       | { model: "fast", prompt: "...", temperature: 0.7 }
       |
       v
  +------- API Handler (generate.handler.ts) -------+
  |                                                  |
  |  1. Parse and validate request body (Zod)        |
  |  2. Extract tenant context from auth middleware   |
  |                                                  |
  |  3. ModelResolver.resolve("fast", tenantId)       |
  |     |                                            |
  |     +--> Query ai_model_aliases                  |
  |     +--> Found: providerId=1, modelId=gpt-4o-mini|
  |     +--> ProviderRegistry.resolve(providerId=1)  |
  |     +--> Construct AI SDK model instance          |
  |                                                  |
  |  4. MiddlewareBuilder.buildStack({               |
  |       tenantId, userId, providerId, modelId      |
  |     })                                           |
  |     |                                            |
  |     +--> Quota check middleware                  |
  |     +--> Guardrail middleware (if tenant rules)  |
  |     +--> Usage tracking middleware               |
  |     +--> Cost calculation middleware             |
  |                                                  |
  |  5. wrappedModel = wrapLanguageModel({           |
  |       model, middleware: stack                   |
  |     })                                           |
  |                                                  |
  |  6. result = await generateText({                |
  |       model: wrappedModel,                       |
  |       prompt, temperature: 0.7,                  |
  |       ...aliasDefaults,                          |
  |     })                                           |
  |                                                  |
  |  7. Return JSON response:                        |
  |     { text, usage, finishReason }                |
  |                                                  |
  +--------------------------------------------------+
       |
       | (middleware side effects during step 6)
       |
       +--> ai_usage_logs: INSERT row
       +--> ai_budgets: UPDATE counters
       +--> EventBus: emit 'ai.tool.invoked'
       +--> module-subscriptions: UsageMeteringService.recordUsage()
```

---

## 4. Data Flow -- Vector Store Operation

```
  Caller
       |
       | POST /api/ai/vector-stores/{slug}/query
       | { text: "billing policy", topK: 5 }
       |
       v
  +------- API Handler (vector-stores-query.handler.ts) -------+
  |                                                             |
  |  1. Look up store config from ai_vector_stores by slug      |
  |                                                             |
  |  2. If query has 'text' (not 'vector'):                     |
  |     a. Resolve embedding model from store config             |
  |     b. Call embed({ model, value: text })                   |
  |     c. Get embedding vector                                  |
  |                                                             |
  |  3. VectorStoreManager.getAdapter(store.adapter)            |
  |     Returns PgVectorAdapter or PineconeAdapter               |
  |                                                             |
  |  4. adapter.query({                                         |
  |       vector: embeddingVector,                              |
  |       topK: 5,                                              |
  |       filter: tenantId filter,                              |
  |     })                                                      |
  |                                                             |
  |  5. Track usage (embedding tokens + vector query)            |
  |                                                             |
  |  6. Return results:                                         |
  |     { matches: [{ id, score, metadata }] }                  |
  |                                                             |
  +-------------------------------------------------------------+
```

---

## 5. Integration with module-subscriptions

Module AI integrates with `module-subscriptions` for usage metering. This is **not** a direct import -- it happens through the EventBus and the service catalog.

### Seed-time Integration

During `seedAi()`, the module seeds 6 AI service entries into the subscription service catalog:

| Service | Slug | Unit Label | Category |
|---------|------|-----------|----------|
| LLM Prompt Tokens | `ai-llm-prompt-tokens` | tokens | AI |
| LLM Completion Tokens | `ai-llm-completion-tokens` | tokens | AI |
| Embedding Tokens | `ai-embedding-tokens` | tokens | AI |
| Image Generation | `ai-image-generation` | images | AI |
| Vector Queries | `ai-vector-queries` | queries | AI |
| Agent Executions | `ai-agent-executions` | executions | AI |

These services can then be assigned quotas in billing plans (e.g., Free plan: 10,000 LLM tokens/month).

### Runtime Integration

```
  module-ai                          module-subscriptions
  +------------------+               +------------------------+
  | UsageTracker     |               | UsageMeteringService   |
  |                  |               |                        |
  | After each call: |               | Listener for           |
  | emit event ------|--EventBus---->| 'ai.tool.invoked'      |
  |                  |               |                        |
  | 'ai.tool.invoked'|               | recordUsage({          |
  | {                |               |   tenantId,            |
  |   tenantId,      |               |   serviceSlug:         |
  |   toolName,      |               |     'ai-llm-prompt-   |
  |   inputTokens,   |               |      tokens',          |
  |   outputTokens,  |               |   quantity:            |
  |   ...            |               |     inputTokens,       |
  | }                |               | })                     |
  +------------------+               +------------------------+
                                              |
                                              v
                                     Check plan quota
                                     Update usage counters
                                     Emit warning if near limit
```

### Quota Check Before Calls

Before executing an AI call, the middleware chain calls the subscriptions API to verify the tenant has remaining quota:

```
GET /api/tenant-limits?tenantId={id}&serviceSlug=ai-llm-prompt-tokens
--> { remaining: 5000, limit: 10000, source: "plan" }
```

If `remaining <= 0`, the call is rejected with a 429 status.

---

## 6. Integration with module-config

Module AI reads provider credentials and default settings from the config cascade system. This enables per-tenant overrides without code changes.

### Config Keys

| Key | Type | Default | Scope |
|-----|------|---------|-------|
| `DEFAULT_LANGUAGE_MODEL` | string | `gpt-4o` | instance-scoped |
| `DEFAULT_EMBEDDING_MODEL` | string | `text-embedding-3-small` | instance-scoped |
| `GLOBAL_RATE_LIMIT_RPM` | number | `100` | platform-only |
| `USAGE_LOG_RETENTION_DAYS` | number | `90` | platform-only |
| `GUARDRAILS_ENABLED` | boolean | `true` | instance-scoped |
| `LANGSMITH_API_KEY` | string | `null` | platform-only |
| `LANGSMITH_PROJECT` | string | `null` | platform-only |

### Config Resolution at Runtime

```typescript
// In generate.handler.ts
const defaultModel = await resolveConfig('ai', 'DEFAULT_LANGUAGE_MODEL', tenantId);
// Returns: tenant override if set, otherwise platform default, otherwise 'gpt-4o'
```

### Per-Tenant Provider Overrides

A tenant can have their own AI provider credentials (bring-your-own-key model):

```
Platform level:  ai_providers row with tenantId = NULL (shared by all tenants)
Tenant level:    ai_providers row with tenantId = 42   (tenant's own key)
```

When resolving a provider for tenant 42, the system first checks for a tenant-specific provider, then falls back to the platform-wide provider. This follows the same cascade principle as module-config.

---

## 7. LangSmith Integration

LangSmith tracing is optional and controlled by environment flags:

```
LANGSMITH_API_KEY=lsv2_pt_...       (presence enables tracing)
LANGSMITH_PROJECT=oven-production   (optional project name)
```

When enabled, the middleware chain includes a LangSmith tracing decorator that wraps each AI call with trace metadata (tenant, user, agent, tool name). This provides full observability in the LangSmith dashboard without any code changes in consuming modules.

```
  AI Call with LangSmith enabled:

  +---> LangSmith trace starts (run_id, project, metadata)
  |
  |  +---> Normal middleware chain executes
  |  |     (resolve, quota, guardrails, execute, track)
  |  |
  |  +---> LangSmith trace ends (tokens, latency, status)
  |
  +---> Trace visible in LangSmith dashboard
```

**No AI dependency at Phase 1**: LangSmith is a tracing/observability tool, not an AI model dependency. The `langsmith` npm package is a peer dependency -- the middleware gracefully skips tracing when the package is not installed or the env var is not set.

---

## 8. pgvector Extension Management

Module AI manages the pgvector PostgreSQL extension lifecycle:

```
  GET /api/ai/extensions/status
  --> { pgvector: { installed: false, version: null } }

  POST /api/ai/extensions/install
  --> Executes: CREATE EXTENSION IF NOT EXISTS vector;
  --> { pgvector: { installed: true, version: "0.7.4" } }
```

The pgvector adapter checks extension status on first use and returns a clear error if not installed, with a link to the extensions management page.

For Neon Postgres (the default hosting), pgvector is available as a pre-installed extension -- the install endpoint simply enables it. For other Postgres hosts, the endpoint verifies the extension is available before attempting to create it.

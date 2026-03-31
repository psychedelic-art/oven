# Module AI — Implementation Prompt

> Condensed directive for implementing `packages/module-ai`.
> References all docs in this folder. Use as baseline context for any implementation agent.

---

## Identity

- **Package**: `packages/module-ai`
- **Name**: `@oven/module-ai`
- **Type**: ModuleDefinition (full module)
- **Phase**: 1 (Foundation — no AI dependencies)
- **Dependencies**: `module-registry`, `module-subscriptions` (enhanced with usage tracking)
- **Depended on by**: module-knowledge-base, module-agent-core, module-chat, module-workflow-agents

## Mission

Build the AI services abstraction layer for the OVEN platform. Every AI capability in the system flows through this module — LLM calls, embeddings, image generation, vector store operations, and structured output. It wraps the Vercel AI SDK with a provider registry, model alias resolution, usage metering, budget enforcement, guardrails, and a tool catalog that agents can discover at runtime.

## Key Constraints

- **Monorepo**: pnpm + Turborepo. Package at `packages/module-ai/`, raw TypeScript exports (`"main": "./src/index.ts"`)
- **Framework**: Next.js 15 App Router, Drizzle ORM, Neon PostgreSQL
- **Styling**: MUI 7 + sx prop for dashboard components (NO inline styles, NO Tailwind in dashboard)
- **AI SDK**: Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`)
- **Vector stores**: pgvector (primary) + Pinecone (secondary). Adapter interface required.
- **Observability**: LangSmith optional via `LANGSMITH_API_KEY` env var
- **TDD**: Write tests BEFORE implementation
- **No cross-module imports**: Communicate via EventBus, REST API, or Registry discovery only

## Architecture (see `architecture.md`)

Patterns to implement:
1. **ProviderRegistry** — `register(name, providerFactory)` / `resolve(nameOrAlias)` → AI SDK provider instance
2. **ModelResolver** — Alias chain: `"fast"` → look up `ai_model_aliases` → resolve to `openai:gpt-4o-mini`
3. **Middleware Chain** — Vercel AI SDK `wrapLanguageModel()`: quota check → execute → usage track → cost calculate
4. **VectorStoreAdapter** — Interface: `upsert(docs)`, `query(vector, topK)`, `delete(ids)`. Implementations: PgVectorAdapter, PineconeAdapter
5. **CostCalculator** — Model pricing table → token count × price per token
6. **GuardrailEngine** — Rules from `ai_guardrails` table → input/output content filtering

## Database (see `database.md`)

8 tables, all prefixed `ai_`:

| Table | Key Columns | Tenant-Scoped |
|-------|------------|:---:|
| `ai_providers` | name, slug, type, apiKeyEncrypted, baseUrl, rateLimitRpm | Optional (nullable tenantId) |
| `ai_model_aliases` | alias, providerId, modelId, type, defaultSettings | No (global) |
| `ai_vector_stores` | name, adapter, connectionConfig, embeddingModel, dimensions | Yes |
| `ai_usage_logs` | tenantId, providerId, modelId, inputTokens, outputTokens, costCents | Yes |
| `ai_budgets` | scope, scopeId, periodType, tokenLimit, costLimitCents | Scoped |
| `ai_budget_alerts` | budgetId, type, message, acknowledged | Via budget |
| `ai_tools` | name, slug, category, inputSchema, outputSchema, handler | No (global) |
| `ai_guardrails` | ruleType, pattern, scope, action, message, priority | Optional |

Critical: `ai_providers.apiKeyEncrypted` must use AES-256-GCM encryption. Never return raw keys in GET responses.

## Subscriptions Enhancement (prerequisite)

Before module-ai works, enhance `module-subscriptions`:
1. Add `sub_usage_records` table (tenantId, serviceId, amount, unit, billingCycle, upstreamCostCents, metadata)
2. Add endpoints: `POST /api/usage/track`, `GET /api/usage/summary`, `GET /api/tenant-subscriptions/[tenantId]/usage`
3. Create `UsageMeteringService` with `trackUsage()` and `checkQuota()` methods
4. Seed 6 AI services in catalog: `llm-prompt-tokens`, `llm-completion-tokens`, `ai-embeddings`, `ai-image-generation`, `ai-vector-queries`, `ai-agent-executions`
5. Seed provider-service mappings (OpenAI, Anthropic, Google, Pinecone) with upstream costs
6. Seed billing plans with AI quotas (Free, Starter $29, Pro $99)
7. Wire `subscriptions.quota.exceeded` event to actually fire

## API Endpoints (see `api.md`)

16 endpoints total:
- CRUD: `ai-providers` (4), `ai-aliases` (4), `ai-vector-stores` (4), `ai-budgets` (4)
- List-only: `ai-usage-logs` (1)
- Custom: `POST /ai/embed`, `POST /ai/generate`, `POST /ai/stream` (SSE), `POST /ai/generate-image`, `POST /ai/generate-object`
- Discovery: `GET /ai/tools`
- Dashboard: `GET /ai/usage/summary`, `GET /ai/extensions/status`, `POST /ai/extensions/install`

All list endpoints: use `parseListParams()` + `listResponse()` from `@oven/module-registry/api-utils`.

## Middleware Chain (critical path)

Every AI call flows through:
```
request → resolveProvider(alias) → checkQuota(tenantId, service, estimate)
        → wrapLanguageModel(provider, middleware) → executeAICall()
        → trackUsage(tenantId, service, actualTokens, cost) → response
```

The middleware is Vercel AI SDK compatible — use `experimental_wrapLanguageModel` or the middleware API.

## Events (see `module-design.md`)

Emits:
- `ai.provider.created|updated|deleted` — Provider lifecycle
- `ai.alias.created|updated|deleted` — Alias lifecycle
- `ai.vectorStore.created|updated|deleted` — Vector store lifecycle
- `ai.call.completed` — Every AI call (tokens, cost, latency, model)
- `ai.call.failed` — AI call errors
- `ai.budget.warning` — Budget threshold reached
- `ai.budget.exceeded` — Budget limit hit
- `ai.guardrail.triggered` — Content filtered

## Seed Data (see `detailed-requirements.md`)

Idempotent seed function:
1. Permissions: `ai-providers.read/create/update/delete`, `ai-aliases.*`, `ai-vector-stores.*`, `ai-usage-logs.read`, `ai-budgets.*`, `ai-tools.read`
2. Built-in tools: `ai.embed`, `ai.embedMany`, `ai.generateText`, `ai.streamText`, `ai.generateImage`, `ai.generateObject`
3. AI services in subscriptions catalog (if subscriptions module registered)
4. Default model aliases: `fast` → gpt-4o-mini, `smart` → gpt-4o, `embed` → text-embedding-3-small

## Dashboard UI (see `UI.md`)

22 component files in `apps/dashboard/src/components/ai/`:
- ProviderList, ProviderCreate, ProviderEdit, ProviderShow (with "Test Connection")
- AliasList, AliasCreate, AliasEdit
- VectorStoreList, VectorStoreCreate, VectorStoreEdit, VectorStoreShow
- UsageLogList, UsageLogShow
- BudgetList, BudgetCreate, BudgetEdit
- AIPlayground (tabbed: text gen, embeddings, image gen, structured output)
- AIUsageDashboard (Recharts: line, bar, pie, gauge)
- AIToolCatalog (expandable cards with schema viewer)
- AIExtensions (pgvector status + install)

Menu section: `──── AI Services ────` with Providers, Model Aliases, Vector Stores, Tools, Playground, Usage & Budgets

## Chat Block (for MCP/agent discovery)

```typescript
chat: {
  description: 'AI services layer — LLM generation, embeddings, image generation, vector stores, usage tracking',
  capabilities: ['generate text', 'embed text', 'generate images', 'manage vector stores', 'track AI usage'],
  actionSchemas: [
    { name: 'ai.embed', endpoint: { method: 'POST', path: 'ai/embed' }, ... },
    { name: 'ai.generate', endpoint: { method: 'POST', path: 'ai/generate' }, ... },
    { name: 'ai.generateImage', endpoint: { method: 'POST', path: 'ai/generate-image' }, ... },
    { name: 'ai.tools', endpoint: { method: 'GET', path: 'ai/tools' }, ... },
  ]
}
```

## Config Schema

| Key | Type | Default | Instance-Scoped |
|-----|------|---------|:---:|
| `DEFAULT_PROVIDER` | string | `openai` | Yes |
| `DEFAULT_TEXT_MODEL` | string | `gpt-4o-mini` | Yes |
| `DEFAULT_EMBEDDING_MODEL` | string | `text-embedding-3-small` | Yes |
| `DEFAULT_EMBEDDING_DIMENSIONS` | number | `1536` | No |
| `MAX_TOKENS_PER_REQUEST` | number | `4096` | Yes |
| `RATE_LIMIT_RPM` | number | `60` | Yes |
| `GUARDRAILS_ENABLED` | boolean | `true` | Yes |
| `LANGSMITH_TRACING` | boolean | `false` | No |

## Security Checklist (see `secure.md`)

- [ ] API keys encrypted at rest (AES-256-GCM)
- [ ] Keys masked in GET responses (`sk-...xxxx`)
- [ ] Rate limiting per provider (RPM, TPM)
- [ ] Guardrails on input/output
- [ ] Tenant isolation on all queries
- [ ] Budget enforcement (hard/soft configurable)
- [ ] Permission slugs registered
- [ ] Credential rotation without downtime

## Test Plan (TDD)

Write tests first for:
1. `provider-registry.test.ts` — register, resolve, fallback, unknown provider
2. `model-resolver.test.ts` — alias resolution, chain fallback, missing alias
3. `vector-store-adapter.test.ts` — pgvector upsert/query/delete, Pinecone adapter
4. `cost-calculator.test.ts` — token pricing by model, batch calculation
5. `middleware.test.ts` — quota check pass/fail, usage tracking, guardrail block
6. `usage-metering.test.ts` — track usage, check quota, billing cycle aggregation
7. `api/*.test.ts` — all CRUD endpoints, embed/generate/stream endpoints

## File Structure

```
packages/module-ai/
  package.json
  tsconfig.json
  src/
    index.ts                    ← ModuleDefinition export
    schema.ts                   ← 8 Drizzle tables
    types.ts                    ← TypeScript interfaces
    seed.ts                     ← Idempotent seed
    engine/
      provider-registry.ts      ← Register/resolve AI SDK providers
      model-resolver.ts         ← Alias → provider:model
      middleware.ts             ← Vercel AI SDK middleware chain
      cost-calculator.ts        ← Token → cost mapping
      guardrail-engine.ts       ← Content filtering
      usage-tracker.ts          ← Integration with UsageMeteringService
    vector-store/
      adapter.ts                ← VectorStoreAdapter interface
      pgvector.ts               ← pgvector implementation
      pinecone.ts               ← Pinecone implementation
    tools/
      embed.ts                  ← ai.embed, ai.embedMany
      generate.ts               ← ai.generateText, ai.streamText
      generate-image.ts         ← ai.generateImage
      generate-object.ts        ← ai.generateObject
      registry.ts               ← AI tool catalog
    api/
      ai-providers.handler.ts
      ai-providers-by-id.handler.ts
      ai-aliases.handler.ts
      ai-aliases-by-id.handler.ts
      ai-vector-stores.handler.ts
      ai-vector-stores-by-id.handler.ts
      ai-usage-logs.handler.ts
      ai-budgets.handler.ts
      ai-budgets-by-id.handler.ts
      ai-embed.handler.ts
      ai-generate.handler.ts
      ai-stream.handler.ts
      ai-generate-image.handler.ts
      ai-generate-object.handler.ts
      ai-tools.handler.ts
      ai-usage-summary.handler.ts
      ai-extensions.handler.ts
```

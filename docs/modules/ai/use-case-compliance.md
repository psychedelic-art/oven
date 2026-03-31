# Module AI -- Use-Case Compliance

> Mapping module-ai capabilities to platform use cases from [`docs/use-cases.md`](../../use-cases.md) and new AI-specific use cases.

---

## Platform Use Case Coverage

### UC-4: Set Up Provider Credentials

**Status**: Fully Supported

**Platform Use Case**: Store API keys/secrets for upstream providers so the platform can make calls on behalf of tenants.

**Module AI Implementation**:

| Step | Platform UC | Module AI Equivalent |
|------|------------|---------------------|
| 1. Check configSchema | Check provider-service configSchema | Providers have typed config (apiKey, baseUrl, rateLimits) |
| 2. Store platform credentials | POST /api/module-configs with tenantId=null | POST /api/ai-providers with tenantId=null (global provider) |
| 3. Store tenant credentials | POST /api/module-configs with tenantId | POST /api/ai-providers with tenantId set (tenant-scoped) |

**Key difference**: Module AI stores provider credentials in its own `ai_providers` table (encrypted) rather than in generic module-config entries. This enables typed validation, connection testing, and the provider registry cache pattern.

**Requirement Cross-Reference**: FR-AI-001 (Provider Management)

---

### UC-7: Add a New Service to the Platform

**Status**: Fully Supported (Auto-Seeded)

**Platform Use Case**: Introduce a new upstream service and make it available in billing plans.

**Module AI Implementation**:

The `seedAi()` function automatically registers 6 AI services in the subscription service catalog:

| Seeded Service | Slug | Unit | Maps To |
|---------------|------|------|---------|
| LLM Prompt Tokens | `ai-llm-prompt-tokens` | tokens | Text generation input |
| LLM Completion Tokens | `ai-llm-completion-tokens` | tokens | Text generation output |
| Embedding Tokens | `ai-embedding-tokens` | tokens | Embed / embedMany |
| Image Generation | `ai-image-generation` | images | generateImage |
| Vector Queries | `ai-vector-queries` | queries | Vector store query/upsert |
| Agent Executions | `ai-agent-executions` | executions | Agent workflow runs |

These services appear automatically in the Dashboard > Service Catalog after running `pnpm db:seed`. Administrators can then assign quotas to billing plans without any additional configuration.

**Requirement Cross-Reference**: FR-AI-012 (AI Tool Catalog), FR-AI-014 (Quota Integration)

---

### UC-8: Override Config for One Tenant

**Status**: Fully Supported

**Platform Use Case**: Set a tenant-specific config value that differs from the platform default.

**Module AI Implementation**:

Per-tenant overrides work at two levels:

**Level 1 -- Config cascade** (same as all modules):

```
GET /api/module-configs/resolve?moduleName=ai&key=DEFAULT_LANGUAGE_MODEL&tenantId=42
```

Tenant 42 can override the default language model from `gpt-4o` to `claude-sonnet-4-20250514`.

**Level 2 -- Tenant-scoped providers**:

Tenant 42 can have their own AI provider with their own API key (bring-your-own-key model):

```
POST /api/ai-providers
{
  "tenantId": 42,
  "name": "Tenant 42 OpenAI",
  "slug": "openai-tenant-42",
  "type": "openai",
  "apiKey": "sk-tenant-42-key..."
}
```

When resolving a provider for tenant 42, the system prioritizes tenant-scoped providers over platform-wide ones.

**Level 3 -- Tenant-scoped aliases**:

Tenants can have their own alias mappings. The alias `fast` might mean `gpt-4o-mini` for most tenants but `claude-3-5-haiku-20241022` for tenant 42.

**Requirement Cross-Reference**: FR-AI-001, FR-AI-002

---

### UC-10: Add a New Provider

**Status**: Fully Supported

**Platform Use Case**: Register a new upstream provider and map it to existing services.

**Module AI Implementation**:

| Platform UC Step | Module AI Equivalent |
|-----------------|---------------------|
| Create the provider | POST /api/ai-providers with type, credentials |
| Map to services | AI services are auto-mapped (all providers serve the same service slugs) |
| Store credentials | API key encrypted in ai_providers.apiKeyEncrypted |
| Test connection | POST /api/ai-providers/[id]/test validates the key works |

**Additional capability**: Module AI supports creating model aliases that route to the new provider, enabling gradual migration:

```
1. Add new provider (Anthropic)
2. Create alias "smart" pointing to anthropic:claude-sonnet-4-20250514
3. All callers using "smart" now use the new provider
4. Monitor usage/quality via usage dashboard
5. If issues, update alias to point back to old provider
```

**Requirement Cross-Reference**: FR-AI-001, FR-AI-002

---

### UC-12: VIP Tenant Extra Quotas

**Status**: Fully Supported

**Platform Use Case**: Give a specific tenant higher quotas than their plan allows.

**Module AI Implementation**:

This works through the standard subscription quota override system, enhanced with AI-specific budget management:

**Subscription-level overrides** (via module-subscriptions):

```
POST /api/quota-overrides
{
  "subscriptionId": 42,
  "serviceId": <ai-llm-prompt-tokens service ID>,
  "quota": 1000000,
  "reason": "VIP customer - 10x LLM token allocation"
}
```

**AI-level budget overrides** (via module-ai budgets):

```
POST /api/ai-budgets
{
  "scope": "tenant",
  "scopeId": 42,
  "periodType": "monthly",
  "tokenLimit": 1000000,
  "costLimitCents": 50000,
  "alertThresholdPct": 80
}
```

The two systems work together:
- Subscription quotas determine the **entitlement** (how much the tenant is allowed)
- AI budgets determine the **spending cap** (how much the platform is willing to spend)
- The more restrictive of the two is enforced

**Requirement Cross-Reference**: FR-AI-010 (Budget Management), FR-AI-014 (Quota Integration)

---

## New AI-Specific Use Cases

### UC-AI-1: Configure AI Provider

**Goal**: Set up a new AI provider so the platform can make AI API calls.

**Modules**: AI, Config

**Steps**:

1. **Create provider** -- Dashboard > AI Services > Providers > Create.
   - `POST /api/ai-providers` -- set name, slug, type (openai/anthropic/google), API key.
2. **Test connection** -- Click "Test Connection" on the provider detail page.
   - `POST /api/ai-providers/[id]/test` -- verifies API key and returns latency.
3. **Set as default** (optional) -- Dashboard > Module Configs > Create.
   - `POST /api/module-configs` -- key=`DEFAULT_LANGUAGE_MODEL`, value=provider's default model.
4. **Create aliases** -- Dashboard > AI Services > Model Aliases > Create.
   - `POST /api/ai-aliases` -- alias="fast", providerId=N, modelId="gpt-4o-mini".

**Result**: AI provider is configured, tested, and ready for use by agents, workflows, and the chat module.

---

### UC-AI-2: Test Embeddings

**Goal**: Verify that the embedding pipeline works for a new vector store configuration.

**Modules**: AI

**Steps**:

1. **Ensure pgvector is installed** -- Dashboard > AI Services > Extensions.
   - If not installed: `POST /api/ai/extensions/install`.
2. **Create a vector store** -- Dashboard > AI Services > Vector Stores > Create.
   - `POST /api/ai-vector-stores` -- adapter=pgvector, dimensions=1536, distanceMetric=cosine.
3. **Open the Playground** -- Dashboard > AI Services > Playground > Embeddings tab.
4. **Enter test text** -- Type a sample document.
5. **Generate embedding** -- Click "Embed". View the vector dimensions and values.
6. **Upsert to store** -- Select the vector store, click "Upsert".
7. **Query the store** -- Enter a query, click "Search". Verify relevant results returned.

**Result**: Embedding pipeline validated end-to-end from text input through storage to retrieval.

---

### UC-AI-3: Set AI Budgets

**Goal**: Configure spending limits to prevent runaway AI costs.

**Modules**: AI, Subscriptions

**Steps**:

1. **Create global budget** -- Dashboard > AI Services > Budgets > Create.
   - `POST /api/ai-budgets` -- scope=global, periodType=monthly, costLimitCents=100000 ($1,000/month).
2. **Set alert threshold** -- alertThresholdPct=80 (alert at $800).
3. **Create per-tenant budget** -- Same flow with scope=tenant, scopeId=tenantId.
4. **Create per-provider budget** -- scope=provider, scopeId=providerId (limit OpenAI spending).
5. **Verify enforcement** -- Make AI calls. Check budget utilization in dashboard.
6. **Acknowledge alerts** -- When warning fires, acknowledge in Budget Alerts section.

**Result**: Platform has spending controls at multiple scopes with proactive alerts before limits are reached.

---

### UC-AI-4: Monitor AI Usage

**Goal**: Understand AI consumption patterns across the platform.

**Modules**: AI

**Steps**:

1. **Open Usage Dashboard** -- Dashboard > AI Services > Usage Dashboard.
2. **View token consumption** -- Line chart shows daily token usage by model.
3. **View cost breakdown** -- Bar chart shows cost by provider. Pie chart shows distribution by model.
4. **Filter by tenant** -- Select a tenant to see their specific usage.
5. **Filter by date range** -- Select last 7/30/90 days or custom range.
6. **Check budget utilization** -- Gauge charts show percentage of budget consumed.
7. **Export usage logs** -- Download filtered logs as CSV for billing reconciliation.

**Result**: Full visibility into AI consumption with actionable breakdowns by tenant, provider, model, and time period.

---

### UC-AI-5: Add a Custom AI Tool

**Goal**: Register a custom AI tool that agents can discover and invoke.

**Modules**: AI

**Steps**:

1. **Define tool schema** -- Write Zod input/output schemas.
2. **Register via seed** -- Add to module's seed function with `isSystem: false`.
   - Or via API: `POST /api/ai-tools` with name, category, description, inputSchema, outputSchema, handler.
3. **Verify discovery** -- `GET /api/ai/tools` shows the new tool.
4. **Test invocation** -- Dashboard > AI Services > Tool Catalog > select tool > "Test" button.
5. **Assign to agent** -- In agent workflow editor, the tool appears in the tool selection dropdown.

**Result**: Custom AI tool is discoverable by all agents and invokable through the standard middleware chain with usage tracking.

---

### UC-AI-6: Set Up FTUE (First-Time User Experience)

**Goal**: Guide a new platform operator through initial AI setup.

**Modules**: AI, Config

**Steps** (wizard flow):

1. **Step 1: Add Provider** -- Enter API key for at least one provider (OpenAI recommended).
2. **Step 2: Test Connection** -- Automatic connection test. Green checkmark on success.
3. **Step 3: Create Alias** -- Create the `default` alias pointing to the provider's recommended model.
4. **Step 4: Try Playground** -- Send a test prompt. See streaming response.
5. **Setup Complete** -- Redirect to AI Services overview with all sections populated.

**Result**: New operator has a working AI setup in under 5 minutes with guided step-by-step flow.

---

## Compliance Summary

| Platform Use Case | Module AI Support | Requirements |
|------------------|-------------------|-------------|
| UC-4 (Provider Credentials) | Fully supported | FR-AI-001 |
| UC-7 (New Service) | Auto-seeded | FR-AI-012, FR-AI-014 |
| UC-8 (Config Override) | Multi-level overrides | FR-AI-001, FR-AI-002 |
| UC-10 (New Provider) | Full CRUD + test | FR-AI-001 |
| UC-12 (VIP Quotas) | Subscription + budget | FR-AI-010, FR-AI-014 |
| UC-AI-1 (Configure Provider) | New | FR-AI-001 |
| UC-AI-2 (Test Embeddings) | New | FR-AI-004, FR-AI-007, FR-AI-008 |
| UC-AI-3 (Set Budgets) | New | FR-AI-010 |
| UC-AI-4 (Monitor Usage) | New | FR-AI-009 |
| UC-AI-5 (Custom Tool) | New | FR-AI-012 |
| UC-AI-6 (FTUE) | New | FR-AI-001, FR-AI-002 |

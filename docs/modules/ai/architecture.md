# Module AI -- Architecture

> Design patterns, middleware chain, and provider resolution strategy.

---

## Design Patterns

Module AI employs seven architectural patterns that work together to provide a flexible, observable, and secure AI services layer.

---

### 1. Adapter Pattern -- VectorStoreAdapter

The vector store subsystem uses the Adapter pattern to abstract away the differences between vector database backends. All adapters implement a single interface; the consuming code never knows which backend is in use.

```
                    +-------------------------+
                    |   VectorStoreAdapter    |  <-- Interface
                    |-------------------------|
                    | upsert(vectors)         |
                    | query(vector, opts)     |
                    | delete(ids)             |
                    | fetch(ids)              |
                    | getStats()              |
                    +-------------------------+
                        ^               ^
                        |               |
            +-----------+---+   +-------+---------+
            | PgVectorAdapter|   | PineconeAdapter  |
            |----------------|   |------------------|
            | Uses Drizzle   |   | Uses @pinecone-  |
            | + pgvector     |   |   database/      |
            | extension      |   |   pinecone       |
            +----------------+   +------------------+
```

**Why this pattern**: The platform needs pgvector for zero-infrastructure development and Pinecone for production scale. The adapter interface lets us add Qdrant, ChromaDB, or Weaviate later without modifying any consuming code.

**Key design decisions**:
- Adapters are registered externally at application startup (Rule 3.3 from module-rules)
- The module package never imports a specific adapter package
- Connection config is stored as encrypted JSONB, interpreted only by the adapter
- Each adapter handles its own index management (HNSW for pgvector, serverless indexes for Pinecone)

---

### 2. Registry Pattern -- ProviderRegistry

The ProviderRegistry manages runtime registration and resolution of Vercel AI SDK provider instances. Providers are configured in the database and constructed lazily on first use.

```
  ProviderRegistry
  +-------------------------------------------+
  |  providers: Map<slug, ProviderInstance>    |
  |                                           |
  |  register(slug, config) --> void          |
  |  resolve(slug) -----------> ProviderInstance |
  |  resolveModel(alias) -----> { provider, modelId } |
  |  listProviders() ---------> ProviderConfig[]  |
  |  testConnection(slug) ----> TestResult    |
  +-------------------------------------------+
       |
       | constructs via AI SDK
       v
  customProvider({
    languageModels: { 'fast': openai('gpt-4o-mini'), ... },
    embeddingModels: { ... },
    imageModels: { ... },
    fallbackProvider: anthropic,
  })
```

**Why this pattern**: Providers must be configurable at runtime (add/remove/disable from dashboard) without restarting the server. The registry caches constructed provider instances and invalidates them when config changes.

**Cache invalidation strategy**:
1. Dashboard updates provider config via PUT endpoint
2. Handler emits `ai.provider.updated` event
3. Registry listener clears cached instance for that slug
4. Next resolution reconstructs from fresh DB config

---

### 3. Middleware Pattern -- AI SDK Middleware Chain

All AI calls pass through a configurable middleware chain built on the Vercel AI SDK's `wrapLanguageModel` pattern. Each middleware decorates the model with additional behavior.

```
  Incoming AI Request
       |
       v
  +------------------+
  | resolveProvider   |  Resolve model alias --> provider:model
  +------------------+
       |
       v
  +------------------+
  | checkQuota       |  Verify budget/rate limits not exceeded
  +------------------+
       |
       v
  +------------------+
  | applyGuardrails  |  Input content filtering (keyword/regex/classifier)
  +------------------+
       |
       v
  +------------------+
  | applyDefaults    |  Merge default settings (temperature, maxTokens)
  +------------------+
       |
       v
  +------------------+
  | executeAI        |  Call the Vercel AI SDK function
  +------------------+
       |
       v
  +------------------+
  | outputGuardrails |  Output content filtering
  +------------------+
       |
       v
  +------------------+
  | trackUsage       |  Log tokens, cost, latency to ai_usage_logs
  +------------------+
       |
       v
  +------------------+
  | updateBudget     |  Increment budget counters, check thresholds
  +------------------+
       |
       v
  Response to caller
```

**Implementation via AI SDK middleware**:

```typescript
const middleware: LanguageModelMiddleware = {
  transformParams: async ({ params }) => {
    // resolveProvider + checkQuota + applyDefaults
    const resolved = await providerRegistry.resolveModel(params.model);
    await budgetService.checkQuota(context);
    return { ...params, ...resolved.defaults };
  },
  wrapGenerate: async ({ doGenerate, params }) => {
    // applyGuardrails (input) + executeAI + outputGuardrails + trackUsage
    await guardrailEngine.checkInput(params);
    const startTime = Date.now();
    const result = await doGenerate();
    await guardrailEngine.checkOutput(result);
    await usageTracker.record({ ...result.usage, latencyMs: Date.now() - startTime });
    await budgetService.updateCounters(result.usage);
    return result;
  },
  wrapStream: async ({ doStream, params }) => {
    // Same chain but for streaming responses
    await guardrailEngine.checkInput(params);
    const startTime = Date.now();
    const { stream, ...rest } = await doStream();
    // Wrap stream to track usage on completion
    const trackedStream = trackStreamUsage(stream, startTime);
    return { stream: trackedStream, ...rest };
  },
};
```

**Why this pattern**: The Vercel AI SDK natively supports middleware via `wrapLanguageModel`. This avoids building a custom interception layer and ensures compatibility with all AI SDK features (streaming, tool calling, structured output).

---

### 4. Strategy Pattern -- Model Resolution

Model resolution uses the Strategy pattern to try multiple resolution strategies in order until one succeeds.

```
  Input: "fast" (model identifier)
       |
       v
  Strategy 1: Alias Lookup
  +----------------------------------+
  | SELECT * FROM ai_model_aliases   |
  | WHERE alias = 'fast'             |
  | AND enabled = true               |
  +----------------------------------+
       |
       | not found?
       v
  Strategy 2: Direct Provider:Model
  +----------------------------------+
  | Parse "openai:gpt-4o-mini"       |
  | Resolve provider slug + model ID |
  +----------------------------------+
       |
       | not found?
       v
  Strategy 3: Config Cascade Default
  +----------------------------------+
  | GET /api/module-configs/resolve   |
  |   ?moduleName=ai                  |
  |   &key=DEFAULT_LANGUAGE_MODEL     |
  |   &tenantId={tenantId}            |
  +----------------------------------+
       |
       | not found?
       v
  Strategy 4: Fallback Chain
  +----------------------------------+
  | Use provider's defaultModel       |
  | or global hardcoded fallback      |
  +----------------------------------+
       |
       v
  Resolved: { provider: openai, modelId: 'gpt-4o-mini' }
```

**Why this pattern**: Different callers specify models differently -- agents use aliases, direct API callers use `provider:model` notation, and some callers don't specify a model at all. The strategy chain handles all cases gracefully with clear precedence.

---

### 5. Factory Pattern -- createProvider

Provider instances are constructed by a factory function that reads database configuration and returns a fully configured Vercel AI SDK provider.

```typescript
function createProvider(config: AiProviderRow): ProviderInstance {
  const sdkProviderMap: Record<string, Function> = {
    openai:    () => createOpenAI({ apiKey: decrypt(config.apiKey), baseURL: config.baseUrl }),
    anthropic: () => createAnthropic({ apiKey: decrypt(config.apiKey) }),
    google:    () => createGoogleGenerativeAI({ apiKey: decrypt(config.apiKey) }),
  };

  const factory = sdkProviderMap[config.providerType];
  if (!factory) throw new Error(`Unknown provider type: ${config.providerType}`);

  const sdkProvider = factory();
  const aliasMap = buildAliasMap(config.id); // aliases pointing to this provider

  return customProvider({
    languageModels: aliasMap.language,
    embeddingModels: aliasMap.embedding,
    imageModels: aliasMap.image,
    fallbackProvider: sdkProvider,
  });
}
```

**Why this pattern**: Each provider type requires different constructor parameters and SDK packages. The factory centralizes this mapping and produces a uniform `customProvider` interface regardless of the underlying SDK.

---

### 6. Observer Pattern -- Usage Event Stream

Usage events flow through an observable stream for real-time dashboard updates and cross-module reactions.

```
  AI Call Completes
       |
       v
  UsageTracker.record()
       |
       +---> INSERT into ai_usage_logs (persistent)
       |
       +---> EventBus.emit('ai.tool.invoked', payload)
       |         |
       |         +---> module-subscriptions listener
       |         |     (UsageMeteringService.recordUsage)
       |         |
       |         +---> Budget checker listener
       |         |     (check thresholds, emit warnings)
       |         |
       |         +---> Dashboard SSE listener
       |               (real-time usage counter)
       |
       +---> BudgetService.updateCounters()
                 |
                 +---> If threshold exceeded:
                       EventBus.emit('ai.usage.budgetWarning')
                       EventBus.emit('ai.usage.budgetExceeded')
```

**Why this pattern**: Multiple subsystems need to react to AI usage (subscriptions metering, budget enforcement, real-time dashboards, audit logs). The Observer pattern decouples the usage recorder from all consumers.

---

### 7. Decorator Pattern -- Middleware Decorators

Individual middleware functions act as decorators, each adding a specific concern (logging, timing, error handling) without modifying the core AI call.

```
  Base Model (from Vercel AI SDK)
       |
       v
  wrapLanguageModel({
    model: baseModel,
    middleware: usageTrackingMiddleware,
  })
       |
       v
  wrapLanguageModel({
    model: trackedModel,
    middleware: rateLimitingMiddleware,
  })
       |
       v
  wrapLanguageModel({
    model: rateLimitedModel,
    middleware: guardrailMiddleware,
  })
       |
       v
  wrapLanguageModel({
    model: guardrailedModel,
    middleware: loggingMiddleware,
  })
       |
       v
  Final Decorated Model
  (all middleware applied in stack order)
```

**Composability**: Middleware can be conditionally applied. For example, guardrail middleware is only added when the tenant has guardrail rules configured. Logging middleware respects data sensitivity settings (e.g., omit prompt content for healthcare tenants).

---

## Middleware Chain -- Detailed Flow

```
  +-------------------------------------------------------------------+
  |                    AI Request Lifecycle                            |
  +-------------------------------------------------------------------+
  |                                                                   |
  |  1. REQUEST ARRIVES                                               |
  |     POST /api/ai/generate { model: "fast", prompt: "..." }       |
  |                                                                   |
  |  2. RESOLVE PROVIDER                                              |
  |     "fast" --> alias lookup --> openai:gpt-4o-mini                |
  |     Construct AI SDK provider from DB config                      |
  |                                                                   |
  |  3. CHECK QUOTA                                                   |
  |     a. Check tenant budget (ai_budgets WHERE scope='tenant')      |
  |     b. Check provider rate limit (ai_providers.rateLimitRpm)      |
  |     c. Check subscription quota (UsageMeteringService)            |
  |     --> If exceeded: return 429 with retry-after header           |
  |                                                                   |
  |  4. APPLY INPUT GUARDRAILS                                        |
  |     a. Load rules: ai_guardrails WHERE scope IN ('input','both')  |
  |     b. Run keyword/regex/classifier checks on prompt              |
  |     --> If blocked: return 422 with guardrail violation message   |
  |                                                                   |
  |  5. MERGE DEFAULT SETTINGS                                        |
  |     a. Model alias defaults (temperature, maxTokens)              |
  |     b. Provider defaults (from ai_providers.config)               |
  |     c. Config cascade defaults (module-config)                    |
  |                                                                   |
  |  6. EXECUTE AI CALL                                               |
  |     const result = await generateText({                           |
  |       model: wrappedModel,                                        |
  |       prompt: sanitizedPrompt,                                    |
  |       ...mergedSettings,                                          |
  |     });                                                           |
  |                                                                   |
  |  7. APPLY OUTPUT GUARDRAILS                                       |
  |     a. Run keyword/regex/classifier checks on response            |
  |     --> If action='block': return 422                             |
  |     --> If action='modify': redact flagged content                |
  |     --> If action='warn': log warning, return response            |
  |                                                                   |
  |  8. TRACK USAGE                                                   |
  |     INSERT INTO ai_usage_logs {                                   |
  |       tenantId, providerId, modelId, toolName,                    |
  |       inputTokens, outputTokens, totalTokens,                    |
  |       costCents, latencyMs, status, requestMetadata               |
  |     }                                                             |
  |                                                                   |
  |  9. UPDATE BUDGET COUNTERS                                        |
  |     UPDATE ai_budgets SET currentTokens += totalTokens,           |
  |       currentCostCents += costCents                               |
  |     --> If alertThresholdPct reached: emit budgetWarning          |
  |     --> If limit exceeded: emit budgetExceeded                    |
  |                                                                   |
  | 10. RETURN RESPONSE                                               |
  |     { text, usage: { inputTokens, outputTokens }, finishReason }  |
  |                                                                   |
  +-------------------------------------------------------------------+
```

---

## Provider Resolution -- Detailed Flow

```
  +---------------------------------------------------------------+
  |                  Provider Resolution                          |
  +---------------------------------------------------------------+
  |                                                               |
  |  Input: modelIdentifier (string)                              |
  |                                                               |
  |  STEP 1: Parse identifier format                              |
  |  +------+---------------------------+                         |
  |  | Case | Example                   |                         |
  |  +------+---------------------------+                         |
  |  | (a)  | "fast"        (alias)     |                         |
  |  | (b)  | "openai:gpt-4o-mini"      |                         |
  |  | (c)  | null/undefined (no model) |                         |
  |  +------+---------------------------+                         |
  |                                                               |
  |  STEP 2: Resolve by case                                      |
  |                                                               |
  |  Case (a) - Alias:                                            |
  |    SELECT * FROM ai_model_aliases                             |
  |    WHERE alias = 'fast' AND enabled = true                    |
  |       |                                                       |
  |       +--> Found: { providerId: 1, modelId: 'gpt-4o-mini' }  |
  |       |    Resolve provider by ID from registry               |
  |       |                                                       |
  |       +--> Not found: fall through to case (c)                |
  |                                                               |
  |  Case (b) - Direct:                                           |
  |    Split on ':' --> providerSlug='openai', modelId='gpt-4o-mini' |
  |    Look up provider by slug in registry                       |
  |       |                                                       |
  |       +--> Found: use that provider + model                   |
  |       +--> Not found: throw ProviderNotFoundError             |
  |                                                               |
  |  Case (c) - Default:                                          |
  |    Resolve DEFAULT_LANGUAGE_MODEL from config cascade          |
  |    (tenant override > platform default > schema default)      |
  |       |                                                       |
  |       +--> Resolved to alias/direct: recurse                  |
  |       +--> Still null: use first enabled provider's default   |
  |                                                               |
  |  STEP 3: Construct wrapped model                              |
  |    const model = provider(modelId);                           |
  |    return wrapLanguageModel({                                 |
  |      model,                                                   |
  |      middleware: buildMiddlewareStack(context),                |
  |    });                                                        |
  |                                                               |
  +---------------------------------------------------------------+
```

---

## Cost Calculation Model

Module AI uses a two-layer cost model:

```
  +-----------------------------------+
  |        Cost Calculation           |
  +-----------------------------------+
  |                                   |
  |  Layer 1: Upstream Cost           |
  |  (What OVEN pays the provider)    |
  |                                   |
  |  costCents = (inputTokens         |
  |    * model.inputPricePerMToken    |
  |    / 1_000_000 * 100)             |
  |  + (outputTokens                  |
  |    * model.outputPricePerMToken   |
  |    / 1_000_000 * 100)             |
  |                                   |
  |  Layer 2: Tenant Overage Cost     |
  |  (What tenant pays for overages)  |
  |                                   |
  |  If tenant is over plan quota:    |
  |    overageCost = overageTokens    |
  |      * plan.overageRatePerToken   |
  |                                   |
  |  Tracked via:                     |
  |    module-subscriptions           |
  |    UsageMeteringService           |
  +-----------------------------------+
```

Model pricing is stored in the provider config JSONB and kept up-to-date via periodic sync or manual entry. The upstream cost is logged in `ai_usage_logs.costCents`. The tenant overage cost is calculated by `module-subscriptions` based on plan quota thresholds.

# Module AI — Overview

> **Package**: `packages/module-ai/`
> **Name**: `@oven/module-ai`
> **Dependencies**: `module-registry`, `module-roles`
> **Status**: Phase 1 (Planned)
> **Spec**: [`docs/modules/12-ai.md`](../12-ai.md)

---

## What It Does

Module AI is the **unified AI services foundation layer** for the OVEN platform. It provides a provider-agnostic abstraction over language models, embedding engines, image generators, and vector databases -- all wrapped in a curated **tool catalog** with Zod-based schemas that any agent workflow, chat session, or module can consume.

Rather than every module implementing its own LLM integration, module-ai centralizes:

- **Provider management** -- Configure API keys, select models, set defaults, and switch providers from the dashboard without code changes.
- **Model alias registry** -- Map friendly names (`fast`, `smart`, `cheap`) to specific provider:model pairs. Resolution chains support fallbacks.
- **Text generation** -- `generateText`, `streamText`, `generateObject` via the Vercel AI SDK, with middleware for usage tracking and guardrails.
- **Embeddings** -- `embed`, `embedMany` with configurable models and dimensions.
- **Image generation** -- `generateImage` with provider-specific options (size, quality, style).
- **Vector store management** -- CRUD stores with pluggable adapters (pgvector, Pinecone).
- **Usage tracking** -- Per-call logging with token counts, costs, latency, and attribution.
- **Budget management** -- Spending limits with alerts at configurable thresholds.
- **Guardrails** -- Input/output content filtering with keyword, regex, and classifier rules.
- **Tool catalog** -- Every AI capability registered as a discoverable tool with Zod schemas.

---

## Why It Exists

Without `module-ai`, every agent, workflow, or feature that needs AI would re-implement provider setup, key management, usage tracking, and error handling. Module AI is the **single point of control** for all AI operations on the platform, ensuring:

1. **Consistency** -- All AI calls go through the same middleware chain (auth, quota check, execution, usage tracking).
2. **Observability** -- Every token, every dollar, every millisecond is logged and attributable.
3. **Cost control** -- Budgets and rate limits are enforced centrally, not per-feature.
4. **Swappability** -- Switching from OpenAI to Anthropic is a config change, not a code change.
5. **Discoverability** -- Agents find AI tools through the Module Registry, not hardcoded imports.

---

## Architectural Position

```
module-chat  -->  module-agent-core  -->  module-workflow-agents
     |                    |                         |
     |  uses @ai-sdk/react hooks                    |
     |                    |                         |
     +--------------------+-------------------------+
                          | all discover & invoke tools from
                          v
                    +-------------+
                    |  module-ai  |  <-- FOUNDATION LAYER
                    |             |
                    |  Provider   |  <-- @ai-sdk/openai, @ai-sdk/anthropic,
                    |  Registry   |      @ai-sdk/google
                    |             |
                    |  Tool       |  <-- generateText, streamText, embed,
                    |  Catalog    |      generateImage, generateObject
                    |             |
                    |  Vector DB  |  <-- pgvector, Pinecone adapters
                    |  Adapters   |
                    |             |
                    |  Usage      |  <-- token metering, cost tracking,
                    |  Tracking   |      rate limiting, budgets
                    +-------------+
                          |
                          | integrates with
                          v
                  module-subscriptions
                  (UsageMeteringService,
                   plan quotas, service catalog)
```

Module AI has **no upstream module dependencies** beyond `module-registry` and `module-roles`. It is a foundation layer -- depended upon by `module-knowledge-base`, `module-agent-core`, `module-workflow-agents`, and `module-chat`, but importing none of them.

---

## Quick Start

### 1. Install dependencies

```bash
pnpm add ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google
```

### 2. Register the module

```typescript
// apps/dashboard/src/lib/modules.ts
import { aiModule } from '@oven/module-ai';

registry.register(aiModule);  // after registry, roles
```

### 3. Run migrations and seed

```bash
pnpm db:migrate
pnpm db:seed
```

This creates the 8 AI tables and seeds:
- Module permissions (17 permission slugs)
- 6 AI service entries in the subscription service catalog (LLM prompt tokens, completion tokens, embeddings, image generation, vector queries, agent executions)
- Default config entries (`DEFAULT_LANGUAGE_MODEL`, `DEFAULT_EMBEDDING_MODEL`, etc.)

### 4. Add a provider via dashboard

Navigate to **Dashboard > AI Services > Providers > Create**. Enter:
- Name: "OpenAI Production"
- Slug: `openai`
- Type: `openai`
- API Key: your key (encrypted at rest)

### 5. Create a model alias

Navigate to **AI Services > Model Aliases > Create**:
- Alias: `fast`
- Provider: OpenAI Production
- Model: `gpt-4o-mini`
- Type: `text`

### 6. Test from the playground

Navigate to **AI Services > Playground > Text Generation**:
- Select model `fast`
- Enter a prompt
- Click Generate

---

## Key Exports

```typescript
// ModuleDefinition
export const aiModule: ModuleDefinition;

// Schema (Drizzle tables)
export {
  aiProviders,
  aiModelAliases,
  aiVectorStores,
  aiUsageLogs,
  aiBudgets,
  aiBudgetAlerts,
  aiTools,
  aiGuardrails,
} from './schema';

// Types
export type {
  AiProvider,
  AiModelAlias,
  AiVectorStore,
  AiUsageLog,
  AiBudget,
  AiBudgetAlert,
  AiTool,
  AiGuardrail,
  VectorStoreAdapter,
  ProviderConfig,
  MiddlewareContext,
} from './types';

// Seed
export { seedAi } from './seed';

// Adapters (interfaces -- implementations in separate packages)
export type { VectorStoreAdapter } from './adapters/types';
```

---

## Package Dependencies

| Dependency | Purpose |
|-----------|---------|
| `ai` | Vercel AI SDK core -- `generateText`, `streamText`, `embed`, `generateImage`, `generateObject` |
| `@ai-sdk/openai` | OpenAI provider (language, embeddings, image, TTS) |
| `@ai-sdk/anthropic` | Anthropic provider (language, vision) |
| `@ai-sdk/google` | Google Generative AI provider (language, embeddings, image) |
| `zod` | Schema definitions for tool inputs/outputs |
| `drizzle-orm` | Database ORM for schema and queries |
| `@oven/module-registry` | Module registration, API utilities, EventBus |

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [Architecture](./architecture.md) | Design patterns and middleware chain |
| [Module Design](./module-design.md) | Component diagram and data flows |
| [Detailed Requirements](./detailed-requirements.md) | Functional requirements with acceptance criteria |
| [Use-Case Compliance](./use-case-compliance.md) | Mapping to platform use cases |
| [API Reference](./api.md) | All endpoints with request/response schemas |
| [Database Schema](./database.md) | 8 tables with column-level documentation |
| [Security](./secure.md) | Encryption, permissions, guardrails |
| [References](./references.md) | External links and industry references |
| [Dashboard UI](./UI.md) | React Admin resources, playground, usage dashboard |

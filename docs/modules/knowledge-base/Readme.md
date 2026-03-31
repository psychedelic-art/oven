# Module: Knowledge Base

> **Package**: `packages/module-knowledge-base/`
> **npm**: `@oven/module-knowledge-base`
> **Phase**: 2 (depends on module-ai)
> **Status**: Planned

---

## What It Does

The Knowledge Base module provides structured FAQ and knowledge management for OVEN tenants. It stores question-answer entries organized into categories, automatically embeds their text into vectors via `module-ai`, and exposes a hybrid semantic + keyword search engine that other modules (agents, chat, UI flows) use to find answers.

Every tenant gets their own isolated knowledge base. When a tenant's team creates or updates an FAQ entry, the module automatically concatenates the question and answer, sends the text through the embedding pipeline, and stores the resulting vector in a pgvector column. Search queries follow the same path in reverse: embed the query, find the closest vectors, and return ranked results with confidence scores.

## Why It Exists: FAQ-First, LLM-Last

The OVEN agent architecture follows an **FAQ-first** principle. When a patient asks a question through WhatsApp, the web chat widget, or any other channel, the agent workflow searches the knowledge base before calling an LLM. If a confident match is found (above the configurable threshold), the curated FAQ answer is returned directly. Only when no confident match exists does the agent fall back to LLM generation.

This approach delivers three benefits:

1. **Cost control** -- FAQ lookups cost a fraction of LLM calls. A single embedding query replaces a GPT-4 completion for the majority of incoming questions.
2. **Consistency** -- Curated answers ensure the same question always gets the same vetted response, regardless of LLM temperature or prompt drift.
3. **Scope containment** -- The knowledge base defines the boundary of what the agent can answer. Questions outside the KB naturally fall to the LLM fallback, where guardrails can apply.

## Quick Start

1. Register the module in `apps/dashboard/src/lib/modules.ts` after `aiModule` and `tenantsModule`.
2. Run the seed to create permissions and public endpoint declarations.
3. Navigate to **Knowledge Base > Categories** in the dashboard and create your first category.
4. Add entries under that category. Each entry auto-embeds on save.
5. Open **Knowledge Base > Search Test** to verify semantic search returns relevant results.
6. Point your agent workflow's RAG node at the `knowledge-base/[tenantSlug]/search` endpoint.

## Package Location

```
packages/module-knowledge-base/
  package.json
  tsconfig.json
  src/
    index.ts              -- ModuleDefinition + re-exports
    schema.ts             -- Drizzle tables: kb_categories, kb_entries, kb_entry_versions
    types.ts              -- TypeScript interfaces
    seed.ts               -- Permissions, public endpoints, default categories
    api/
      kb-categories.handler.ts
      kb-categories-by-id.handler.ts
      kb-entries.handler.ts
      kb-entries-by-id.handler.ts
      kb-entries-versions.handler.ts
      kb-entries-versions-restore.handler.ts
      knowledge-base-search.handler.ts
      knowledge-base-ingest.handler.ts
      knowledge-base-stats.handler.ts
    lib/
      embedding-pipeline.ts   -- Extract, transform, embed, store, notify
      search-engine.ts         -- Semantic, keyword, and hybrid search strategies
      bulk-processor.ts        -- Queue-based re-embedding with progress
      version-manager.ts       -- Auto-snapshot and restore logic
```

## Dependencies

| Dependency | Role |
|---|---|
| `module-registry` | ModuleDefinition registration, API utilities, EventBus |
| `module-ai` | `ai.embed()` for vector generation, quota tracking via `ai-embeddings` service |
| `module-tenants` | Tenant scoping, slug resolution |
| `module-config` | Per-tenant config cascade (embedding model, confidence threshold, max results) |
| `module-subscriptions` | Embedding and search quota enforcement |

## Key Exports

```typescript
// ModuleDefinition
export { knowledgeBaseModule } from './index';

// Schema (Drizzle tables)
export { kbCategories, kbEntries, kbEntryVersions } from './schema';

// Types
export type {
  KBCategory,
  KBEntry,
  KBEntryVersion,
  KBSearchResult,
  KBSearchResponse,
  EmbeddingStatus,
  BulkIngestProgress,
} from './types';

// Seed
export { seedKnowledgeBase } from './seed';
```

## Events Emitted

| Event | When |
|---|---|
| `kb.category.created` | Category inserted |
| `kb.category.updated` | Category modified |
| `kb.category.deleted` | Category removed |
| `kb.entry.created` | Entry inserted (before embedding) |
| `kb.entry.updated` | Entry modified (triggers re-embed if Q or A changed) |
| `kb.entry.deleted` | Entry removed |
| `kb.entry.embedded` | Embedding stored successfully |
| `kb.search.executed` | Search query processed (with result metrics) |

## Related Documentation

| Document | Description |
|---|---|
| [Architecture](./architecture.md) | Pipeline, strategy, and observer patterns |
| [Module Design](./module-design.md) | Component graph and data flow |
| [Requirements](./detailed-requirements.md) | Functional requirements with acceptance criteria |
| [API Reference](./api.md) | All endpoints with request/response schemas |
| [Database](./database.md) | Table schemas, pgvector details, indexing |
| [Security](./secure.md) | Permissions, public endpoints, tenant isolation |
| [UI Design](./UI.md) | Dashboard screens and component specs |
| [Use-Case Compliance](./use-case-compliance.md) | Mapping to platform use cases |
| [References](./references.md) | External resources and prior art |

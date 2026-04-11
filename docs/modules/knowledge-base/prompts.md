# Module Knowledge Base — Implementation Prompt

> Condensed directive for implementing `packages/module-knowledge-base`.
> References all docs in this folder. Use as baseline context for any implementation agent.

---

## Identity

- **Package**: `packages/module-knowledge-base`
- **Name**: `@oven/module-knowledge-base`
- **Type**: ModuleDefinition (full module)
- **Phase**: 2 (depends on module-ai)
- **Dependencies**: `module-registry`, `module-ai`, `module-tenants`
- **Depended on by**: module-agent-core (kb.search tool), module-chat (FAQ answers), module-workflow-agents (agent.rag node)

## Mission

Build a structured FAQ and knowledge management system with categories, question-answer entries, an embedding pipeline, and hybrid semantic + keyword search. This is the **primary knowledge source for AI agents** — the FAQ-first, LLM-last architecture means agents search KB before falling back to LLM generation. Each tenant has isolated KB content.

## Key Constraints

- **Monorepo**: pnpm + Turborepo. Raw TypeScript exports.
- **Framework**: Next.js 15, Drizzle ORM, Neon PostgreSQL with pgvector extension
- **Styling**: MUI 7 + sx prop (dashboard). NO inline styles.
- **Vector column**: `vector('embedding', { dimensions: 1536 })` on kb_entries — requires pgvector
- **Embedding**: All embedding calls go through module-ai's embed tool (never call OpenAI directly)
- **Usage tracking**: Each embed → track `ai-embeddings` service. Each search → track `ai-vector-queries`.
- **Public endpoint**: `/knowledge-base/[tenantSlug]/search` is PUBLIC (no auth) but rate-limited
- **TDD**: Tests before implementation
- **No cross-module imports**: Use EventBus, REST API, Registry only

## Architecture (see `architecture.md`)

1. **EmbeddingPipeline** — Entry saved → concat question + " " + answer → call module-ai `ai.embed()` → store vector in `kb_entries.embedding` → emit `kb.entry.embedded`
2. **SearchEngine** — Hybrid search:
   - Semantic: `SELECT *, 1 - (embedding <=> $queryVector) AS score FROM kb_entries WHERE tenant_id = $t AND enabled = true ORDER BY embedding <=> $queryVector LIMIT $k`
   - Keyword: JSONB `keywords` column text matching
   - Hybrid: weighted combination (configurable per tenant)
3. **BulkProcessor** — Queue all entries for re-embedding. Progress tracking via event emission. Used when switching embedding models or initial import.
4. **VersionManager** — Auto-snapshot entry state to `kb_entry_versions` on PUT if question or answer changed.

## Database (see `database.md`)

3 tables:

**`kb_categories`**
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| tenantId | integer NOT NULL | + index |
| name | varchar(255) | |
| slug | varchar(128) | unique per tenant: `unique(tenantId, slug)` |
| description | text | |
| icon | varchar(50) | MUI icon name |
| order | integer, default 0 | For drag-and-drop sorting |
| enabled | boolean, default true | |
| createdAt, updatedAt | timestamp | |

**`kb_entries`**
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| tenantId | integer NOT NULL | + index |
| categoryId | integer NOT NULL | + index, FK to kb_categories (plain int, no references()) |
| question | text NOT NULL | The FAQ question |
| answer | text NOT NULL | The approved answer |
| keywords | jsonb | String array for fallback matching |
| embedding | vector(1536) | pgvector column — cosine similarity search |
| priority | integer, default 0 | Higher wins ties |
| language | varchar(10), default 'es' | |
| enabled | boolean, default true | |
| version | integer, default 1 | Incremented on definition change |
| metadata | jsonb | Arbitrary key-value |
| createdAt, updatedAt | timestamp | |

**`kb_entry_versions`**
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| entryId | integer NOT NULL | + index |
| version | integer NOT NULL | unique(entryId, version) |
| question | text NOT NULL | Snapshot |
| answer | text NOT NULL | Snapshot |
| keywords | jsonb | Snapshot |
| description | text | Optional changelog note |
| createdAt | timestamp | |

## API Endpoints (see `api.md`)

10 endpoints:

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | /api/kb-categories | Auth | List categories (tenant filter) |
| POST | /api/kb-categories | Auth | Create category |
| GET | /api/kb-categories/[id] | Auth | Get category |
| PUT | /api/kb-categories/[id] | Auth | Update category |
| DELETE | /api/kb-categories/[id] | Auth | Delete category |
| GET | /api/kb-entries | Auth | List entries (category/tenant/enabled/language filters) |
| POST | /api/kb-entries | Auth | Create entry (auto-embeds) |
| GET | /api/kb-entries/[id] | Auth | Get entry |
| PUT | /api/kb-entries/[id] | Auth | Update entry (auto-re-embeds if Q/A changed) |
| DELETE | /api/kb-entries/[id] | Auth | Delete entry |
| GET | /api/kb-entries/[id]/versions | Auth | List entry version history |
| POST | /api/kb-entries/[id]/versions/[versionId]/restore | Auth | Restore old version |
| POST | /api/knowledge-base/[tenantSlug]/search | **PUBLIC** | Semantic + keyword hybrid search |
| POST | /api/knowledge-base/[tenantSlug]/ingest | Auth | Bulk re-embed all entries |
| GET | /api/knowledge-base/[tenantSlug]/stats | Auth | Entry count, category breakdown |

**Search request/response**:
```typescript
// POST /api/knowledge-base/clinic-xyz/search
// Request:
{ "query": "What are your hours?", "maxResults": 5 }

// Response:
{
  "results": [
    { "id": 42, "question": "...", "answer": "...", "category": "Horarios",
      "score": 0.94, "matchType": "semantic" }
  ],
  "totalResults": 2,
  "confidenceThreshold": 0.8,
  "topResultConfident": true
}
```

## Events

| Event | Payload |
|-------|---------|
| `kb.category.created` | id, tenantId, name, slug |
| `kb.category.updated` | id, tenantId, name |
| `kb.category.deleted` | id, tenantId, slug |
| `kb.entry.created` | id, tenantId, categoryId, question, language |
| `kb.entry.updated` | id, tenantId, question, version |
| `kb.entry.deleted` | id, tenantId, question |
| `kb.entry.embedded` | id, tenantId, embeddingModel, dimensions |
| `kb.search.executed` | tenantId, query, resultCount, topScore, confident |

## Seed Data

Idempotent seed:
1. Permissions: `kb-categories.read/create/update/delete`, `kb-entries.read/create/update/delete`, `kb-entries.ingest`
2. Public endpoint registration: `knowledge-base/[tenantSlug]/search` → isPublic=true
3. Default dental FAQ categories (10): Agendamiento, Horarios, Ubicacion, Servicios, Pagos, Antes de la cita, Despues de la cita, Sintomas, Urgencias, Atencion humana

## Config Schema

| Key | Type | Default | Instance-Scoped |
|-----|------|---------|:---:|
| `MAX_ENTRIES_PER_TENANT` | number | 500 | Yes |
| `EMBEDDING_MODEL` | string | `text-embedding-3-small` | Yes |
| `EMBEDDING_DIMENSIONS` | number | 1536 | No |
| `SEARCH_CONFIDENCE_THRESHOLD` | number | 0.8 | Yes |
| `SEARCH_MAX_RESULTS` | number | 5 | Yes |
| `SEARCH_RATE_LIMIT_RPM` | number | 30 | Yes |

## Chat Block (MCP discovery)

```typescript
chat: {
  description: 'FAQ and knowledge management with semantic search',
  capabilities: ['search FAQ entries', 'list categories', 'create entries', 'get entry details'],
  actionSchemas: [
    { name: 'kb.searchEntries', endpoint: { method: 'POST', path: 'knowledge-base/[tenantSlug]/search' }, ... },
    { name: 'kb.listEntries', endpoint: { method: 'GET', path: 'kb-entries' }, ... },
    { name: 'kb.getEntry', endpoint: { method: 'GET', path: 'kb-entries/[id]' }, ... },
  ]
}
```

## Dashboard UI (see `UI.md`)

12 component files in `apps/dashboard/src/components/knowledge-base/`:
- CategoryList (drag-and-drop sortable), CategoryCreate, CategoryEdit
- EntryList (filterable, embedding status badges), EntryCreate, EntryEdit, EntryShow
- KBSearchTest (split view: query → results with confidence scores)
- KBBulkActions (import CSV/JSON, export, re-embed all with progress bar)
- EmbeddingStatusBadge (reusable: ✓ green / ⟳ yellow / ✗ red)

Menu section: `──── Knowledge Base ────` with Categories, Entries, Search Test, Bulk Actions

## Security (see `secure.md`)

- Public search: rate-limited, tenant-slug scoped, no user data exposed
- Tenant isolation: all queries filter by tenantId
- Embedding vectors: not sensitive themselves, but Q&A content may be — RLS applies
- Bulk ingest: requires `kb-entries.ingest` permission
- SQL injection: parameterized queries for vector operations (Drizzle handles this)

## Test Plan (TDD)

1. `embedding-pipeline.test.ts` — embed on create, re-embed on update, handle failure, status tracking
2. `search-engine.test.ts` — semantic search, keyword search, hybrid scoring, threshold filtering
3. `bulk-processor.test.ts` — batch embedding, progress tracking, error handling
4. `version-manager.test.ts` — auto-snapshot on change, restore, no snapshot if unchanged
5. `api/kb-categories.test.ts` — CRUD with tenant scoping, ordering
6. `api/kb-entries.test.ts` — CRUD with auto-embed, version increment
7. `api/search.test.ts` — public endpoint, rate limiting, result format
8. `api/ingest.test.ts` — bulk re-embed, progress, quota check

## File Structure

```
packages/module-knowledge-base/
  package.json
  tsconfig.json
  src/
    index.ts                      ← ModuleDefinition export
    schema.ts                     ← 3 Drizzle tables (+ pgvector column)
    types.ts                      ← TypeScript interfaces
    seed.ts                       ← Permissions + dental categories
    engine/
      embedding-pipeline.ts       ← Entry → embed → store vector
      search-engine.ts            ← Hybrid semantic + keyword search
      bulk-processor.ts           ← Batch re-embedding with progress
      version-manager.ts          ← Auto-snapshot on update
    api/
      kb-categories.handler.ts    ← GET (list), POST (create)
      kb-categories-by-id.handler.ts ← GET, PUT, DELETE
      kb-entries.handler.ts       ← GET (list), POST (create + auto-embed)
      kb-entries-by-id.handler.ts ← GET, PUT (re-embed), DELETE
      kb-entries-versions.handler.ts ← GET versions list
      kb-entries-versions-restore.handler.ts ← POST restore
      kb-search.handler.ts        ← POST public semantic search
      kb-ingest.handler.ts        ← POST bulk re-embed
      kb-stats.handler.ts         ← GET tenant stats
```

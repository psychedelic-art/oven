# Knowledge Base -- Module Design

> Internal component structure, dependency graph, data flows, and integration points.

---

## 1. Dependency Graph

```
                          module-knowledge-base
                         /          |          \
                        /           |           \
                module-ai     module-config    module-tenants
                   |               |
                   v               v
           (embedding calls)  (config cascade:
            (quota tracking)   threshold, model,
                               max results)

  Depended on by:
  +-----------------------+-------------------------------------+
  | module-agent-core     | kb.search registered as agent tool  |
  | module-workflow-agents| agent.rag node queries KB           |
  | module-chat           | FAQ answers before LLM fallback     |
  | module-notifications  | WhatsApp agent searches KB          |
  | module-ui-flows       | FAQ page type renders KB content    |
  +-----------------------+-------------------------------------+
```

### Dependency Details

| Module | Direction | Integration Mechanism |
|---|---|---|
| `module-ai` | KB depends on | REST API call to `ai.embed()` for vector generation |
| `module-config` | KB depends on | Config cascade resolve for per-tenant settings |
| `module-tenants` | KB depends on | Tenant slug resolution, tenant scoping |
| `module-subscriptions` | KB depends on (optional) | Quota check before bulk embedding operations |
| `module-agent-core` | Depends on KB | Discovers `kb.search` tool via `chat.actionSchemas` |
| `module-workflow-agents` | Depends on KB | `agent.rag` node calls KB search endpoint |
| `module-chat` | Depends on KB | Chat agents search KB for FAQ answers |
| `module-notifications` | Depends on KB | WhatsApp agent workflow searches KB |
| `module-ui-flows` | Depends on KB | FAQ page type fetches and renders KB categories/entries |

All cross-module communication uses REST API calls or EventBus. No direct imports between module packages (per Rule 3.1).

---

## 2. Internal Components

```
  module-knowledge-base/src/
  |
  +-- index.ts                    ModuleDefinition (knowledgeBaseModule)
  |
  +-- schema.ts                   Drizzle table definitions
  |     kbCategories
  |     kbEntries
  |     kbEntryVersions
  |
  +-- types.ts                    TypeScript interfaces
  |     KBCategory, KBEntry, KBEntryVersion
  |     KBSearchResult, KBSearchResponse
  |     EmbeddingStatus, BulkIngestProgress
  |
  +-- seed.ts                     Idempotent seed function
  |     seedKnowledgeBase()
  |
  +-- lib/
  |     +-- embedding-pipeline.ts   EmbeddingPipeline class
  |     +-- search-engine.ts        SearchEngine + strategy implementations
  |     +-- bulk-processor.ts       BulkProcessor with progress tracking
  |     +-- version-manager.ts      VersionManager for snapshot/restore
  |     +-- text-transform.ts       Text normalization and truncation utils
  |
  +-- api/
        +-- kb-categories.handler.ts            GET (list), POST (create)
        +-- kb-categories-by-id.handler.ts      GET, PUT, DELETE
        +-- kb-entries.handler.ts               GET (list), POST (create + auto-embed)
        +-- kb-entries-by-id.handler.ts         GET, PUT (re-embed), DELETE
        +-- kb-entries-versions.handler.ts      GET (version history)
        +-- kb-entries-versions-restore.handler.ts  POST (restore version)
        +-- knowledge-base-search.handler.ts    POST (public search)
        +-- knowledge-base-ingest.handler.ts    POST (bulk re-embed)
        +-- knowledge-base-stats.handler.ts     GET (tenant stats)
```

### Component Responsibilities

**CategoryManager** (embedded in category handlers):
- CRUD operations for `kb_categories`
- Tenant-scoped filtering
- Drag-reorder via `order` column updates
- Auto-slug generation from name
- Cascade disable: when a category is disabled, its entries are excluded from search (not disabled themselves)

**EntryManager** (embedded in entry handlers):
- CRUD operations for `kb_entries`
- Auto-embed on create and content-change update
- Version auto-snapshot on update
- Keyword normalization (lowercase, deduplicate, trim)
- Priority management (higher priority wins ties in search results)

**EmbeddingPipeline** (`lib/embedding-pipeline.ts`):
- Five-stage pipeline: extract, transform, embed, store, notify
- Configurable embedding model per tenant
- Error handling with status tracking in metadata JSONB
- Token-aware text truncation (respects model's max input tokens)
- Usage tracking via `module-subscriptions` (`ai-embeddings` service)

**SearchEngine** (`lib/search-engine.ts`):
- Strategy resolver: reads `SEARCH_STRATEGY` from config cascade
- SemanticSearch: pgvector cosine similarity query
- KeywordSearch: JSONB `?|` operator + ILIKE fallback
- HybridSearch: runs semantic, then keyword if below threshold, merges with weighted scoring
- Query preprocessing: sanitize, normalize, language detection
- Result formatting with match type badges and confidence scores

**BulkProcessor** (`lib/bulk-processor.ts`):
- Job creation with UUID tracking
- Sequential processing with configurable delay (rate limiting)
- In-memory progress map (total, done, failed, status)
- Cancellation support
- Quota pre-check before starting

**VersionManager** (`lib/version-manager.ts`):
- Auto-snapshot: captures current state before update
- Version numbering: monotonic increment per entry
- Restore: copies version snapshot back to main entry, increments version
- Diff support: compares two versions for display

---

## 3. Data Flow Diagrams

### 3.1 Entry Lifecycle

```
  Dashboard UI                API Layer               Database           module-ai
  ============               =========               ========           =========
       |                         |                       |                   |
  [Create Entry] --POST-------> |                       |                   |
       |                    validate input               |                   |
       |                    insert row  --------------->  |                   |
       |                    set status=pending            |                   |
       |                    emit kb.entry.created         |                   |
       |                         |                       |                   |
       |                    EmbeddingPipeline             |                   |
       |                    .process(id)                  |                   |
       |                         | read entry <--------- |                   |
       |                         | concat Q+A            |                   |
       |                         | ai.embed() --------------------------->  |
       |                         |              <-- vector ---------------  |
       |                         | store vector -------> |                   |
       |                         | emit kb.entry.embedded |                  |
       |                         |                       |                   |
  [Search] --------POST-------> |                       |                   |
       |                    preprocess query              |                   |
       |                    ai.embed(query) -----------------------------> |
       |                         |              <-- vector ---------------  |
       |                    SELECT ... ORDER BY          |                   |
       |                    embedding <=> vector ------> |                   |
       |                         | <--- ranked rows ---  |                   |
       |                    format response               |                  |
       | <--- results ---        |                       |                   |
```

### 3.2 Config Resolution at Runtime

```
  Handler needs SEARCH_CONFIDENCE_THRESHOLD for tenant 5
       |
       v
  GET /api/module-configs/resolve
    ?moduleName=knowledge-base
    &key=SEARCH_CONFIDENCE_THRESHOLD
    &tenantId=5
       |
       v
  Config Cascade checks (in order):
    1. Tenant 5 instance override    --> not found
    2. Tenant 5 module default       --> found: 0.75
    3. Platform instance override    --> (skipped)
    4. Platform module default       --> (skipped)
    5. Schema default                --> 0.8 (skipped)
       |
       v
  Returns: { value: 0.75, source: 'tenant-module' }
```

### 3.3 Agent Integration Flow

```
  Patient sends WhatsApp message
       |
       v
  module-notifications receives webhook
  Emits: notifications.message.received
       |
       v
  Wiring triggers agent workflow
       |
       v
  module-workflow-agents executes workflow
       |
       v
  agent.rag node (Tool Wrapper)
       |
       v
  POST /api/knowledge-base/[tenantSlug]/search
  { "query": "patient's question" }
       |
       v
  module-knowledge-base returns:
  { results: [...], topResultConfident: true }
       |
       v
  Workflow checks topResultConfident:
    true  --> return FAQ answer directly
    false --> fall through to agent.llm node (LLM generation)
       |
       v
  Response sent back to patient via WhatsApp
```

---

## 4. Integration Contracts

### 4.1 With module-ai

**Embedding call**:
```typescript
// Knowledge Base calls module-ai via REST
POST /api/ai/embed
{
  "text": "concatenated question and answer text",
  "model": "text-embedding-3-small",    // from config cascade
  "trackUsage": {
    "service": "ai-embeddings",
    "tenantId": 5
  }
}

// Response
{
  "vector": [0.0123, -0.0456, ...],    // 1536 floats
  "model": "text-embedding-3-small",
  "dimensions": 1536,
  "tokensUsed": 42
}
```

### 4.2 With module-subscriptions

**Quota check before bulk ingest**:
```typescript
// Check remaining embedding quota
GET /api/subscription-quotas/check
  ?tenantId=5
  &service=ai-embeddings
  &requested=150                         // number of entries to embed

// Response
{
  "allowed": true,
  "remaining": 800,
  "limit": 1000,
  "period": "monthly"
}
```

### 4.3 With module-agent-core (Tool Discovery)

The `chat.actionSchemas` block in the ModuleDefinition exposes `kb.search` as an agent tool. When `module-agent-core` boots, it reads all registered modules' `chat` blocks and builds the tool catalog.

```typescript
// Discovered tool definition (from knowledgeBaseModule.chat.actionSchemas)
{
  name: "kb.search",
  description: "Search the knowledge base for FAQ entries matching a query",
  parameters: {
    tenantSlug: { type: "string", required: true },
    query: { type: "string", required: true }
  },
  endpoint: { method: "POST", path: "knowledge-base/[tenantSlug]/search" }
}
```

### 4.4 With module-config

**Declared configuration keys**:

| Key | Type | Default | Instance-Scoped | Description |
|---|---|---|---|---|
| `MAX_ENTRIES_PER_TENANT` | number | 500 | Yes | Maximum FAQ entries per tenant |
| `EMBEDDING_MODEL` | string | `text-embedding-3-small` | Yes | Model used for vector generation |
| `EMBEDDING_DIMENSIONS` | number | 1536 | No | Vector dimensions (must match model) |
| `SEARCH_CONFIDENCE_THRESHOLD` | number | 0.8 | Yes | Minimum cosine similarity for confident match |
| `SEARCH_MAX_RESULTS` | number | 5 | Yes | Maximum results returned per query |

---

## 5. Error Handling Strategy

| Error Scenario | Handling |
|---|---|
| Embedding API timeout | Set status to `failed`, store error in metadata, entry remains keyword-searchable |
| Embedding quota exceeded | Return 402 for bulk ingest, skip embedding for individual entries (queue for retry) |
| Invalid vector dimensions | Log error, set status to `failed`, alert via event |
| Search with no embedded entries | Fall back to keyword-only search, log warning |
| Tenant not found (search) | Return 404 with clear message |
| Category deletion with entries | Return 409 conflict, require entries to be moved or deleted first |
| Concurrent bulk ingest | Return 409, only one bulk job per tenant at a time |
| Version restore of non-existent version | Return 404 |

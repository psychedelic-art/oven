# Module: Knowledge Base

> **Package**: `packages/module-knowledge-base/`
> **Name**: `@oven/module-knowledge-base`
> **Dependencies**: `module-registry`, `module-ai`, `module-tenants`
> **Status**: Planned

---

## 1. Overview

Knowledge Base is a **structured FAQ and knowledge management module** with categories, question-answer entries, keyword tagging, embedding pipeline, and semantic search. Each tenant has their own knowledge base content, making it the source of truth for AI agent responses.

The module uses `module-ai` for the embedding pipeline — when an entry is created or updated, its text is embedded via the configured embedding model and stored in a pgvector column for semantic similarity search. A keyword fallback ensures matches even when semantic confidence is low.

### FAQ-First, LLM-Last

The dental assistant architecture follows an **FAQ-first** approach: the agent workflow first searches the knowledge base for a matching entry using semantic search. Only if no confident match is found does the agent fall back to LLM generation. This reduces AI costs, ensures consistent answers, and keeps responses within the curated FAQ scope.

---

## 2. Core Concepts

### Category
A logical grouping of FAQ entries — by topic, department, or subject area. Categories have an order for display and can be enabled/disabled independently.

### Entry
A single question-answer pair with optional keywords, embedding vector, and metadata. Entries are the atomic unit of knowledge that agents search and return.

### Embedding
A vector representation of the entry's text (question + answer concatenated), generated via `module-ai`'s embedding tools. Stored in a pgvector column for similarity search.

### Semantic Search
Vector similarity search against embedded entries. A user's question is embedded in real-time, then compared against all entry vectors using cosine similarity. Results are ranked by score.

### Keyword Search
Fallback search using JSONB keyword arrays. When semantic search returns low-confidence results (below threshold), keyword matching provides a secondary ranking signal.

---

## 3. Database Schema

### Tables

**`kb_categories`** — Knowledge base categories
```typescript
export const kbCategories = pgTable('kb_categories', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 50 }),                            // MUI icon name
  order: integer('order').notNull().default(0),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('kbc_tenant_id_idx').on(table.tenantId),
  index('kbc_slug_idx').on(table.slug),
  index('kbc_enabled_idx').on(table.enabled),
  index('kbc_order_idx').on(table.order),
  unique('kbc_tenant_slug').on(table.tenantId, table.slug),
]);
```

**`kb_entries`** — Question-answer entries
```typescript
export const kbEntries = pgTable('kb_entries', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  categoryId: integer('category_id').notNull(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  keywords: jsonb('keywords'),                                       // string array for fuzzy matching
  embedding: vector('embedding', { dimensions: 1536 }),              // pgvector column
  priority: integer('priority').notNull().default(0),                // higher = preferred in ties
  language: varchar('language', { length: 10 }).notNull().default('es'),
  enabled: boolean('enabled').notNull().default(true),
  version: integer('version').notNull().default(1),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('kbe_tenant_id_idx').on(table.tenantId),
  index('kbe_category_id_idx').on(table.categoryId),
  index('kbe_enabled_idx').on(table.enabled),
  index('kbe_language_idx').on(table.language),
  index('kbe_priority_idx').on(table.priority),
]);
```

**`kb_entry_versions`** — Version history
```typescript
export const kbEntryVersions = pgTable('kb_entry_versions', {
  id: serial('id').primaryKey(),
  entryId: integer('entry_id').notNull(),
  version: integer('version').notNull(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  keywords: jsonb('keywords'),
  description: text('description'),                                  // optional changelog note
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('kbev_entry_id_idx').on(table.entryId),
  unique('kbev_entry_version').on(table.entryId, table.version),
]);
```

---

## 4. Embedding Pipeline

### On Entry Create/Update

```
Entry saved → concatenate question + " " + answer
            → call module-ai ai.embed(text, { model: configuredModel })
            → store vector in kb_entries.embedding column
            → emit 'kb.entry.embedded' event
```

### Bulk Re-embed

`POST /api/knowledge-base/[tenantSlug]/ingest` triggers re-embedding of all enabled entries for a tenant. Used when:
- Switching embedding models
- Recovering from failed embeddings
- Initial bulk import

### Embedding Model Configuration

The embedding model is configurable via the config cascade:
- Default: `text-embedding-3-small` (1536 dimensions)
- Per-tenant override via `module-configs` for tenants with different language needs

---

## 5. Search Engine

### Semantic Search Flow

```
POST /api/knowledge-base/[tenantSlug]/search
{ "query": "¿Cuál es el horario de atención?" }

1. Embed the query text via module-ai ai.embed()
2. Vector similarity search against tenant's enabled entries:
   SELECT *, 1 - (embedding <=> $queryVector) AS score
   FROM kb_entries
   WHERE tenant_id = $tenantId AND enabled = true
   ORDER BY embedding <=> $queryVector
   LIMIT 5
3. If top result score >= CONFIDENCE_THRESHOLD → return as confident match
4. If top result score < CONFIDENCE_THRESHOLD → add keyword search results
5. Return ranked results with scores
```

### Search Response

```json
{
  "results": [
    {
      "id": 42,
      "question": "¿Cuál es el horario de atención?",
      "answer": "Nuestro horario es de lunes a viernes de 8:00 AM a 6:00 PM...",
      "category": "Horarios",
      "score": 0.94,
      "matchType": "semantic"
    },
    {
      "id": 15,
      "question": "¿Atienden los sábados?",
      "answer": "Sí, los sábados atendemos de 9:00 AM a 1:00 PM.",
      "category": "Horarios",
      "score": 0.87,
      "matchType": "semantic"
    }
  ],
  "totalResults": 2,
  "confidenceThreshold": 0.8,
  "topResultConfident": true
}
```

---

## 6. API Endpoints

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| GET/POST | `/api/kb-categories` | List and create categories | Authenticated |
| GET/PUT/DELETE | `/api/kb-categories/[id]` | Category CRUD | Authenticated |
| GET/POST | `/api/kb-entries` | List and create entries (auto-embeds) | Authenticated |
| GET/PUT/DELETE | `/api/kb-entries/[id]` | Entry CRUD (auto-re-embeds on update) | Authenticated |
| GET | `/api/kb-entries/[id]/versions` | Entry version history | Authenticated |
| POST | `/api/knowledge-base/[tenantSlug]/search` | Semantic search | **Public** |
| POST | `/api/knowledge-base/[tenantSlug]/ingest` | Bulk re-embed all entries | Authenticated |
| GET | `/api/knowledge-base/[tenantSlug]/stats` | Entry count, category breakdown | Authenticated |

---

## 7. Dashboard UI

### React Admin Resources

- **KB Categories** — List, Create, Edit
  - List: Datagrid with drag-and-drop reordering, tenant filter, entry count per category, enabled toggle
  - Create: SimpleForm with name, slug, description, icon selector, order
  - Edit: Same as create

- **KB Entries** — List, Create, Edit, Show
  - List: Datagrid with category filter, search bar, language filter, enabled toggle, embedding status indicator (green dot = embedded, yellow = pending, red = failed)
  - Create: Form with category selector, question (text area), answer (rich text), keyword tag input. Auto-embeds on save
  - Edit: Same as create. Shows version history tab
  - Show: Question, answer, keywords, category, embedding status, version history

### Custom Pages

- **Search Test** (`/knowledge-base/search-test`) — Interactive search testing interface:
  - Text input for query
  - Tenant selector
  - Results list with confidence scores, match type badges, category labels
  - Useful for validating FAQ coverage before going live

### Menu Section

```
──── Knowledge Base ────
Categories
Entries
Search Test
```

---

## 8. Events

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

---

## 9. Integration Points

| Module | Integration |
|--------|-------------|
| **module-ai** | Embedding pipeline uses `ai.embed()` for vector generation; vector search uses pgvector |
| **module-tenants** | Entries are tenant-scoped; categories are tenant-scoped |
| **module-roles** | Permission-based access to create, edit, view, delete entries |
| **module-agent-core** | `kb.search` registered as a tool in the Tool Wrapper for agent discovery |
| **module-workflow-agents** | `agent.rag` node can query KB entries for agent workflows |
| **module-chat** | Chat agents search KB for FAQ answers before LLM fallback |
| **module-notifications** | WhatsApp agent workflow searches KB for responses |
| **module-ui-flows** | FAQ page type renders KB categories and entries |

---

## 10. ModuleDefinition

```typescript
export const knowledgeBaseModule: ModuleDefinition = {
  name: 'knowledge-base',
  dependencies: ['ai', 'tenants'],
  description: 'Structured FAQ and knowledge management with categories, entries, embeddings, and semantic search',
  capabilities: [
    'manage FAQ categories',
    'manage FAQ entries',
    'semantic search',
    'keyword search',
    'bulk embed entries',
  ],
  schema: { kbCategories, kbEntries, kbEntryVersions },
  seed: seedKnowledgeBase,
  resources: [
    {
      name: 'kb-categories',
      list: KBCategoryList,
      create: KBCategoryCreate,
      edit: KBCategoryEdit,
      icon: CategoryIcon,
      options: { label: 'Categories' },
    },
    {
      name: 'kb-entries',
      list: KBEntryList,
      create: KBEntryCreate,
      edit: KBEntryEdit,
      show: KBEntryShow,
      icon: QuestionAnswerIcon,
      options: { label: 'Entries' },
    },
  ],
  customRoutes: [
    { path: '/knowledge-base/search-test', component: SearchTestPage },
  ],
  menuItems: [
    { label: 'Categories', to: '/kb-categories' },
    { label: 'Entries', to: '/kb-entries' },
    { label: 'Search Test', to: '/knowledge-base/search-test' },
  ],
  apiHandlers: {
    'kb-categories': { GET: listCategories, POST: createCategory },
    'kb-categories/[id]': { GET: getCategory, PUT: updateCategory, DELETE: deleteCategory },
    'kb-entries': { GET: listEntries, POST: createEntry },
    'kb-entries/[id]': { GET: getEntry, PUT: updateEntry, DELETE: deleteEntry },
    'kb-entries/[id]/versions': { GET: listEntryVersions },
    'knowledge-base/[tenantSlug]/search': { POST: searchEntries },
    'knowledge-base/[tenantSlug]/ingest': { POST: bulkIngest },
    'knowledge-base/[tenantSlug]/stats': { GET: getStats },
  },
  configSchema: [
    {
      key: 'MAX_ENTRIES_PER_TENANT',
      type: 'number',
      description: 'Maximum FAQ entries per tenant',
      defaultValue: 500,
      instanceScoped: true,
    },
    {
      key: 'EMBEDDING_MODEL',
      type: 'string',
      description: 'Embedding model for FAQ entries',
      defaultValue: 'text-embedding-3-small',
      instanceScoped: true,
    },
    {
      key: 'EMBEDDING_DIMENSIONS',
      type: 'number',
      description: 'Vector dimensions for embeddings',
      defaultValue: 1536,
      instanceScoped: false,
    },
    {
      key: 'SEARCH_CONFIDENCE_THRESHOLD',
      type: 'number',
      description: 'Minimum cosine similarity score for a confident match (0-1)',
      defaultValue: 0.8,
      instanceScoped: true,
    },
    {
      key: 'SEARCH_MAX_RESULTS',
      type: 'number',
      description: 'Maximum search results per query',
      defaultValue: 5,
      instanceScoped: true,
    },
  ],
  events: {
    emits: [
      'kb.category.created',
      'kb.category.updated',
      'kb.category.deleted',
      'kb.entry.created',
      'kb.entry.updated',
      'kb.entry.deleted',
      'kb.entry.embedded',
      'kb.search.executed',
    ],
    schemas: {
      'kb.category.created': {
        id: { type: 'number', description: 'Category DB ID', required: true },
        tenantId: { type: 'number', description: 'Owning tenant ID', required: true },
        name: { type: 'string', description: 'Category name' },
        slug: { type: 'string', description: 'Category slug' },
      },
      'kb.entry.created': {
        id: { type: 'number', description: 'Entry DB ID', required: true },
        tenantId: { type: 'number', description: 'Owning tenant ID', required: true },
        categoryId: { type: 'number', description: 'Category FK' },
        question: { type: 'string', description: 'FAQ question text' },
        language: { type: 'string', description: 'Entry language code' },
      },
      'kb.entry.updated': {
        id: { type: 'number', description: 'Entry DB ID', required: true },
        tenantId: { type: 'number', description: 'Owning tenant ID', required: true },
        question: { type: 'string', description: 'Updated question text' },
        version: { type: 'number', description: 'New version number' },
      },
      'kb.entry.embedded': {
        id: { type: 'number', description: 'Entry DB ID', required: true },
        tenantId: { type: 'number', description: 'Owning tenant ID', required: true },
        embeddingModel: { type: 'string', description: 'Model used for embedding' },
        dimensions: { type: 'number', description: 'Vector dimensions' },
      },
      'kb.search.executed': {
        tenantId: { type: 'number', description: 'Searched tenant ID', required: true },
        query: { type: 'string', description: 'Search query text' },
        resultCount: { type: 'number', description: 'Number of results returned' },
        topScore: { type: 'number', description: 'Highest similarity score' },
        confident: { type: 'boolean', description: 'Whether top result met confidence threshold' },
      },
    },
  },
  chat: {
    description: 'FAQ and knowledge management with semantic search. Manages categories and question-answer entries with embeddings for AI-powered retrieval.',
    capabilities: [
      'search FAQ entries',
      'list categories',
      'create entries',
      'get entry details',
    ],
    actionSchemas: [
      {
        name: 'kb.search',
        description: 'Search the knowledge base for FAQ entries matching a query',
        parameters: {
          tenantSlug: { type: 'string', description: 'Tenant slug', required: true },
          query: { type: 'string', description: 'Search query', required: true },
        },
        returns: { results: { type: 'array' }, totalResults: { type: 'number' }, topResultConfident: { type: 'boolean' } },
        requiredPermissions: [],
        endpoint: { method: 'POST', path: 'knowledge-base/[tenantSlug]/search' },
      },
      {
        name: 'kb.listEntries',
        description: 'List FAQ entries with filtering by category and tenant',
        parameters: {
          tenantId: { type: 'number' },
          categoryId: { type: 'number' },
          enabled: { type: 'boolean' },
        },
        returns: { data: { type: 'array' }, total: { type: 'number' } },
        requiredPermissions: ['kb-entries.read'],
        endpoint: { method: 'GET', path: 'kb-entries' },
      },
      {
        name: 'kb.getEntry',
        description: 'Get a single FAQ entry by ID',
        parameters: {
          id: { type: 'number', description: 'Entry ID', required: true },
        },
        returns: { question: { type: 'string' }, answer: { type: 'string' }, category: { type: 'string' } },
        requiredPermissions: ['kb-entries.read'],
        endpoint: { method: 'GET', path: 'kb-entries/[id]' },
      },
    ],
  },
};
```

---

## 11. Seed Data

```typescript
export async function seedKnowledgeBase(db: any) {
  // Seed permissions
  const modulePermissions = [
    { resource: 'kb-categories', action: 'read', slug: 'kb-categories.read', description: 'View KB categories' },
    { resource: 'kb-categories', action: 'create', slug: 'kb-categories.create', description: 'Create KB categories' },
    { resource: 'kb-categories', action: 'update', slug: 'kb-categories.update', description: 'Edit KB categories' },
    { resource: 'kb-categories', action: 'delete', slug: 'kb-categories.delete', description: 'Delete KB categories' },
    { resource: 'kb-entries', action: 'read', slug: 'kb-entries.read', description: 'View KB entries' },
    { resource: 'kb-entries', action: 'create', slug: 'kb-entries.create', description: 'Create KB entries' },
    { resource: 'kb-entries', action: 'update', slug: 'kb-entries.update', description: 'Edit KB entries' },
    { resource: 'kb-entries', action: 'delete', slug: 'kb-entries.delete', description: 'Delete KB entries' },
    { resource: 'kb-entries', action: 'ingest', slug: 'kb-entries.ingest', description: 'Bulk re-embed entries' },
  ];

  for (const perm of modulePermissions) {
    await db.insert(permissions).values(perm).onConflictDoNothing();
  }

  // Mark public endpoints
  const publicEndpoints = [
    { module: 'knowledge-base', route: 'knowledge-base/[tenantSlug]/search', method: 'POST', isPublic: true },
  ];

  for (const ep of publicEndpoints) {
    await db.insert(apiEndpointPermissions).values(ep).onConflictDoNothing();
  }
}
```

---

## 12. Default Dental FAQ Categories

When seeding for the dental use case, these 10 categories are created:

| # | Category | Slug | Description |
|---|----------|------|-------------|
| 1 | Agendamiento | `agendamiento` | Cómo agendar, cancelar, reagendar citas |
| 2 | Horarios | `horarios` | Horarios de atención, días festivos |
| 3 | Ubicación | `ubicacion` | Dirección, cómo llegar, parqueadero |
| 4 | Servicios | `servicios` | Servicios ofrecidos, tratamientos disponibles |
| 5 | Pagos | `pagos` | Métodos de pago, seguros, financiación |
| 6 | Antes de la cita | `antes-cita` | Preparación para la cita, documentos necesarios |
| 7 | Después de la cita | `despues-cita` | Cuidados post-procedimiento |
| 8 | Síntomas / Dolor | `sintomas` | Cuándo consultar, emergencias dentales |
| 9 | Urgencias | `urgencias` | Procedimiento de urgencias, contacto fuera de horario |
| 10 | Atención humana | `atencion-humana` | Cómo hablar con un humano, escalar consulta |

---

## 13. API Handler Example

```typescript
// GET /api/kb-entries — List handler with tenant filtering
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const tenantId = request.headers.get('x-tenant-id');

  const conditions = [];
  if (tenantId) conditions.push(eq(kbEntries.tenantId, Number(tenantId)));
  if (params.filter?.categoryId) conditions.push(eq(kbEntries.categoryId, params.filter.categoryId));
  if (params.filter?.enabled !== undefined) conditions.push(eq(kbEntries.enabled, params.filter.enabled));
  if (params.filter?.language) conditions.push(eq(kbEntries.language, params.filter.language));

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ count }]] = await Promise.all([
    db.select().from(kbEntries).where(where)
      .orderBy(desc(kbEntries.priority), desc(kbEntries.updatedAt))
      .offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(kbEntries).where(where),
  ]);

  return listResponse(rows, 'kb-entries', params, Number(count));
}
```

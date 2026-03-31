# Knowledge Base -- Database Schema

> Table definitions, pgvector details, indexing strategies, and migration notes.

---

## Table Overview

| Table | Purpose | Rows (typical) |
|---|---|---|
| `kb_categories` | FAQ categories per tenant | ~10 per tenant |
| `kb_entries` | Question-answer pairs with embedding vectors | ~50-500 per tenant |
| `kb_entry_versions` | Version history snapshots of entries | ~2-5 per entry |

---

## 1. kb_categories

Organizes FAQ entries into logical groups. Tenant-scoped with unique slugs per tenant.

### Columns

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `serial` | No | Auto-increment | Primary key |
| `tenant_id` | `integer` | No | - | Owning tenant (plain FK, no Drizzle reference) |
| `name` | `varchar(255)` | No | - | Display name (e.g., "Agendamiento") |
| `slug` | `varchar(128)` | No | - | URL-safe identifier (e.g., "agendamiento") |
| `description` | `text` | Yes | null | Optional longer description |
| `icon` | `varchar(50)` | Yes | null | MUI icon name (e.g., "EventNote", "Schedule") |
| `order` | `integer` | No | 0 | Display order (ascending); supports drag-reorder |
| `enabled` | `boolean` | No | true | When false, entries in this category excluded from search |
| `created_at` | `timestamp` | No | `now()` | Row creation timestamp |
| `updated_at` | `timestamp` | No | `now()` | Last modification timestamp |

### Indexes

| Name | Columns | Type | Purpose |
|---|---|---|---|
| `kbc_tenant_id_idx` | `tenant_id` | B-tree | Tenant-scoped queries |
| `kbc_slug_idx` | `slug` | B-tree | Slug lookups (search endpoint resolves category by slug) |
| `kbc_enabled_idx` | `enabled` | B-tree | Filter enabled/disabled |
| `kbc_order_idx` | `order` | B-tree | Ordered list retrieval |

### Constraints

| Name | Type | Columns | Description |
|---|---|---|---|
| `kb_categories_pkey` | Primary Key | `id` | Auto-increment ID |
| `kbc_tenant_slug` | Unique | `(tenant_id, slug)` | Slug unique within tenant |

### Drizzle Definition

```typescript
export const kbCategories = pgTable('kb_categories', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 50 }),
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

---

## 2. kb_entries

The core data table. Stores question-answer pairs with an optional pgvector embedding column for semantic search.

### Columns

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `serial` | No | Auto-increment | Primary key |
| `tenant_id` | `integer` | No | - | Owning tenant |
| `category_id` | `integer` | No | - | FK to `kb_categories.id` (plain integer) |
| `question` | `text` | No | - | The FAQ question text |
| `answer` | `text` | No | - | The FAQ answer text |
| `keywords` | `jsonb` | Yes | null | String array for keyword fallback search |
| `embedding` | `vector(1536)` | Yes | null | pgvector column for semantic search |
| `priority` | `integer` | No | 0 | 0-10; higher priority entries win score ties |
| `language` | `varchar(10)` | No | `'es'` | ISO language code |
| `enabled` | `boolean` | No | true | When false, excluded from search results |
| `version` | `integer` | No | 1 | Monotonically incrementing version number |
| `metadata` | `jsonb` | Yes | null | Embedding status, timestamps, error details |
| `created_at` | `timestamp` | No | `now()` | Row creation timestamp |
| `updated_at` | `timestamp` | No | `now()` | Last modification timestamp |

### The `metadata` JSONB Structure

```json
{
  "embeddingStatus": "embedded",
  "embeddedAt": "2026-01-15T10:05:00.000Z",
  "embeddingModel": "text-embedding-3-small",
  "embeddingError": null,
  "restoredFrom": null
}
```

| Key | Type | Description |
|---|---|---|
| `embeddingStatus` | string | `'pending'`, `'processing'`, `'embedded'`, `'failed'` |
| `embeddedAt` | string (ISO) | Timestamp of last successful embedding |
| `embeddingModel` | string | Model used for the current vector |
| `embeddingError` | string | Error message if embedding failed |
| `restoredFrom` | number | Version number this entry was restored from (if applicable) |

### The `keywords` JSONB Structure

Stored as a JSON array of lowercase strings:

```json
["agendar", "cita", "reservar", "turno"]
```

Used by keyword search via the PostgreSQL `?|` (has any) operator.

### Indexes

| Name | Columns | Type | Purpose |
|---|---|---|---|
| `kbe_tenant_id_idx` | `tenant_id` | B-tree | Tenant-scoped queries |
| `kbe_category_id_idx` | `category_id` | B-tree | Category filter |
| `kbe_enabled_idx` | `enabled` | B-tree | Filter enabled/disabled |
| `kbe_language_idx` | `language` | B-tree | Language filter |
| `kbe_priority_idx` | `priority` | B-tree | Priority ordering |

### Vector Index (added separately)

The embedding column requires a specialized vector index for efficient similarity search. This is created via a raw SQL migration, not through Drizzle schema:

```sql
-- HNSW index for cosine similarity (recommended for < 1M rows)
CREATE INDEX kbe_embedding_hnsw_idx
  ON kb_entries
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

See the pgvector section below for index strategy details.

### Drizzle Definition

```typescript
export const kbEntries = pgTable('kb_entries', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  categoryId: integer('category_id').notNull(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  keywords: jsonb('keywords'),
  embedding: vector('embedding', { dimensions: 1536 }),
  priority: integer('priority').notNull().default(0),
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

---

## 3. kb_entry_versions

Snapshot table for version history. Each row captures the state of an entry at a point in time, following Rule 7.2 (JSON-first definitions with snapshot tables).

### Columns

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `serial` | No | Auto-increment | Primary key |
| `entry_id` | `integer` | No | - | FK to `kb_entries.id` (plain integer) |
| `version` | `integer` | No | - | Version number at time of snapshot |
| `question` | `text` | No | - | Snapshot of question text |
| `answer` | `text` | No | - | Snapshot of answer text |
| `keywords` | `jsonb` | Yes | null | Snapshot of keywords array |
| `description` | `text` | Yes | null | Optional changelog note |
| `created_at` | `timestamp` | No | `now()` | When the snapshot was created |

### Indexes

| Name | Columns | Type | Purpose |
|---|---|---|---|
| `kbev_entry_id_idx` | `entry_id` | B-tree | Lookup versions for an entry |

### Constraints

| Name | Type | Columns | Description |
|---|---|---|---|
| `kb_entry_versions_pkey` | Primary Key | `id` | Auto-increment ID |
| `kbev_entry_version` | Unique | `(entry_id, version)` | No duplicate version numbers per entry |

### Drizzle Definition

```typescript
export const kbEntryVersions = pgTable('kb_entry_versions', {
  id: serial('id').primaryKey(),
  entryId: integer('entry_id').notNull(),
  version: integer('version').notNull(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  keywords: jsonb('keywords'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('kbev_entry_id_idx').on(table.entryId),
  unique('kbev_entry_version').on(table.entryId, table.version),
]);
```

---

## 4. pgvector Deep Dive

### What Is pgvector?

pgvector is a PostgreSQL extension that adds vector data types and similarity search operators. It enables storing embedding vectors directly in Postgres rows and querying them with distance functions, eliminating the need for a separate vector database.

### Enabling pgvector

Neon PostgreSQL includes pgvector by default. Enable it once per database:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Vector Column Type

The `vector(N)` type stores a fixed-length array of floating-point numbers. The dimension `N` must match the embedding model's output:

| Model | Dimensions | Column Definition |
|---|---|---|
| `text-embedding-3-small` | 1536 | `vector(1536)` |
| `text-embedding-3-large` | 3072 | `vector(3072)` |
| `text-embedding-ada-002` | 1536 | `vector(1536)` |

The dimension is set at column creation time and cannot be changed without dropping and recreating the column. If a tenant switches to a model with different dimensions, a migration is required.

### Distance Operators

pgvector provides three distance operators:

| Operator | Name | Formula | Range | Usage |
|---|---|---|---|---|
| `<=>` | Cosine distance | `1 - cos(a, b)` | 0 (identical) to 2 (opposite) | **Default for text embeddings** |
| `<->` | L2 (Euclidean) distance | `sqrt(sum((a_i - b_i)^2))` | 0 to infinity | Spatial/geometric data |
| `<#>` | Inner product (negative) | `-sum(a_i * b_i)` | Varies | Normalized vectors (equivalent to cosine) |

**Why cosine**: Text embedding models produce normalized vectors where direction (not magnitude) encodes meaning. Cosine distance measures angular similarity, making it the standard choice for text search.

**Converting to similarity score**:

```sql
-- Distance: lower = more similar (0 = identical)
SELECT embedding <=> $queryVector AS distance FROM kb_entries;

-- Similarity score: higher = more similar (1.0 = identical)
SELECT 1 - (embedding <=> $queryVector) AS score FROM kb_entries;
```

### Index Types

pgvector supports two approximate nearest neighbor (ANN) index types:

#### IVFFlat (Inverted File with Flat Compression)

Partitions vectors into clusters and searches only relevant clusters.

```sql
CREATE INDEX kbe_embedding_ivfflat_idx
  ON kb_entries
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

| Pros | Cons |
|---|---|
| Faster to build | Requires training data (needs rows before creation) |
| Lower memory usage | Less accurate for small datasets |
| Good for large datasets (>100K rows) | Must rebuild after significant data changes |

**`lists` parameter**: Number of clusters. Rule of thumb: `sqrt(row_count)`. For 10K entries, use `lists = 100`.

#### HNSW (Hierarchical Navigable Small World)

Builds a multi-layer graph for navigation-based search.

```sql
CREATE INDEX kbe_embedding_hnsw_idx
  ON kb_entries
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

| Pros | Cons |
|---|---|
| Higher recall (more accurate) | Slower to build |
| Works well with small datasets | Higher memory usage |
| No need to rebuild after inserts | Build time grows with `m` and `ef_construction` |
| Can be created on empty table | - |

**Parameters**:
- `m`: Maximum number of connections per node (default 16). Higher = more accurate but slower build.
- `ef_construction`: Size of dynamic candidate list during build (default 64). Higher = better quality index.

### Recommended Strategy for OVEN

| Dataset Size | Index Type | Parameters |
|---|---|---|
| < 10K entries (typical tenant) | HNSW | `m=16, ef_construction=64` |
| 10K - 100K entries | HNSW | `m=24, ef_construction=100` |
| > 100K entries | IVFFlat | `lists=sqrt(N)` |

For OVEN's expected scale (50-500 entries per tenant, ~50 tenants = ~25K total entries), **HNSW** is the correct choice. It provides high recall without requiring index rebuilds as data grows.

### Filtered Vector Search

When combining vector search with WHERE clauses (tenant scoping, enabled filter), PostgreSQL may not use the vector index efficiently. Two approaches:

**Approach A: Post-filter (simple, correct for small datasets)**
```sql
SELECT *, 1 - (embedding <=> $queryVector) AS score
FROM kb_entries
WHERE tenant_id = $tenantId AND enabled = true
ORDER BY embedding <=> $queryVector
LIMIT 5;
```

PostgreSQL scans the index, then filters. Effective when the WHERE clause eliminates a small fraction of rows.

**Approach B: Partial index (optimal for tenant-scoped queries)**
```sql
-- One index per tenant (created dynamically or for high-volume tenants)
CREATE INDEX kbe_embedding_tenant_5_idx
  ON kb_entries
  USING hnsw (embedding vector_cosine_ops)
  WHERE tenant_id = 5 AND enabled = true;
```

This is a future optimization. For initial deployment, Approach A is sufficient.

---

## 5. Migration Notes

### Initial Migration

```sql
-- 1. Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create tables
CREATE TABLE kb_categories ( ... );
CREATE TABLE kb_entries ( ... );
CREATE TABLE kb_entry_versions ( ... );

-- 3. Create B-tree indexes (via Drizzle)
-- Handled by Drizzle migration

-- 4. Create vector index (raw SQL, outside Drizzle)
CREATE INDEX kbe_embedding_hnsw_idx
  ON kb_entries
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

### Changing Embedding Dimensions

If a tenant switches to a model with different dimensions (e.g., 1536 -> 3072):

1. This requires a schema migration: `ALTER TABLE kb_entries ALTER COLUMN embedding TYPE vector(3072)`.
2. All existing vectors become invalid (wrong dimensions) and must be re-embedded.
3. The HNSW index must be dropped and recreated.
4. **Recommendation**: Keep all tenants on the same dimension. Use `EMBEDDING_DIMENSIONS` as a platform-global config (not instance-scoped).

### Data Cleanup

```sql
-- Find entries with stale embeddings (embedded before a model change)
SELECT id, question, metadata->>'embeddingModel' AS model, metadata->>'embeddedAt' AS embedded_at
FROM kb_entries
WHERE tenant_id = $tenantId
  AND metadata->>'embeddingModel' != $currentModel;

-- Count embedding status distribution
SELECT
  metadata->>'embeddingStatus' AS status,
  COUNT(*) AS count
FROM kb_entries
WHERE tenant_id = $tenantId
GROUP BY metadata->>'embeddingStatus';
```

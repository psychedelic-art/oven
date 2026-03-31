# Knowledge Base -- Detailed Requirements

> Functional requirements with acceptance criteria for `module-knowledge-base`.

---

## FR-KB-001: Category Management

**Description**: Tenants can organize FAQ entries into categories. Categories are tenant-scoped, orderable, and toggleable.

**Acceptance Criteria**:

| # | Criterion | Verification |
|---|---|---|
| 1.1 | POST `/api/kb-categories` creates a category scoped to the authenticated tenant | `tenantId` column matches auth context |
| 1.2 | Slug is auto-generated from name if not provided (`"Horarios de Atencion"` -> `"horarios-de-atencion"`) | Slug is URL-safe, lowercase, hyphenated |
| 1.3 | Slug is unique per tenant (same slug allowed across different tenants) | `unique('kbc_tenant_slug').on(tenantId, slug)` constraint enforced |
| 1.4 | Categories support drag-reorder via PUT with `{ order: N }` | Bulk PUT updates `order` column; list returns sorted by `order ASC` |
| 1.5 | Categories can be enabled/disabled via PUT `{ enabled: false }` | Disabled categories excluded from public search (entries still exist) |
| 1.6 | DELETE returns 409 if category has entries | Must move or delete entries first |
| 1.7 | GET list supports `tenantId`, `enabled` filters | `parseListParams` extracts filters; results scoped to tenant |
| 1.8 | Each category in list response includes `entryCount` | Aggregated via subquery or join |
| 1.9 | `kb.category.created`, `kb.category.updated`, `kb.category.deleted` events emitted | Events include `id`, `tenantId`, `name`, `slug` |

---

## FR-KB-002: Entry Management

**Description**: Tenants create question-answer entries within categories. Entries auto-embed on create and content-change update. Version history is maintained.

**Acceptance Criteria**:

| # | Criterion | Verification |
|---|---|---|
| 2.1 | POST `/api/kb-entries` creates an entry and triggers embedding pipeline | Row inserted with `metadata.embeddingStatus = 'pending'` |
| 2.2 | Entry requires `question`, `answer`, `categoryId` | 400 returned if any missing |
| 2.3 | Keywords stored as JSONB string array, normalized (lowercase, trimmed, deduplicated) | `["ortodoncia", "brackets", "precio"]` |
| 2.4 | PUT triggers re-embed only if `question` or `answer` changed | Compare old vs new; skip re-embed for keyword-only or priority-only updates |
| 2.5 | PUT auto-creates version snapshot before updating | `kb_entry_versions` row created with old content |
| 2.6 | Version number increments monotonically per entry | `version` column = previous + 1 |
| 2.7 | Entry supports `priority` (0-10, default 0) | Higher priority entries win in score ties |
| 2.8 | Entry supports `language` (default `'es'`) | Used for search filtering and future multilingual support |
| 2.9 | Entry supports `enabled` toggle | Disabled entries excluded from search but visible in admin |
| 2.10 | DELETE removes entry and all its versions | Cascade delete on `kb_entry_versions` |
| 2.11 | GET list supports filters: `categoryId`, `tenantId`, `enabled`, `language`, `q` (full-text on question) | All filters composable |
| 2.12 | Events emitted for create, update, delete | Payloads include `tenantId`, `id`, relevant fields |

---

## FR-KB-003: Embedding Pipeline

**Description**: When an entry is created or its content changes, the module automatically generates a vector embedding and stores it in the pgvector column.

**Acceptance Criteria**:

| # | Criterion | Verification |
|---|---|---|
| 3.1 | Text is concatenated as `question + " " + answer` before embedding | Transform stage produces single string |
| 3.2 | Text is normalized: collapsed whitespace, trimmed | No double spaces, no leading/trailing whitespace |
| 3.3 | Text is truncated to model's max token limit (8191 tokens for `text-embedding-3-small`) | Truncation does not break mid-word |
| 3.4 | Embedding model resolved from config cascade per tenant | Default `text-embedding-3-small`, overridable |
| 3.5 | Vector stored in `kb_entries.embedding` column (1536 dimensions) | pgvector column type, correct dimension count |
| 3.6 | `metadata.embeddingStatus` updated through lifecycle: pending -> processing -> embedded/failed | Status transitions match observer pattern |
| 3.7 | `metadata.embeddedAt` set to ISO timestamp on success | Timestamp in UTC |
| 3.8 | `metadata.embeddingModel` records which model was used | Enables detection of stale embeddings after model change |
| 3.9 | `metadata.embeddingError` set on failure with error message | Helps debugging failed embeddings |
| 3.10 | Usage tracked via `module-subscriptions` with service `ai-embeddings` | Each embed call increments tenant's usage counter |
| 3.11 | `kb.entry.embedded` event emitted on success | Payload includes `id`, `tenantId`, `embeddingModel`, `dimensions` |
| 3.12 | Pipeline is idempotent: re-running on same entry overwrites previous vector | No duplicate vectors |

---

## FR-KB-004: Semantic Search

**Description**: Search queries are embedded in real-time and compared against entry vectors using cosine similarity.

**Acceptance Criteria**:

| # | Criterion | Verification |
|---|---|---|
| 4.1 | POST `/api/knowledge-base/[tenantSlug]/search` accepts `{ query: string }` | 400 if query missing or empty |
| 4.2 | Query is embedded using the same model as entries | Model resolved from config cascade for the tenant |
| 4.3 | Cosine similarity computed via pgvector `<=>` operator | `1 - (embedding <=> $queryVector)` produces score 0-1 |
| 4.4 | Results filtered to tenant's enabled entries only | `WHERE tenant_id = $id AND enabled = true` |
| 4.5 | Results sorted by similarity score descending, then priority descending | Most relevant first; priority breaks ties |
| 4.6 | Results limited by `SEARCH_MAX_RESULTS` config (default 5) | Configurable per tenant |
| 4.7 | Each result includes `score` (0-1) and `matchType: 'semantic'` | Client can display confidence level |
| 4.8 | `topResultConfident` is `true` if top score >= `SEARCH_CONFIDENCE_THRESHOLD` | Threshold configurable per tenant (default 0.8) |
| 4.9 | Entries without embeddings (status != 'embedded') are excluded from semantic results | Only fully embedded entries participate |
| 4.10 | Search tracks usage via `module-subscriptions` with service `ai-vector-queries` | Each search call increments usage counter |

---

## FR-KB-005: Keyword Search

**Description**: JSONB keyword array matching provides a fallback when semantic search is unavailable or insufficient.

**Acceptance Criteria**:

| # | Criterion | Verification |
|---|---|---|
| 5.1 | Keyword search uses PostgreSQL `?|` operator on JSONB `keywords` column | Array overlap query |
| 5.2 | Additionally performs ILIKE match on `question` column | Catches entries without keywords |
| 5.3 | Query is split into terms (whitespace-separated, lowercased) | `"horario atencion"` -> `["horario", "atencion"]` |
| 5.4 | Results include `matchType: 'keyword'` | Distinguishable from semantic results |
| 5.5 | Keyword score is computed as `matchedTerms / totalTerms` | Partial matches get lower scores |
| 5.6 | Results sorted by keyword score descending, then priority | Consistent with semantic ranking |
| 5.7 | Works even when no entries have embeddings | Fully standalone fallback |

---

## FR-KB-006: Hybrid Search

**Description**: Combined semantic + keyword search with configurable scoring weights.

**Acceptance Criteria**:

| # | Criterion | Verification |
|---|---|---|
| 6.1 | Default strategy is `HybridSearch` | Config key `SEARCH_STRATEGY` defaults to `hybrid` |
| 6.2 | Runs semantic search first | Primary ranking signal |
| 6.3 | If top semantic score < threshold, runs keyword search additionally | Keyword results fill gaps |
| 6.4 | Results from both sources are merged and deduplicated by entry ID | No duplicate entries in response |
| 6.5 | Final score = `(semanticWeight * semanticScore) + (keywordWeight * keywordScore)` | Weights configurable per tenant |
| 6.6 | Default weights: semantic 0.7, keyword 0.3 | Config keys: `SEARCH_SEMANTIC_WEIGHT`, `SEARCH_KEYWORD_WEIGHT` |
| 6.7 | Results re-ranked by final score after merging | Merged list is properly ordered |
| 6.8 | Each result's `matchType` reflects its source: `'semantic'`, `'keyword'`, or `'hybrid'` | Entries matched by both sources get `'hybrid'` |

---

## FR-KB-007: Bulk Ingest

**Description**: Re-embed all entries for a tenant, with progress tracking. Also supports CSV/JSON import.

**Acceptance Criteria**:

| # | Criterion | Verification |
|---|---|---|
| 7.1 | POST `/api/knowledge-base/[tenantSlug]/ingest` starts a bulk re-embed job | Returns `{ jobId, total, estimatedTimeSeconds }` immediately |
| 7.2 | Only one bulk job per tenant at a time | 409 returned if job already running |
| 7.3 | Requires `kb-entries.ingest` permission | 403 without permission |
| 7.4 | Checks embedding quota before starting | 402 if insufficient quota |
| 7.5 | Optional `filter` parameter to re-embed subset (e.g., `{ categoryId: 5 }`) | Only matching entries processed |
| 7.6 | Optional `force: true` to re-embed even already-embedded entries | Default: skip entries with status `embedded` |
| 7.7 | Progress queryable via stats endpoint with `jobId` parameter | Returns `{ total, done, failed, status }` |
| 7.8 | Job cancellable via DELETE `/api/knowledge-base/[tenantSlug]/ingest/[jobId]` | Stops processing remaining entries |
| 7.9 | CSV import accepts columns: `question`, `answer`, `category` (slug or name), `keywords` (semicolon-separated) | Maps to entry creation |
| 7.10 | JSON import accepts array of entry objects | Same fields as POST create |
| 7.11 | Import validates all rows before inserting any | Atomic: all succeed or none |

---

## FR-KB-008: Version History

**Description**: Every content change to an entry creates a version snapshot. Previous versions can be viewed and restored.

**Acceptance Criteria**:

| # | Criterion | Verification |
|---|---|---|
| 8.1 | PUT that changes `question` or `answer` creates a version snapshot | `kb_entry_versions` row with old content |
| 8.2 | PUT that only changes `keywords`, `priority`, or `enabled` does NOT create a version | Metadata changes are not versioned |
| 8.3 | Version snapshot stores: `question`, `answer`, `keywords`, `version` number | Complete content capture |
| 8.4 | Optional `description` field on version for changelog notes | Set via PUT body `{ versionDescription: "Fixed typo" }` |
| 8.5 | GET `/api/kb-entries/[id]/versions` returns all versions ordered by version DESC | Most recent first |
| 8.6 | POST `/api/kb-entries/[id]/versions/[versionId]/restore` copies version content back to main entry | Creates a new version (not a rollback) |
| 8.7 | Restore increments the entry's version number | Version history is append-only |
| 8.8 | Restore triggers re-embedding (content changed) | Pipeline processes restored content |

---

## FR-KB-009: Search Analytics

**Description**: Track search queries, result quality, and usage patterns for reporting and optimization.

**Acceptance Criteria**:

| # | Criterion | Verification |
|---|---|---|
| 9.1 | Every search emits `kb.search.executed` event | Event contains `tenantId`, `query`, `resultCount`, `topScore`, `confident` |
| 9.2 | Events can be consumed by analytics wirings | Standard EventBus emission |
| 9.3 | Stats endpoint includes search volume metrics | Total searches, confident match rate, average score |
| 9.4 | Low-confidence queries identifiable for FAQ gap analysis | Queries where `confident = false` highlight missing entries |

---

## FR-KB-010: Public Search Endpoint

**Description**: The search endpoint is accessible without authentication for use by chat widgets, agents, and external integrations.

**Acceptance Criteria**:

| # | Criterion | Verification |
|---|---|---|
| 10.1 | POST `/api/knowledge-base/[tenantSlug]/search` does not require auth token | Marked as `isPublic: true` in `api_endpoint_permissions` |
| 10.2 | Endpoint is rate-limited per tenant slug | Configurable via `SEARCH_RATE_LIMIT` (default: 60 requests/minute) |
| 10.3 | Rate limit returns 429 with `Retry-After` header | Standard rate limit response |
| 10.4 | Tenant resolved from URL slug, not auth context | `WHERE slug = $tenantSlug` on tenants table |
| 10.5 | Returns 404 if tenant slug not found or tenant disabled | No information leakage about disabled tenants |
| 10.6 | Response does not include internal fields (tenantId, metadata, embedding vector) | Public-safe response shape |

---

## FR-KB-011: Tenant Stats

**Description**: Dashboard displays aggregate statistics about a tenant's knowledge base.

**Acceptance Criteria**:

| # | Criterion | Verification |
|---|---|---|
| 11.1 | GET `/api/knowledge-base/[tenantSlug]/stats` returns aggregate data | Requires authentication |
| 11.2 | Stats include: total entries, enabled entries, disabled entries | Count queries on `kb_entries` |
| 11.3 | Stats include: category breakdown (entries per category) | GROUP BY `categoryId` |
| 11.4 | Stats include: embedding coverage (embedded count / total count) | Percentage of entries with status `embedded` |
| 11.5 | Stats include: language distribution | GROUP BY `language` |
| 11.6 | Stats include: entries with failed embeddings (count + IDs) | For retry/debugging |
| 11.7 | Stats include: active bulk job progress if running | From BulkProcessor progress map |

---

## FR-KB-012: Quota Integration

**Description**: Embedding and search operations respect tenant quotas from `module-subscriptions`.

**Acceptance Criteria**:

| # | Criterion | Verification |
|---|---|---|
| 12.1 | Individual entry embedding tracks usage under `ai-embeddings` service | Increment by 1 per embed call |
| 12.2 | Search query tracks usage under `ai-vector-queries` service | Increment by 1 per search call |
| 12.3 | Bulk ingest checks total quota before starting | Pre-check: `requested <= remaining` |
| 12.4 | If quota insufficient for bulk ingest, return 402 with details | `{ error: 'quota_exceeded', remaining: N, requested: M }` |
| 12.5 | If quota runs out mid-bulk-job, remaining entries are skipped (not failed) | Job completes with `skipped` count |
| 12.6 | Individual entry embedding on create/update does not block on quota exhaustion | Entry is saved, embedding queued for when quota resets |

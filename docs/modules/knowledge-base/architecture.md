# Knowledge Base -- Architecture

> Patterns, pipelines, and data flows inside `module-knowledge-base`.

---

## 1. Architectural Patterns

### 1.1 Pipeline Pattern: EmbeddingPipeline

The embedding pipeline transforms raw FAQ content into searchable vectors. It follows a five-stage linear pipeline where each stage has a single responsibility and a clear contract with the next.

```
                    EmbeddingPipeline
 +----------+    +-----------+    +--------+    +--------+    +--------+
 | Extract  | -> | Transform | -> | Embed  | -> | Store  | -> | Notify |
 +----------+    +-----------+    +--------+    +--------+    +--------+
   Read Q+A       Concat text      Call AI       Write to      Emit
   from entry     Normalize        embed()       pgvector      event
                  Truncate                       column
```

**Stages**:

| Stage | Input | Output | Responsibility |
|---|---|---|---|
| Extract | Entry ID | `{ question, answer, language }` | Read entry from database |
| Transform | Raw text fields | Normalized text string | Concatenate Q+A, normalize whitespace, truncate to token limit |
| Embed | Text string | Float vector (1536 dims) | Call `module-ai` `ai.embed()`, track usage |
| Store | Vector + entry ID | Updated DB row | Write vector to `kb_entries.embedding`, update status |
| Notify | Entry ID + metadata | EventBus emission | Emit `kb.entry.embedded` with model and dimension info |

**Error handling**: If the Embed stage fails (API timeout, quota exceeded, model error), the pipeline sets the entry's embedding status to `failed` in metadata and does not proceed to Notify. The entry remains searchable via keyword fallback. Failed entries are retried during the next bulk ingest.

### 1.2 Strategy Pattern: SearchStrategy

Search is implemented as a pluggable strategy. The active strategy is resolved per-tenant from the config cascade, defaulting to `HybridSearch`.

```
            SearchEngine
                |
      +---------+---------+
      |         |         |
  Semantic   Keyword    Hybrid
  Search     Search     Search
```

| Strategy | Algorithm | When Used |
|---|---|---|
| `SemanticSearch` | Embed query, cosine similarity against entry vectors | Default primary strategy |
| `KeywordSearch` | JSONB `keywords` array overlap + ILIKE on question text | Fallback when no vectors, or explicit config |
| `HybridSearch` | Run semantic first; if top score < threshold, blend keyword results | Default combined strategy |

**HybridSearch scoring**:

```
finalScore = (semanticWeight * semanticScore) + (keywordWeight * keywordScore)
```

Weights are configurable per tenant via `SEARCH_SEMANTIC_WEIGHT` (default 0.7) and `SEARCH_KEYWORD_WEIGHT` (default 0.3).

### 1.3 Observer Pattern: Embedding Status Tracking

Each entry's embedding lifecycle is tracked via a status field in the `metadata` JSONB column. Components observe status changes to update UI badges and trigger retries.

```
States and transitions:

  +----------+     save entry     +-----------+
  | (none)   | ----------------> | pending   |
  +----------+                    +-----------+
                                       |
                          pipeline starts |
                                       v
                                 +------------+
                                 | processing |
                                 +------------+
                                    |       |
                        success /   |       | failure
                               v   |       v
                         +----------+   +--------+
                         | embedded |   | failed |
                         +----------+   +--------+
                              ^              |
                              |   retry      |
                              +--------------+
```

**Status values**:

| Status | Meaning | UI Badge |
|---|---|---|
| `pending` | Entry saved, embedding not yet started | Yellow circle |
| `processing` | Embedding API call in progress | Yellow spinner |
| `embedded` | Vector stored successfully | Green checkmark |
| `failed` | Embedding call failed (error in metadata) | Red X |

### 1.4 Repository Pattern: EntryRepository

The `EntryRepository` wraps Drizzle queries with embedding-aware operations, centralizing all database access for entries.

```
  EntryRepository
  +-----------------------------------------+
  | create(data)         -- insert + queue embed          |
  | update(id, data)     -- update + re-embed if changed  |
  | delete(id)           -- soft or hard delete            |
  | findById(id)         -- single entry with category     |
  | findByTenant(opts)   -- paginated list with filters    |
  | findSimilar(vector)  -- cosine similarity query        |
  | findByKeywords(kw)   -- JSONB array overlap            |
  | getEmbeddingStats(t) -- count by status per tenant     |
  +-----------------------------------------+
```

### 1.5 Command Pattern: BulkProcessor

Bulk re-embedding is modeled as a command queue. Each entry is an independent command that can succeed or fail without affecting others.

```
  BulkProcessor
  +---------------------------------------------+
  | enqueue(tenantId, options)                   |
  |   -> fetch all enabled entries               |
  |   -> create command per entry                |
  |   -> process sequentially with delay         |
  |   -> report progress via callback            |
  | getProgress(jobId) -> { total, done, failed }|
  | cancel(jobId) -> stop processing             |
  +---------------------------------------------+
```

**Progress tracking**: The processor maintains an in-memory progress map keyed by job ID. The stats endpoint polls this map. Progress is not persisted -- if the server restarts, the bulk job must be restarted.

### 1.6 Template Method: Search Pipeline

Every search request follows the same pipeline structure regardless of strategy. The strategy only customizes the core matching step.

```
  Search Pipeline (template)
  ================================================
  1. preprocess(query)     -- sanitize input, detect language
  2. embedQuery(query)     -- embed via module-ai (semantic only)
  3. match(vector, params) -- STRATEGY-SPECIFIC: semantic/keyword/hybrid
  4. rank(results)         -- sort by score, apply priority tiebreak
  5. filter(results)       -- apply confidence threshold, max results
  6. format(results)       -- shape response, include match type badges
  7. track(query, results) -- emit kb.search.executed event, log analytics
  ================================================
```

---

## 2. Embedding Pipeline Flow

Detailed flow from entry creation to searchable vector:

```
  User creates/updates entry in Dashboard
              |
              v
  POST /api/kb-entries  (or PUT /api/kb-entries/[id])
              |
              v
  Handler: validate input, insert/update row
              |
              v
  Handler: check if question or answer changed (PUT only)
              |
              v  (yes, content changed)
  Set metadata.embeddingStatus = 'pending'
              |
              v
  Emit 'kb.entry.created' (or 'kb.entry.updated')
              |
              v
  EmbeddingPipeline.process(entryId)       <-- async, non-blocking
              |
              v
  [Extract] Read entry from DB
              |
              v
  [Transform] text = normalize(question + " " + answer)
              |  truncate to model's max token limit
              v
  [Embed] response = await ai.embed(text, {
              |     model: resolveConfig('EMBEDDING_MODEL', tenantId),
              |     trackUsage: { service: 'ai-embeddings', tenantId }
              |  })
              v
  [Store] UPDATE kb_entries
              |  SET embedding = response.vector,
              |      metadata.embeddingStatus = 'embedded',
              |      metadata.embeddedAt = NOW(),
              |      metadata.embeddingModel = model
              v
  [Notify] eventBus.emit('kb.entry.embedded', {
              |   id, tenantId, embeddingModel, dimensions
              |  })
              v
           Done
```

---

## 3. Search Flow

```
  Client sends search request
  POST /api/knowledge-base/[tenantSlug]/search
  { "query": "What are the office hours?" }
              |
              v
  [Preprocess] Sanitize query, trim whitespace, detect language
              |
              v
  [Resolve Config] Fetch per-tenant settings:
              |  SEARCH_CONFIDENCE_THRESHOLD (default 0.8)
              |  SEARCH_MAX_RESULTS (default 5)
              |  EMBEDDING_MODEL (for query embedding)
              v
  [Embed Query] queryVector = await ai.embed(query, { model })
              |  Track usage: service = 'ai-vector-queries'
              v
  [Semantic Search]
              |  SELECT *, 1 - (embedding <=> $queryVector) AS score
              |  FROM kb_entries
              |  WHERE tenant_id = $tenantId
              |    AND enabled = true
              |  ORDER BY embedding <=> $queryVector
              |  LIMIT $maxResults
              v
  [Check Confidence] Is topScore >= threshold?
              |
         +----+----+
         |         |
        YES        NO
         |         |
         v         v
  Return       [Keyword Fallback]
  semantic       SELECT * FROM kb_entries
  results        WHERE tenant_id = $tenantId
                   AND enabled = true
                   AND (keywords ?| $queryTerms
                     OR question ILIKE '%term%')
                 LIMIT $maxResults
                        |
                        v
                 [Merge & Re-rank]
                 Combine semantic + keyword results
                 Deduplicate by entry ID
                 Apply hybrid scoring formula
                        |
                        v
                 Return merged results
              |
              v
  [Format Response]
  {
    results: [{ id, question, answer, category, score, matchType }],
    totalResults: N,
    confidenceThreshold: 0.8,
    topResultConfident: true/false
  }
              |
              v
  [Track] eventBus.emit('kb.search.executed', {
     tenantId, query, resultCount, topScore, confident
  })
```

---

## 4. Bulk Ingest Flow

```
  Admin triggers re-embed
  POST /api/knowledge-base/[tenantSlug]/ingest
  { "filter": { "categoryId": 5 }, "force": true }
              |
              v
  [Validate] Check user has 'kb-entries.ingest' permission
              |
              v
  [Check Quota] Estimate embedding count
              |  Call module-subscriptions to verify remaining quota
              |  If insufficient: return 402 with details
              v
  [Create Job] jobId = uuid()
              |  Initialize progress: { total: N, done: 0, failed: 0 }
              v
  [Queue Entries] Fetch all matching enabled entries
              |  For each entry:
              |    BulkProcessor.enqueue(entry.id)
              v
  [Return Immediately]
  { jobId, total: N, estimatedTimeSeconds: N * 0.5 }
              |
              v  (background processing)
  [Process Queue]
  For each entry (sequential, with 200ms delay):
    1. EmbeddingPipeline.process(entryId)
    2. Update progress: done++ or failed++
    3. If cancelled: stop processing
              |
              v
  [Poll Progress]
  GET /api/knowledge-base/[tenantSlug]/stats?jobId=X
  -> { total: 100, done: 67, failed: 2, status: 'processing' }
```

---

## 5. Version History Flow

```
  PUT /api/kb-entries/[id]
  { "question": "Updated question?", "answer": "New answer." }
              |
              v
  [Read Current] SELECT * FROM kb_entries WHERE id = $id
              |
              v
  [Compare] Has question or answer changed?
              |
         +----+----+
         |         |
        YES        NO
         |         |
         v         v
  [Snapshot]    Skip versioning,
  INSERT INTO   update metadata
  kb_entry_versions   only
  (entryId, version, question, answer, keywords)
         |
         v
  [Update Entry]
  UPDATE kb_entries
  SET question = $new, answer = $new,
      version = version + 1,
      updatedAt = NOW()
         |
         v
  [Re-embed] Trigger EmbeddingPipeline (content changed)
         |
         v
  [Emit] 'kb.entry.updated' { id, tenantId, version }
```

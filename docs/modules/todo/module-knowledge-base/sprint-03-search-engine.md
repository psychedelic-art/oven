# Sprint 03 — Search Engine (`module-knowledge-base`)

> Add the hybrid semantic + keyword search engine, the public search
> endpoint with rate limiting, the bulk re-embed ingest endpoint, and
> the stats endpoint. Unblocks `module-agent-core`.

---

## Goal

Ship a hybrid search pipeline that returns ranked `SearchResult` arrays
given a natural-language query, scoped by tenant slug, with a public
rate-limited endpoint and an auth-protected ingest endpoint.

## Scope

1. **Engine** — `src/engine/search-engine.ts` with:
   - `searchSemantic(tenantId, queryVector, limit)` → runs
     `SELECT *, 1 - (embedding <=> $1) AS score FROM kb_entries
      WHERE tenant_id = $2 AND enabled = true
      ORDER BY embedding <=> $1 LIMIT $3`.
   - `searchKeyword(tenantId, query, limit)` → JSONB `keywords` array
     match + `question`/`answer` text search.
   - `searchHybrid(tenantId, query, options)` → calls both, merges by
     weighted score (semantic 0.7, keyword 0.3 by default, tunable via
     config), dedupes by id.
   - Returns `SearchResponse` with `confidenceThreshold` and
     `topResultConfident`.

2. **Bulk processor** — `src/engine/bulk-processor.ts` with:
   - `reembedAll(tenantId, opts?)` → iterates `kb_entries` for the
     tenant, calls `embedEntry(id)` for each, emits a progress event
     `kb.ingest.progress` after every batch, returns totals.
   - Batched to honor `MAX_ENTRIES_PER_TENANT` config.

3. **Rate limiter** — `src/engine/rate-limiter.ts` with a tenant-slug +
   IP bucket (`Map<string, { count, windowStart }>`) that enforces
   `SEARCH_RATE_LIMIT_RPM` from the config cascade. Exceeded → throws a
   `RateLimitError` that `withHandler` maps to 429.

4. **API handlers**
   - `src/api/knowledge-base-search.handler.ts` → `POST
     /api/knowledge-base/[tenantSlug]/search`.
     Flow: resolve tenant by slug → check rate limiter → call
     `aiHttpClient.embed(query)` → `searchEngine.searchHybrid(...)` →
     track usage (`ai-embeddings` 1, `ai-vector-queries` 1) → emit
     `kb.search.executed` → return `SearchResponse`.
   - `src/api/knowledge-base-ingest.handler.ts` → `POST
     /api/knowledge-base/[tenantSlug]/ingest`. Auth-protected. Calls
     `bulkProcessor.reembedAll(tenantId)` in background and returns
     202 with a jobId.
   - `src/api/knowledge-base-stats.handler.ts` → `GET
     /api/knowledge-base/[tenantSlug]/stats`. Returns
     `{ totalEntries, perCategory: Array<{ slug, name, count }>,
        embeddingHealth: { ready, pending, failed } }`.

5. **Seed** — ensure `kb-entries.ingest` permission exists and the
   public search endpoint is registered in `api_endpoint_permissions`
   with `is_public: true`:

   ```typescript
   await db.insert(apiEndpointPermissions).values({
     module: 'knowledge-base',
     route: 'knowledge-base/[tenantSlug]/search',
     method: 'POST',
     isPublic: true,
   }).onConflictDoNothing();
   ```

6. **Tool Wrapper surface** — update `chat.actionSchemas` in
   `src/index.ts` so the `kb.searchEntries` action points to the real
   public endpoint and declares the parameter schema from the canonical
   `api.md` §MCP.

7. **Tests** (TDD)
   - `src/__tests__/search-engine.test.ts` — semantic search, keyword
     search, hybrid scoring, threshold filtering, ties broken by
     `priority`.
   - `src/__tests__/bulk-processor.test.ts` — batching, progress
     events, error handling mid-batch.
   - `src/__tests__/rate-limiter.test.ts` — allow under limit, 429 over,
     window reset.
   - `src/__tests__/api/knowledge-base-search.test.ts` — public endpoint
     end-to-end with mocked `fetch` for `/api/ai/embed`.
   - `src/__tests__/api/knowledge-base-ingest.test.ts` — auth required,
     returns 202 + jobId.
   - `src/__tests__/api/knowledge-base-stats.test.ts` — counts +
     embeddingHealth buckets.

## Out of scope

- Dashboard UI (sprint 04).
- Registration in `apps/dashboard/src/lib/modules.ts` (sprint 04).
- LangSmith tracing (handled upstream in `module-ai`).

## Deliverables

- [ ] 3 engine files.
- [ ] 3 API handler files + seed updates.
- [ ] 6 test files, all passing.
- [ ] `apiHandlers` in `src/index.ts` includes the three new routes.
- [ ] `chat.actionSchemas[kb.searchEntries]` points at the real route.

## Acceptance criteria

- [ ] `POST /api/knowledge-base/dental-demo/search` with a query that
      matches an existing entry returns `topResultConfident: true` and
      a `matchType: 'semantic'` top hit in under 500ms (mocked embed
      latency).
- [ ] The same endpoint with a noise query returns
      `topResultConfident: false` and the caller can fall back to LLM.
- [ ] 31 requests in one minute from the same IP + tenant slug → the
      31st returns 429.
- [ ] Bulk ingest of 100 seeded entries completes and emits 5 progress
      events at batch size 20.
- [ ] Usage metering records one `ai-embeddings` event and one
      `ai-vector-queries` event per successful search call.
- [ ] Every handler conforms to Rule 10 (uses `withHandler`,
      `parseListParams` where relevant, returns Content-Range where
      relevant).
- [ ] `pnpm turbo run lint typecheck test --filter=@oven/module-knowledge-base`
      exits 0.

## Dependencies

- Sprint 02 complete.
- `pgvector` embedding column populated by sprint 02 pipeline.

## Risks

- **Risk**: hybrid score weights are tenant-sensitive. **Mitigation**:
  expose `SEMANTIC_WEIGHT` and `KEYWORD_WEIGHT` as instance-scoped
  config entries (add to `configSchema` in sprint 03, default 0.7 /
  0.3).
- **Risk**: rate limiter is in-memory and not multi-instance safe.
  **Mitigation**: document as a known limitation; follow-up sprint (not
  in this plan) can swap to Upstash Redis once the platform adopts it.
- **Risk**: public endpoint is a DoS surface. **Mitigation**: rate
  limiter + the existing `module-auth` public-route allowlist ensure
  no auth state is leaked. Tenant resolution by slug failure returns
  404, not 500.

## Test plan

See the `src/__tests__/` list above. High-level coverage:

1. Semantic search returns top-K by cosine similarity.
2. Keyword search uses JSONB `?` operator for tag matching.
3. Hybrid merges and dedupes.
4. Confidence threshold filters low-score results correctly.
5. Rate limiter blocks after RPM limit.
6. Bulk ingest progress events fire.
7. Stats aggregation returns correct per-category counts.

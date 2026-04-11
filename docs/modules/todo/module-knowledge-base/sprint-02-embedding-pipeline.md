# Sprint 02 — Embedding Pipeline (`module-knowledge-base`)

> Add pgvector support, the `EmbeddingPipeline` engine, version
> snapshotting on PUT, category/entry CRUD handlers, and permissions
> seed. Leaves search and UI for later sprints.

---

## Goal

After sprint 02, creating or updating a KB entry:

1. Writes the row with `embeddingStatus = 'pending'`.
2. Asynchronously calls `POST /api/ai/embed` via the
   `EmbeddingPipeline`.
3. Stores the vector in `kb_entries.embedding`.
4. Flips `embeddingStatus` to `'ready'` or `'failed'`.
5. Tracks usage against `ai-embeddings`.
6. Emits `kb.entry.embedded` with `tenantId`, `embeddingModel`,
   `dimensions`.

CRUD endpoints for categories and entries work end-to-end and pass TDD
tests. Versions are auto-snapshotted when question/answer change.

## Scope

1. **Drizzle migration** enabling `pgvector` extension and adding the
   `embedding vector(1536)` column to `kb_entries`. Migration lives in
   `packages/module-knowledge-base/drizzle/0001_pgvector.sql` (or the
   monorepo's existing migration location — confirm with the user in
   sprint 00 open question #1).

2. **Engine files**
   - `src/engine/embedding-pipeline.ts` — class with
     `embedEntry(id)`, `reembedEntry(id)`,
     `handleEntryCreated(payload)`,
     `handleEntryUpdated(payload)`.
   - `src/engine/version-manager.ts` — class with
     `snapshot(entry, changelog?)` that writes to `kb_entry_versions`
     and returns the new version number.
   - `src/engine/kb-config.ts` — thin wrapper around
     `/api/module-configs/resolve-batch` that returns a
     `KbResolvedConfig` object. Cached per tenant for 60s.

3. **API handlers** (file names follow Rule 10.2)
   - `src/api/kb-categories.handler.ts` (GET list, POST create)
   - `src/api/kb-categories-by-id.handler.ts` (GET, PUT, DELETE)
   - `src/api/kb-entries.handler.ts` (GET list, POST create)
   - `src/api/kb-entries-by-id.handler.ts` (GET, PUT, DELETE)
   - `src/api/kb-entries-versions.handler.ts` (GET list of versions)
   - `src/api/kb-entries-restore.handler.ts` (POST restore version)

   Every handler:
   - uses `withHandler` from `@oven/module-registry/api-errors`.
   - uses `parseListParams` + `listResponse` from
     `@oven/module-registry/api-utils`.
   - filters by `tenantId` from the auth context.
   - emits the matching `kb.*.{created,updated,deleted}` event.
   - does NOT call OpenAI directly.

4. **Seed** — `src/seed.ts` becomes idempotent and seeds:
   - Permissions: `kb-categories.read/create/update/delete`,
     `kb-entries.read/create/update/delete`, `kb-entries.ingest`,
     plus `kb-search.public` for the future public route.
   - Default dental FAQ categories in Spanish per
     `docs/modules/knowledge-base/prompts.md` §Seed Data. Categories are
     tenant-templated (tenantId NULL) and copied into each tenant when
     `tenants.created` fires — see sprint 00 decision D6.
     **NOTE**: this cross-tenant seed pattern is confirmed in sprint 00
     open question #3. If the user prefers per-tenant seeding during
     tenant creation only, move the copy step to a listener and drop
     the NULL-template rows.

5. **Event listeners** — declared in `events.listeners` of the
   `ModuleDefinition`:
   - `kb.entry.created` → `embeddingPipeline.handleEntryCreated`.
   - `kb.entry.updated` → `embeddingPipeline.handleEntryUpdated`.
   - `tenants.created` → `copyDefaultCategories(tenantId)` (if the
     seed-template pattern is chosen).

6. **Usage metering** — every embed call calls
   `usageMeteringService.trackUsage({ tenantId, serviceSlug:
   'ai-embeddings', amount: 1 })` AFTER a successful HTTP 200 from
   `POST /api/ai/embed`. Failed calls do NOT consume quota.

7. **Tests** (TDD — write before implementation)
   - `src/__tests__/embedding-pipeline.test.ts`
   - `src/__tests__/version-manager.test.ts`
   - `src/__tests__/api/kb-categories.test.ts`
   - `src/__tests__/api/kb-entries.test.ts`
   - `src/__tests__/api/kb-entries-versions.test.ts`

   Each uses a mocked `fetch` to stub the module-ai HTTP endpoint and a
   mocked `usageMeteringService`. No network I/O.

## Out of scope

- Public search endpoint and search engine (sprint 03).
- Rate limiting (sprint 03).
- Dashboard UI (sprint 04).
- Registration in `apps/dashboard/src/lib/modules.ts` (sprint 04).

## Deliverables

- [ ] Drizzle migration creating pgvector extension and embedding column.
- [ ] Engine files listed above.
- [ ] API handler files listed above.
- [ ] Seed function idempotent + permissions + template categories.
- [ ] Event listeners wired in `ModuleDefinition`.
- [ ] 5 test files above, all passing.
- [ ] `apiHandlers` populated in `src/index.ts`.
- [ ] `eventBus.emit` calls include `tenantId` in every payload.

## Acceptance criteria

- [ ] Create a category via `POST /api/kb-categories` → returns 201 +
      emits `kb.category.created` with `tenantId`.
- [ ] Create an entry via `POST /api/kb-entries` → returns 201 with
      `embeddingStatus: 'pending'` → within 1 second (mocked time)
      emits `kb.entry.embedded` with `embeddingStatus: 'ready'`.
- [ ] Update an entry's question → version 2 is auto-snapshotted; the
      new row has `embeddingStatus: 'pending'` and re-embeds.
- [ ] Update an entry without changing question or answer → no version
      snapshot, no re-embed (only the `updatedAt` column moves).
- [ ] Delete an entry → row removed, `kb.entry.deleted` emitted.
- [ ] Usage metering is called exactly once per successful embed.
- [ ] No call to `@oven/module-ai` business logic — verified by grep.
- [ ] All 5 test files pass via `pnpm --filter
      @oven/module-knowledge-base test`.
- [ ] `pnpm turbo run lint typecheck test --filter=@oven/module-knowledge-base`
      exits 0.

## Dependencies

- Sprint 01 complete.
- `pgvector` extension enabled on the target database (blocker — see
  sprint 00 open question #1).
- `module-ai` deployed with `POST /api/ai/embed` reachable.
- `module-subscriptions.usageMeteringService` exported and buildable
  (already is).

## Risks

- **Risk**: pgvector is not available. **Mitigation**: fall back to
  `module-ai`'s vector store adapter (Pinecone or pgvector in a
  separate schema). Decision deferred to sprint 00 open question #1
  resolution.
- **Risk**: event listener deadlock if `kb.entry.created` handler
  synchronously writes back to `kb_entries`. **Mitigation**: the
  pipeline uses a separate DB connection for the status update, and
  the handler runs in a detached promise — the POST response returns
  immediately.
- **Risk**: race condition where two PUTs arrive before the embedding
  finishes. **Mitigation**: the pipeline uses the row's `version`
  column as an optimistic lock — if `version` changed between read
  and write, the pipeline retries once and then gives up with
  `embeddingStatus: 'failed'` + reason.
- **Risk**: module-ai HTTP call is slow (timeout). **Mitigation**:
  pipeline runs in background; HTTP POST to KB entry returns
  immediately; client polls `embeddingStatus` or listens for the event.

## Test plan

See the `src/__tests__/` list above. High-level coverage:

1. Embed happy path.
2. Embed failure → `embeddingStatus: 'failed'` + `embeddingError` set.
3. Re-embed on Q/A change.
4. No re-embed on metadata-only change.
5. Version snapshot created on Q/A change.
6. No version snapshot on metadata-only change.
7. Restore from previous version → new version N+1 with old content +
   re-embeds.
8. Delete entry → row removed, versions removed, event emitted.
9. Usage metering called on success, NOT on failure.
10. All CRUD handlers filter by `tenantId`.
11. All CRUD handlers use `withHandler` and map errors correctly.
12. All list endpoints set `Content-Range` header.

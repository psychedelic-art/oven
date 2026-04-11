# PROMPT — `module-knowledge-base`

> Condensed execution directive for an implementation agent. Read this
> first, then read the canonical `docs/modules/knowledge-base/prompts.md`
> for full details.

---

## Mission

Build `packages/module-knowledge-base/` — a structured FAQ module with
tenant-isolated categories, question-answer entries, an embedding pipeline
driven by `module-ai`, and hybrid semantic + keyword search. The module is
the primary knowledge source for every downstream AI agent, implementing
the FAQ-first, LLM-last architecture.

---

## Authoritative inputs (read in order)

1. `docs/module-rules.md` (ground truth — every rule applies).
2. `docs/modules/18-knowledge-base.md` (top-level spec).
3. `docs/modules/knowledge-base/prompts.md` (canonical implementation prompt).
4. `docs/modules/knowledge-base/architecture.md`, `api.md`, `database.md`,
   `detailed-requirements.md`, `module-design.md`, `UI.md`, `secure.md`,
   `use-case-compliance.md` (binding design).
5. `docs/modules/crosscheck-report.md` §4.6 — tool-name mismatch resolution
   (standardize on `kb.searchEntries`).
6. Root `CLAUDE.md` — style rules.
7. The sprint files in this folder — pull one at a time.

---

## Identity

- **Package**: `packages/module-knowledge-base`
- **Name**: `@oven/module-knowledge-base`
- **Type**: `ModuleDefinition`
- **Phase**: 2 (after `module-ai`, before `module-agent-core`)
- **Dependencies**: `@oven/module-registry`, `@oven/module-ai`,
  `@oven/module-tenants`, `@oven/module-config`,
  `@oven/module-subscriptions` (for usage metering)
- **Registration slot**: after `aiModule` in
  `apps/dashboard/src/lib/modules.ts`

---

## Hard constraints

- **TDD**: write failing tests before implementation. Tests live under
  `packages/module-knowledge-base/src/__tests__/` and run via `vitest`
  (matching `module-ai`'s `vitest.config.ts`).
- **No cross-module imports**: talk to `module-ai` only via HTTP (`POST
  /api/ai/embed`) or via the Tool Wrapper resolve pattern. Never import
  `@oven/module-ai` for business logic. Type-only imports from
  `@oven/module-registry` are allowed.
- **Plain integer FKs**: `categoryId` and `tenantId` use `integer()`, not
  `references()`.
- **Tenant scoping**: every list/get/update/delete handler filters by
  `tenantId`. Every insert pulls `tenantId` from the auth context or the
  URL slug (`[tenantSlug]` resolves via `module-tenants`).
- **Events**: emit `kb.category.*`, `kb.entry.*`, `kb.entry.embedded`,
  `kb.search.executed`. All payloads include `tenantId`.
- **Config cascade**: read `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS`,
  `SEARCH_CONFIDENCE_THRESHOLD`, `SEARCH_MAX_RESULTS`,
  `SEARCH_RATE_LIMIT_RPM`, `MAX_ENTRIES_PER_TENANT` via
  `GET /api/module-configs/resolve-batch`. Never read the table directly.
- **Usage metering**: every embed call tracks `ai-embeddings`; every
  search tracks `ai-vector-queries`. Use the `usageMeteringService` from
  `@oven/module-subscriptions`. HTTP fallback: `POST /api/usage/track`.
- **Public endpoint**: `POST /api/knowledge-base/[tenantSlug]/search` is
  `isPublic: true` in `api_endpoint_permissions`. Rate-limited via
  `SEARCH_RATE_LIMIT_RPM` config.
- **Tool name**: `kb.searchEntries` (NOT `kb.search`). Every downstream
  module already uses `kb.searchEntries` — align KB's `chat.actionSchemas`
  and `api.md` to match.
- **Styling**: dashboard UI under `apps/dashboard/src/components/knowledge-base/`
  uses MUI `sx` only. No `style={}`, no hand-written CSS classes, no
  `styled()`. React Admin resources + menu section per
  `docs/modules/knowledge-base/UI.md`.

---

## Execution order

Pull sprints in order — do not skip:

1. **sprint-00-discovery**: read, decide, commit nothing.
2. **sprint-01-foundation**: scaffold the package, schema, seed,
   ModuleDefinition (no handlers, no engine yet). Verify build.
3. **sprint-02-embedding-pipeline**: add `EmbeddingPipeline`, version
   manager, category + entry CRUD handlers, seed permissions, tests.
4. **sprint-03-search-engine**: add `SearchEngine`, hybrid scoring,
   public search + ingest + stats endpoints, rate limiting, tests.
5. **sprint-04-dashboard-ui**: React Admin resources, CustomMenu section,
   KBSearchTest playground, KBBulkActions, EmbeddingStatusBadge.
6. **sprint-05-acceptance**: run the module-rules checklist, update
   `docs/modules/IMPLEMENTATION-STATUS.md`, ask user to move the todo
   folder (irreversible — requires approval).

---

## Stop conditions

Stop and use `AskUserQuestion` only when:

- A ground-truth rule in `docs/module-rules.md` or the canonical doc set
  cannot be satisfied without breaking another rule.
- A sprint requires a destructive or irreversible action (drop table,
  force-push, delete branch, move todo → graduated).
- `pgvector` extension is not available on the target database — sprint
  02 needs user input on how to enable it.

Otherwise, decide and execute.

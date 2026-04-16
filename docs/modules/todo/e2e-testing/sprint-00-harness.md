# Sprint 00 — Tier-1 Harness (LIVE cycle-39)

> Scaffolded the `@oven/test-harness` workspace with pglite-backed
> Drizzle, an aliased fake `@oven/module-ai`, event-bus recorder, SSE
> consumer, and fixture helpers. Shipped 4 e2e specs totalling 14 tests.

## Goal

Give the monorepo a working in-process integration-test harness that
exercises server-side code paths without mocks for the database or the
event bus. Specifically: prove the cycle-39 pgvector fix works
end-to-end.

## Scope — LANDED

1. **Package** — `packages/test-harness` (new workspace member, not
   registered in any production app). `main` = `./src/index.ts`.
   Dependencies: `@oven/module-registry`, `@oven/module-knowledge-base`,
   `@oven/module-agent-core`, `drizzle-orm`, `@electric-sql/pglite`,
   `next`, `react`, `vitest`.

2. **Harness helpers** — `bootstrapHarness`, `createPgliteDb`,
   `EventRecorder`, `consumeSSE` / `collectSSE`, `mockAiModule` (+
   `queueEmbedding` / `queueAssistant` / `queueToolCall`), `seedTenant`,
   `seedKnowledgeBaseRow`, `seedKbCategory`, `seedKbEntry`,
   `oneHotEmbedding`. See `README.md` for file map.

3. **Module-AI alias** — `vitest.config.ts` maps `@oven/module-ai` to
   `src/__fixtures__/fake-module-ai.ts` so the real 30-handler barrel
   (and its Next.js dependency) is never loaded during e2e runs.

4. **Exports map additions** — added `./seed` + `./engine/*` exports to
   `@oven/module-knowledge-base/package.json`; added `./engine/*` to
   `@oven/module-agent-core/package.json`. Required so leaf files can be
   imported without pulling module barrels.

5. **Turbo task** — new `test:e2e` task in `turbo.json`; root
   `package.json` exposes `pnpm test:e2e` (scoped to
   `@oven/test-harness`).

6. **E2E specs** (14 tests across 4 files):
   - `e2e/kb-semantic-search.e2e.test.ts` (2 tests) — Part A smoke.
   - `e2e/sse-consumer.e2e.test.ts` (4 tests) — SSE parsing helpers.
   - `e2e/event-recorder.e2e.test.ts` (4 tests) — event-bus recorder.
   - `e2e/tool-permissions.e2e.test.ts` (4 tests) — `executeTool`
     permission gating.

## Deliverables — DONE

- [x] Scaffolded package skeleton.
- [x] pglite + pgvector wired and proven to work in Node (no Docker).
- [x] `bootstrapHarness` creates drizzle-parity DDL for tenants +
      permissions + api_endpoint_permissions + kb_* tables.
- [x] Event recorder + SSE consumer + fake module-ai.
- [x] Fixture helpers (tenant, KB, category, entry + one-hot embedding).
- [x] 4 e2e specs green.
- [x] `pnpm test:e2e` wired into turbo.
- [x] README + this sprint doc.

## Acceptance — DONE

- [x] `pnpm --filter @oven/test-harness test` returns exit 0 with 14
      tests across 4 files green.
- [x] `kb-semantic-search` successfully exercises the new
      `CREATE EXTENSION IF NOT EXISTS vector;` path in `seed.ts` and
      verifies cosine-similarity ordering against real pgvector. This
      is the Part A cycle-39 regression guard.
- [x] `pnpm --filter @oven/module-knowledge-base test` returns exit 0
      with the new seed tests green (23 total, +2 from cycle-38).
- [x] No changes to existing unit-test baselines elsewhere.

## Follow-up work (next sprint or cycle)

The original plan proposed 8 e2e specs; 4 shipped in cycle-39. The
remaining 4 require additional harness schema sets and module-graph
plumbing; defer to a dedicated cycle:

1. `chat-streaming.e2e.test.ts` — needs `chat_sessions` + `chat_messages`
   DDL in `bootstrap.ts` (`SchemaSet = 'chat'`), plus mocked
   `aiStreamText` wired into the fake module-ai's token queue. Exercises
   `POST /chat-sessions/:id/messages` with `Accept: text/event-stream`.

2. `agent-invocation.e2e.test.ts` — needs `agents`, `agent_sessions`,
   `agent_executions` DDL plus `tools` discovery fixtures. Exercises
   `invokeAgent()` with a queued tool-call turn.

3. `workflow-*.e2e.test.ts` (linear / branching / error-recovery /
   human-in-loop) — needs `agent_workflows`, `agent_workflow_executions`,
   `agent_workflow_node_executions` DDL. Exercises `runAgentWorkflow`
   with EventRecorder asserting lifecycle-event ordering.

Each follow-up spec is ~60 lines plus ~30 lines of DDL.

## Risks / known limits

- **pglite is not 100 % Postgres.** Some edge cases (HNSW index perf
  flags, some advanced `jsonb` operators) may differ. Where they do,
  tests should use the `DATABASE_URL` escape hatch (planned for
  `bootstrapHarness` in a follow-up) to swap in a Neon preview branch.
- **Schema drift.** The harness maintains hand-written DDL that mirrors
  Drizzle schemas. If a module adds a column and forgets to update the
  harness, e2e tests will compile but may fail at runtime. Acceptable
  for Tier-1; Tier-2 (Playwright against a real `db:push`ed database)
  closes this gap permanently.
- **Fake module-ai is narrow.** Only `aiEmbed`, `aiGenerateText`,
  `aiStreamText` are modelled. Extend as new e2e specs need them.

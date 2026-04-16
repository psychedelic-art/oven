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

6. **E2E specs** (23 tests across 8 files):
   - `e2e/kb-semantic-search.e2e.test.ts` (2 tests) — Part A smoke.
   - `e2e/sse-consumer.e2e.test.ts` (4 tests) — SSE parsing helpers.
   - `e2e/event-recorder.e2e.test.ts` (4 tests) — event-bus recorder.
   - `e2e/tool-permissions.e2e.test.ts` (4 tests) — `executeTool`
     permission gating.
   - `e2e/workflow-linear.e2e.test.ts` (3 tests) — 3-transform linear
     workflow; asserts stepsExecuted, lifecycle event order, DB row
     persistence.
   - `e2e/workflow-branching.e2e.test.ts` (2 tests) — condition node
     with guarded `always[]` transitions; both branches exercised.
   - `e2e/workflow-error-recovery.e2e.test.ts` (2 tests) — `onError`
     routing on node failure; fail-fast when no onError is defined.
   - `e2e/workflow-human-in-loop.e2e.test.ts` (2 tests) —
     `human-review` pauses with checkpoint persisted; resume with
     decision completes.

## Deliverables — DONE

- [x] Scaffolded package skeleton.
- [x] pglite + pgvector wired and proven to work in Node (no Docker).
- [x] `bootstrapHarness` creates drizzle-parity DDL for tenants +
      permissions + api_endpoint_permissions + kb_* tables +
      `agent_workflows` + `agent_workflow_executions` +
      `agent_workflow_node_executions`.
- [x] Event recorder + SSE consumer + fake module-ai with
      `aiEmbed` / `aiGenerateText` / `aiStreamText` /
      `evaluateGuardrails` queues.
- [x] Fixture helpers (tenant, KB, category, entry, agent-workflow,
      workflow-execution + one-hot embedding).
- [x] 8 e2e specs green (23 tests).
- [x] `pnpm test:e2e` wired into turbo.
- [x] README + this sprint doc.

## Acceptance — DONE

- [x] `pnpm --filter @oven/test-harness test` returns exit 0 with 23
      tests across 8 files green in ~13s.
- [x] `kb-semantic-search` successfully exercises the new
      `CREATE EXTENSION IF NOT EXISTS vector;` path in `seed.ts` and
      verifies cosine-similarity ordering against real pgvector. This
      is the Part A cycle-39 regression guard.
- [x] `workflow-linear` / `workflow-branching` /
      `workflow-error-recovery` / `workflow-human-in-loop` exercise the
      real `runAgentWorkflow` state-machine engine, lifecycle events,
      `onError` routing, and `saveCheckpoint` / `loadCheckpoint`.
- [x] `pnpm --filter @oven/module-knowledge-base test` returns exit 0
      with the new seed tests green (23 total, +2 from cycle-38).
- [x] No changes to existing unit-test baselines elsewhere.

## Follow-up work (next sprint or cycle)

The original plan proposed 8 e2e specs; all 8 now ship in cycle-39.
Additional deferred specs for a later cycle:

1. `chat-streaming.e2e.test.ts` — needs `chat_sessions` + `chat_messages`
   DDL in `bootstrap.ts` (`SchemaSet = 'chat'`), plus mocked
   `aiStreamText` wired into the fake module-ai's token queue. Exercises
   `POST /chat-sessions/:id/messages` with `Accept: text/event-stream`.

2. `agent-invocation.e2e.test.ts` — needs `agents`, `agent_sessions`,
   `agent_executions` DDL plus `tools` discovery fixtures. Exercises
   `invokeAgent()` with a queued tool-call turn.

Each additional spec is ~60 lines plus ~30 lines of DDL.

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

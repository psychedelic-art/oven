# End-to-End Testing Program

> Tier-1 landed in **cycle-39** (`packages/test-harness`). Tier-2 (Playwright)
> and Tier-3 (production smoke) captured as sprint docs, deferred to their
> own cycles.

## Why this program

Before cycle-39 the monorepo had 1,228 unit tests but **zero** end-to-end
tests. Unit tests use `vi.mock('@oven/module-registry/db')` so the real
Drizzle→Postgres path, pgvector extension loading, HNSW index usage, and
cross-module orchestration (workflow → agent → tool → persistence → SSE)
were never exercised as a system.

The cycle-39 work on pgvector (`packages/module-knowledge-base/src/seed.ts`)
is the canonical example of a class of bug unit tests cannot catch: the
seed swallowed a silent error when the `vector` extension wasn't installed,
and unit tests still passed because they mocked `db.execute`. A real-db
e2e test surfaces the regression immediately.

## Three tiers

| Tier | Runtime | Dependencies | Speed | Coverage | Status |
|------|---------|--------------|-------|----------|--------|
| **1 — Integration harness** | Vitest + pglite in-process | None (no Docker) | Fast (~10s) | Server-side modules, Drizzle + pgvector, event bus, SSE, tool permissions | **LIVE (cycle-39)** |
| **2 — Browser E2E** | Playwright against dev server | `next dev` + real Postgres | Medium (~minutes) | UI flows, auth, forms, SSE rendering | **sprint-01 (deferred)** |
| **3 — Production smoke** | `curl` / fetch against preview URL | Deployed preview | Slow (~minutes) | Real config, real LLM costs, real auth provider | **sprint-02 (deferred)** |

## Harness layout

`packages/test-harness` ships these building blocks:

| Helper | File | Purpose |
|--------|------|---------|
| `bootstrapHarness` | `src/bootstrap.ts` | Spins up pglite with pgvector, creates the requested schema sets, wires `setDb()` |
| `createPgliteDb` | `src/pglite-driver.ts` | Drizzle-wrapped in-memory Postgres |
| `EventRecorder` | `src/event-recorder.ts` | Subscribes to specific event-bus events, exposes `waitFor(name, predicate)` |
| `consumeSSE` / `collectSSE` | `src/sse-consumer.ts` | Parses `text/event-stream` frames emitted by `createSSEResponse` |
| `queueEmbedding` / `queueAssistant` / `queueToolCall` | `src/mock-ai.ts` + `src/__fixtures__/fake-module-ai.ts` | Deterministic mocks for `@oven/module-ai` |
| `seedTenant` / `seedKnowledgeBaseRow` / `seedKbCategory` / `seedKbEntry` / `oneHotEmbedding` | `src/fixtures.ts` | Thin Drizzle inserts for fixture data |

## Currently-covered e2e paths

1. `kb-semantic-search.e2e.test.ts` — **Part A cycle-39 smoke.** Exercises
   the full real path: bare pglite → `seedKnowledgeBase` (CREATE EXTENSION
   + ALTER TABLE + HNSW index + sample content) → `semanticSearch` with
   cosine-ranked results.
2. `sse-consumer.e2e.test.ts` — SSE frame parsing, multi-chunk handling,
   keep-alive comments, async iteration.
3. `event-recorder.e2e.test.ts` — event-bus capture, `waitFor` predicate
   + timeout behaviour.
4. `tool-permissions.e2e.test.ts` — `executeTool` gated by
   `ToolPermissionError`; verifies no `fetch()` is called when a required
   permission is missing.

## Deferred e2e paths (sprint-00 follow-up)

Captured in `sprint-00-harness.md` under "Follow-up work". These require
additional harness schema sets (chat, agent-core, workflow-agents) and
larger drizzle DDL extensions:

- `chat-streaming` — POST `/chat-sessions/:id/messages` w/ SSE → assert
  token stream + persisted assistant message.
- `agent-invocation` — `invokeAgent()` → mocked LLM tool call → tool
  executes → final text + recorded `agent_executions` row.
- `workflow-linear` — 3-node workflow, assert `stepsExecuted===3` and
  lifecycle events in order.
- `workflow-branching` — condition node picks the correct edge.
- `workflow-error-recovery` — node throws → `onError` transition fires.
- `workflow-human-in-loop` — human-review node pauses → `resumeWorkflow`
  completes.

## Running

```bash
# All harness tests
pnpm test:e2e

# Just one spec
pnpm --filter @oven/test-harness test -- kb-semantic-search
```

`pnpm test:e2e` is gated on `@oven/test-harness` via turbo. It is
intentionally kept out of the default `pnpm test` fanout so the unit-test
loop stays under ~10 seconds.

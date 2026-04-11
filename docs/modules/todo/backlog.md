# Master Backlog — OVEN Bug-Sprint Project

> Flat list of every tracked defect, UX issue, perf concern, and rule
> violation surfaced by the initial audit. Each item has a stable ID
> so sprint files can reference them without duplication.
>
> **Do not** edit a finding's ID once it is assigned. To retire a
> finding, mark its row `~~F-XX-YY~~` and add a note in the status column.

Legend:
- **Sev**: `C` critical · `H` high · `M` medium · `L` low
- **Cat**: `bug` · `ux` · `perf` · `debt` · `rule` (CLAUDE.md violation)

---

## Sprint 01 — AI Playground UX & type safety

| ID | File:Line | Sev | Cat | Description |
|----|-----------|-----|-----|-------------|
| F-01-01 | `apps/dashboard/src/components/ai/AIPlayground.tsx:591` | H | bug | Untyped `as any` cast on image output URL lookup — silent failure if shape drifts. |
| F-01-02 | `apps/dashboard/src/components/ai/AIPlayground.tsx:775` | H | bug | Untyped `as any` on tokens object — can mask missing fields → wrong token accounting. |
| F-01-03 | `apps/dashboard/src/components/ai/AIPlayground.tsx:1220-1227` | M | bug | `JSON.parse` schema error handler does not exit try block; falls through with undefined `parsedSchema`. |
| F-01-04 | `apps/dashboard/src/components/ai/AIPlayground.tsx:49-62` | M | perf | `sessionStorage` serialization lacks quota-exceeded handler → silent state loss. |
| F-01-05 | `apps/dashboard/src/components/ai/PlaygroundExecutionShow.tsx:24` | L | rule | `FunctionField` render uses `record: any`. |
| F-01-06 | `apps/dashboard/src/components/ai/PlaygroundExecutionList.tsx:60,71` | L | rule | Multiple `record: any` casts in `FunctionField`. |
| F-01-07 | `apps/dashboard/src/components/ai/AIPlayground.tsx:812-821` | M | ux | Generate button never disabled when model is unset. |
| F-01-08 | `apps/dashboard/src/components/ai/AIPlayground.tsx:381-383` | M | ux | History load errors swallowed — no user-facing message / retry. |
| F-01-09 | `apps/dashboard/src/components/ai/AIPlayground.tsx` | M | ux | No top-level error boundary; any uncaught error crashes the tab. |
| F-01-10 | `apps/dashboard/src/components/ai/AIPlayground.tsx:163-171` | M | bug | `Promise.all` on mount has no `AbortController` — leaks on unmount. |

## Sprint 02 — Memory / context window

| ID | File:Line | Sev | Cat | Description |
|----|-----------|-----|-----|-------------|
| F-02-01 | `packages/module-chat/src/engine/session-manager.ts` | H | bug | No TTL or cleanup for archived sessions — unbounded growth. |
| F-02-02 | `packages/module-chat/src/engine/context-manager.ts:72` | M | bug | `truncateToTokenBudget` always keeps last message even when it alone exceeds the budget → overflow. |
| F-02-03 | `packages/module-chat/src/engine/context-manager.ts:35-72` | M | perf | Naive `chars/4` token estimate under-counts code/JSON → silent context overflow. |
| F-02-04 | `packages/module-chat/src/api/chat-sessions-messages.handler.ts:53` | H | debt | POST records message but never invokes the agent — stale `TODO`. |

## Sprint 03 — Workflow engine correctness

| ID | File:Line | Sev | Cat | Description |
|----|-----------|-----|-----|-------------|
| F-03-01 | `packages/module-workflows/src/api/workflows-by-id.handler.ts:47` | H | bug | Version bump compares un-canonicalized `JSON.stringify` — whitespace triggers false versions. |
| F-03-02 | `packages/module-workflows/src/engine/engine.ts:237` | H | perf | Infinite-loop detection serializes `machineContext` each tick; fragile & expensive. |
| F-03-03 | `packages/module-workflows/src/api/workflows-execute.handler.ts:20-23` | M | bug | Empty `request.json()` catch block hides parse errors → silent bad payload. |
| F-03-04 | `packages/module-config/src/api/module-configs.handler.ts:43` | L | bug | `request.json()` uncaught → endpoint crashes on malformed JSON. |

## Sprint 04 — Chat & agent-core completion

| ID | File:Line | Sev | Cat | Description |
|----|-----------|-----|-----|-------------|
| F-04-01 | `packages/module-agent-core/src/api/agent-sessions-messages.handler.ts:26-29` | H | debt | Raw `require('drizzle-orm').sql` escape — replace with typed query. |
| F-04-02 | `packages/module-agent-core/src/engine/tool-wrapper.ts` | M | bug | No permission validation — agents bypass role restrictions. |
| F-04-03 | `packages/module-agent-core/src/engine/tool-wrapper.ts:44` | M | bug | Tool-name generation regex is fragile for nested routes. |
| F-04-04 | `packages/module-agent-core/src/engine/agent-invoker.ts:48,83` | L | rule | Uses value import + `as string[]` cast instead of `import type`. |
| F-04-05 | `packages/module-chat/src/api/chat-sessions-messages.handler.ts` | M | ux | No streaming acknowledgement in POST response — client waits blind. |

## Sprint 05 — Handler type safety (SQL injection risk)

| ID | File:Line | Sev | Cat | Description |
|----|-----------|-----|-----|-------------|
| F-05-01 | `packages/module-ai/src/api/ai-playground-executions.handler.ts:13` | H | bug | `(table as any)[params.sort]` — arbitrary column access. |
| F-05-02 | `packages/module-ai/src/api/ai-providers.handler.ts:23` (+11 siblings) | H | bug | Same `as any` sort-column pattern across 12+ handlers. |
| F-05-03 | `packages/module-ai/src/api/ai-providers-test.handler.ts:53,62,71` | M | bug | Untyped SDK provider casts; no null guard. |
| F-05-04 | `packages/module-ai/src/api/ai-transcribe.handler.ts:17` | M | bug | Provider resolve result cast to `any` — no shape guard. |
| F-05-05 | `packages/module-ai/src/api/ai-generate-object.handler.ts:26` | M | bug | Schema passed `as any` to Vercel AI SDK without zod validation. |

## Sprint 06 — Cross-cutting rule compliance

| ID | File:Line | Sev | Cat | Description |
|----|-----------|-----|-----|-------------|
| F-06-01 | `apps/dashboard/src/components/ai/GuardrailList.tsx:51,57,63,73` | L | rule | Repeated `record: any` in `FunctionField`. |
| F-06-02 | `apps/dashboard/src/components/ai/VectorStoreShow.tsx:28,44` | L | rule | Same `record: any` pattern. |
| F-06-03 | `apps/dashboard/src/components/ai/VectorStoreList.tsx:43,57,70` | L | rule | Same. Candidate for a shared typed wrapper. |
| F-06-04 | `apps/dashboard/src/components/ai/PlaygroundExecutionList.tsx` | L | perf | `FunctionField` renders recreate Chip/Box on every parent render. |
| F-06-05 | repo-wide | L | rule | Audit for `import { Foo }` where `Foo` is type-only → convert to `import type`. |

---

## Unassigned

> Findings discovered mid-sprint that need triage before promotion.

_(empty)_

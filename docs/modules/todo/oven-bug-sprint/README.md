# Project — OVEN Bug Sprint

> **Target**: OVEN monorepo (`pnpm` + Turborepo, Next.js 15, React Admin 5,
> Drizzle + Neon, Unity client)
> **Working branch**: `feature/bugs`
> **Owner (BO)**: see `business-owner.md`
> **Status file**: `STATUS.md` (updated after every sprint run)

---

## 1. Why this project exists

OVEN is feature-rich but has accumulated a backlog of concrete defects,
UX papercuts, and `CLAUDE.md` rule violations across the AI, chat,
memory, workflow, and agent-core subsystems. This project turns that
backlog into an **executable sprint plan** that an async Claude Code
agent can chew through one sprint at a time, under strict scope control.

Unlike `psychedelic-claude-code-migration`, this project does **not**
introduce new modules. It fixes what already ships. Every change is
expected to be small, surgical, and regression-tested.

## 2. Non-goals

- No new features.
- No refactors that cross module boundaries.
- No schema migrations (if a finding needs one, the agent stops and
  files a BO question).
- No rewrites. No "while I'm here" cleanups.
- No touching packages outside the sprint's `Touched packages` list.

## 3. Audit inventory (33 findings)

The initial audit classified every finding with a stable ID
`F-<sprint>-<index>` and a severity. Severities: `C`ritical · `H`igh ·
`M`edium · `L`ow. Categories: `bug` · `ux` · `perf` · `debt` · `rule`
(CLAUDE.md violation).

### Sprint 01 — AI Playground UX & type safety — 10 findings

| ID | File:Line | Sev | Cat | Description |
|----|-----------|-----|-----|-------------|
| F-01-01 | `apps/dashboard/src/components/ai/AIPlayground.tsx:591` | H | bug | `as any` on image output URL — silent failure if shape drifts. |
| F-01-02 | `apps/dashboard/src/components/ai/AIPlayground.tsx:775` | H | bug | `as any` on tokens object — wrong token accounting. |
| F-01-03 | `apps/dashboard/src/components/ai/AIPlayground.tsx:1220-1227` | M | bug | `JSON.parse` schema error handler does not exit try block. |
| F-01-04 | `apps/dashboard/src/components/ai/AIPlayground.tsx:49-62` | M | perf | `sessionStorage` lacks quota-exceeded handler. |
| F-01-05 | `apps/dashboard/src/components/ai/PlaygroundExecutionShow.tsx:24` | L | rule | `FunctionField` render uses `record: any`. |
| F-01-06 | `apps/dashboard/src/components/ai/PlaygroundExecutionList.tsx:60,71` | L | rule | Multiple `record: any` casts in `FunctionField`. |
| F-01-07 | `apps/dashboard/src/components/ai/AIPlayground.tsx:812-821` | M | ux | Generate button never disabled when model is unset. |
| F-01-08 | `apps/dashboard/src/components/ai/AIPlayground.tsx:381-383` | M | ux | History load errors swallowed — no user-facing message. |
| F-01-09 | `apps/dashboard/src/components/ai/AIPlayground.tsx` | M | ux | No top-level error boundary — uncaught errors crash the tab. |
| F-01-10 | `apps/dashboard/src/components/ai/AIPlayground.tsx:163-171` | M | bug | `Promise.all` on mount has no `AbortController`. |

### Sprint 02 — Memory / context window — 4 findings

| ID | File:Line | Sev | Cat | Description |
|----|-----------|-----|-----|-------------|
| F-02-01 | `packages/module-chat/src/engine/session-manager.ts` | H | bug | No TTL / cleanup for archived sessions. |
| F-02-02 | `packages/module-chat/src/engine/context-manager.ts:72` | M | bug | `truncateToTokenBudget` keeps last message even when it exceeds the budget. |
| F-02-03 | `packages/module-chat/src/engine/context-manager.ts:35-72` | M | perf | Naive `chars/4` token estimator underestimates code/JSON. |
| F-02-04 | `packages/module-chat/src/api/chat-sessions-messages.handler.ts:53` | H | debt | POST records message but never invokes the agent (stale TODO). |

### Sprint 03 — Workflow engine correctness — 4 findings

| ID | File:Line | Sev | Cat | Description |
|----|-----------|-----|-----|-------------|
| F-03-01 | `packages/module-workflows/src/api/workflows-by-id.handler.ts:47` | H | bug | Version bump compares un-canonicalized `JSON.stringify`. |
| F-03-02 | `packages/module-workflows/src/engine/engine.ts:237` | H | perf | Infinite-loop detection serializes `machineContext` each tick. |
| F-03-03 | `packages/module-workflows/src/api/workflows-execute.handler.ts:20-23` | M | bug | Empty `request.json()` catch hides parse errors. |
| F-03-04 | `packages/module-config/src/api/module-configs.handler.ts:43` | L | bug | `request.json()` uncaught → endpoint crashes on malformed JSON. |

### Sprint 04 — Chat & agent-core completion — 5 findings

| ID | File:Line | Sev | Cat | Description |
|----|-----------|-----|-----|-------------|
| F-04-01 | `packages/module-agent-core/src/api/agent-sessions-messages.handler.ts:26-29` | H | debt | Raw `require('drizzle-orm').sql` escape — replace with typed query. |
| F-04-02 | `packages/module-agent-core/src/engine/tool-wrapper.ts` | M | bug | No permission validation — agents bypass role restrictions. |
| F-04-03 | `packages/module-agent-core/src/engine/tool-wrapper.ts:44` | M | bug | Tool-name generation regex fragile for nested routes. |
| F-04-04 | `packages/module-agent-core/src/engine/agent-invoker.ts:48,83` | L | rule | Value imports used as types + `as string[]` casts. |
| F-04-05 | `packages/module-chat/src/api/chat-sessions-messages.handler.ts` | M | ux | No structured ack on POST — client waits blind. |

### Sprint 05 — Handler type safety (sort column + SDK casts) — 5 findings

| ID | File:Line | Sev | Cat | Description |
|----|-----------|-----|-----|-------------|
| F-05-01 | `packages/module-ai/src/api/ai-playground-executions.handler.ts:13` | H | bug | `(table as any)[params.sort]` — arbitrary column access. |
| F-05-02 | `packages/module-ai/src/api/ai-providers.handler.ts:23` (+11 siblings) | H | bug | Same `as any` sort-column pattern across 12+ handlers. |
| F-05-03 | `packages/module-ai/src/api/ai-providers-test.handler.ts:53,62,71` | M | bug | Untyped SDK provider casts; no null guard. |
| F-05-04 | `packages/module-ai/src/api/ai-transcribe.handler.ts:17` | M | bug | Provider resolve result cast to `any`. |
| F-05-05 | `packages/module-ai/src/api/ai-generate-object.handler.ts:26` | M | bug | Schema passed `as any` to AI SDK without zod validation. |

### Sprint 06 — Cross-cutting rule compliance — 5 findings

| ID | File:Line | Sev | Cat | Description |
|----|-----------|-----|-----|-------------|
| F-06-01 | `apps/dashboard/src/components/ai/GuardrailList.tsx:51,57,63,73` | L | rule | Repeated `record: any` in `FunctionField`. |
| F-06-02 | `apps/dashboard/src/components/ai/VectorStoreShow.tsx:28,44` | L | rule | Same `record: any` pattern. |
| F-06-03 | `apps/dashboard/src/components/ai/VectorStoreList.tsx:43,57,70` | L | rule | Same; candidate for a typed wrapper. |
| F-06-04 | `apps/dashboard/src/components/ai/PlaygroundExecutionList.tsx` | L | perf | `FunctionField` renders recreate Chip/Box every parent render. |
| F-06-05 | repo-wide | L | rule | Value imports used only as types → convert to `import type`. |

## 4. Sprint index

| # | File | Title | Goal in one line |
|---|------|-------|------------------|
| 00 | `sprint-00-triage.md` | Triage & audit re-validation | Re-verify every finding against `HEAD`, drop stale ones, freeze the backlog. |
| 01 | `sprint-01-ai-playground-ux.md` | AI Playground UX & type safety | Stabilize the playground, remove `as any`, add error boundary. |
| 02 | `sprint-02-memory-context.md` | Memory / context window | Fix truncation overflow, add session TTL, wire chat POST → agent. |
| 03 | `sprint-03-workflow-engine.md` | Workflow engine correctness | Stop phantom versions, replace `JSON.stringify` loop detection. |
| 04 | `sprint-04-chat-agent-completion.md` | Chat & agent-core completion | Typed drizzle queries, permission-checked tool execution. |
| 05 | `sprint-05-handler-typesafety.md` | Handler type safety | Whitelist sort columns across 12+ AI handlers. |
| 06 | `sprint-06-rule-compliance.md` | Cross-cutting rule compliance | Kill every `record: any` in React Admin resources. |

Each sprint file is **self-contained** and follows the same template:
**Goal · Scope · Out of scope · Deliverables · Acceptance criteria ·
Touched packages · Risks · Rule references**.

## 5. How to run this project

See `PROMPT.md`. Copy it into a Claude Code session (or queue it as an
async run). The prompt:

- Locks the agent to branch `feature/bugs`.
- Forces it to read `CLAUDE.md`, `docs/module-rules.md`, and the
  sprint file before touching any code.
- Forces it to update `STATUS.md` and commit with `[sprint-NN] …`
  before moving on.
- Forces a hard stop after each sprint so the BO can review.

## 6. Definition of Done (whole project)

- All sprints 00–06 marked **DONE** in `STATUS.md`.
- `pnpm -w turbo run lint typecheck build test` is green on
  `feature/bugs`.
- Zero new `as any`, zero new inline `style={{}}`, zero new direct
  `clsx` imports introduced by this project.
- BO has signed off in `business-owner.md` § Sign-off.

# OVEN Bug Sprint — Frozen Inventory

> **Sprint**: `sprint-00-triage` (deliverable)
> **Session branch**: `claude/eager-curie-0da9Q`
> **HEAD at triage**: `468ea41` (pre-triage: `d4865d2`, + `docs(todo): refresh progress audit`)
> **Audit source**: `oven-bug-sprint/README.md` § 3
> **Runner**: Claude Code pipeline, Phase 4

## Purpose

This file is the single source of truth for the remaining sprints 01–06.
It re-verifies every `F-NN-MM` row from the original audit against the
current `HEAD` of this session branch and classifies each row as:

- `active`       — bug/finding still reproduces as described; cite the
                   current line number if it shifted.
- `active-shift` — still present, but the cited `file:line` pointer
                   has drifted; record the new line.
- `fixed`        — already resolved on this branch; record the fix.
- `needs-repro`  — the repro steps in the audit are insufficient to
                   confirm; left in place, flagged for BO.
- `missing-file` — the cited file does not exist on this branch.
- `missing-pkg`  — the cited **package** does not exist on this branch;
                   the finding will have to be re-verified on the
                   branch where the package lives (`feature/bugs` or a
                   downstream merge candidate). Escalated to BO.

## Branch drift notice

Several Sprint 02 / Sprint 04 findings reference
`packages/module-chat/**` and `packages/module-agent-core/**`. Those
packages are **not present on this session branch**. They exist on
downstream branches (see `docs/modules/chat/`, `docs/modules/agent-core/`
specs). Findings that depend on missing packages are marked
`missing-pkg` and kicked to BO so they can be re-run on the correct
branch. They are **not** dropped — the drift is a scoping issue, not a
fix.

## Inventory

### Sprint 01 — AI Playground UX & type safety

| ID | File (cited) | Line (cited) | Sev | Status | Verified Line | Notes |
|----|--------------|--------------|-----|--------|---------------|-------|
| F-01-01 | `apps/dashboard/src/components/ai/AIPlayground.tsx` | 591 | H | `active` | 590–593 | `(item.output as any)?.url` on 590, `(item.output as any).url` on 593. Replace with a typed `PlaygroundImageOutput` shape. |
| F-01-02 | `apps/dashboard/src/components/ai/AIPlayground.tsx` | 775 | H | `active-shift` | 774 | `tokens: output.tokens as any`. Token shape is `{ input?: number; output?: number; total?: number }` — define a local `PlaygroundTokens` type. |
| F-01-03 | `apps/dashboard/src/components/ai/AIPlayground.tsx` | 1220–1227 | M | `fixed` | 1220–1227 | The catch block already `return`s after `setError`/`setLoading(false)`. No further action needed. Remove this row from sprint-01. |
| F-01-04 | `apps/dashboard/src/components/ai/AIPlayground.tsx` | 49–62 | M | `active-shift` | 43–64 | `sessionStorage.setItem` catch is empty with a TODO-style comment. Still no user-visible quota handler. |
| F-01-05 | `apps/dashboard/src/components/ai/PlaygroundExecutionShow.tsx` | 24 | L | `active-shift` | 24, 31, 41, 50, 72, 124 | 6 `record: any` casts in this file, not 1. Fix them all in sprint-06 rather than sprint-01. Moved to **sprint-06 F-06-x**. |
| F-01-06 | `apps/dashboard/src/components/ai/PlaygroundExecutionList.tsx` | 60, 71 | L | `active-shift` | 60, 71, 81 | 3 `record: any` casts. Also moved to **sprint-06**. |
| F-01-07 | `apps/dashboard/src/components/ai/AIPlayground.tsx` | 812–821 | M | `active-shift` | 812–821 | Generate button only disabled on `loading \|\| !prompt`. Needs `!model` (and arguably `!hasConnectedProvider`). |
| F-01-08 | `apps/dashboard/src/components/ai/AIPlayground.tsx` | 381–383 | M | `active-shift` | 380–382 | History `catch { /* ignore */ }` — no toast/error state. |
| F-01-09 | `apps/dashboard/src/components/ai/AIPlayground.tsx` | (whole file) | M | `active` | n/a | No `ErrorBoundary` wraps the playground tab. Grep for `ErrorBoundary` returns zero matches in this file. |
| F-01-10 | `apps/dashboard/src/components/ai/AIPlayground.tsx` | 163–171 | M | `active-shift` | 158–179 | `Promise.all` on mount uses a `cancelled` flag (good) but no `AbortController`. Still technically a leak if the request is slow and the component unmounts. Keep as LOW-M — the `cancelled` flag already prevents state updates. |

### Sprint 02 — Memory / context window

| ID | File (cited) | Line | Sev | Status | Notes |
|----|--------------|------|-----|--------|-------|
| F-02-01 | `packages/module-chat/src/engine/session-manager.ts` | n/a | H | `missing-pkg` | `packages/module-chat` does not exist on `claude/eager-curie-0da9Q`. Escalate: Sprint 02 can only be executed on a branch that has `module-chat`. Do not drop. |
| F-02-02 | `packages/module-chat/src/engine/context-manager.ts` | 72 | M | `missing-pkg` | See F-02-01. |
| F-02-03 | `packages/module-chat/src/engine/context-manager.ts` | 35–72 | M | `missing-pkg` | See F-02-01. |
| F-02-04 | `packages/module-chat/src/api/chat-sessions-messages.handler.ts` | 53 | H | `missing-pkg` | See F-02-01. |

### Sprint 03 — Workflow engine correctness

| ID | File (cited) | Line | Sev | Status | Verified Line | Notes |
|----|--------------|------|-----|--------|---------------|-------|
| F-03-01 | `packages/module-workflows/src/api/workflows-by-id.handler.ts` | 47 | H | `active` | 47 | `JSON.stringify(body.definition) !== JSON.stringify(existing.definition)` — key-order dependent. Canonicalise via sorted-key stringify or deep-equal. |
| F-03-02 | `packages/module-workflows/src/engine/engine.ts` | 237 | H | `active-shift` | `packages/module-workflows/src/engine.ts:237` | File is at `engine.ts`, not `engine/engine.ts`. Line 237 still contains the `JSON.stringify(machineContext)` stateKey. |
| F-03-03 | `packages/module-workflows/src/api/workflows-execute.handler.ts` | 20–23 | M | `active-shift` | 18–23 | Empty-body catch silently swallows parse errors. Separate "no body" from "malformed body". |
| F-03-04 | `packages/module-config/src/api/module-configs.handler.ts` | 43 | L | `active-shift` | 57 | `await request.json()` in `POST` has no try/catch. 500s on malformed JSON. |

### Sprint 04 — Chat & agent-core completion

| ID | File (cited) | Line | Sev | Status | Notes |
|----|--------------|------|-----|--------|-------|
| F-04-01 | `packages/module-agent-core/src/api/agent-sessions-messages.handler.ts` | 26–29 | H | `missing-pkg` | `packages/module-agent-core` does not exist on this branch. Escalate with F-02-*. |
| F-04-02 | `packages/module-agent-core/src/engine/tool-wrapper.ts` | n/a | M | `missing-pkg` | See F-04-01. |
| F-04-03 | `packages/module-agent-core/src/engine/tool-wrapper.ts` | 44 | M | `missing-pkg` | See F-04-01. |
| F-04-04 | `packages/module-agent-core/src/engine/agent-invoker.ts` | 48, 83 | L | `missing-pkg` | See F-04-01. |
| F-04-05 | `packages/module-chat/src/api/chat-sessions-messages.handler.ts` | n/a | M | `missing-pkg` | See F-02-01. |

### Sprint 05 — Handler type safety (sort column + SDK casts)

| ID | File (cited) | Line | Sev | Status | Verified Line | Notes |
|----|--------------|------|-----|--------|---------------|-------|
| F-05-01 | `packages/module-ai/src/api/ai-playground-executions.handler.ts` | 13 | H | `active` | 13 | `(aiPlaygroundExecutions as any)[params.sort] ?? aiPlaygroundExecutions.id`. |
| F-05-02 | `packages/module-ai/src/api/ai-providers.handler.ts` + siblings | 23 | H | `active` | see below | The same pattern exists in **9** handlers on this branch, not 12+. Listed: `ai-tools.handler.ts:22`, `ai-guardrails.handler.ts:13`, `ai-playground-executions.handler.ts:13`, `ai-usage-logs.handler.ts:12`, `ai-aliases.handler.ts:13`, `ai-budgets.handler.ts:13`, `ai-providers.handler.ts:23`, `ai-vector-stores.handler.ts:13`, `ai-budget-alerts.handler.ts:12`. Fix once with a shared `resolveSortColumn(table, sort, fallback)` helper in `packages/module-ai/src/api/_utils/sort.ts`. |
| F-05-03 | `packages/module-ai/src/api/ai-providers-test.handler.ts` | 53, 62, 71 | M | `active` | 53, 62, 71 | `(sdkProvider as any)('gpt-4o-mini')` etc. Provider type should be the Vercel AI SDK `LanguageModelV1` factory. |
| F-05-04 | `packages/module-ai/src/api/ai-transcribe.handler.ts` | 17 | M | `active` | 17 | `await providerRegistry.resolve('openai') as any` — resolve already returns a typed provider; the cast is unnecessary. |
| F-05-05 | `packages/module-ai/src/api/ai-generate-object.handler.ts` | 26 | M | `active` | 26 | `schema: schema as any` passed to `generateObject`. Wrap inbound JSON schema with `zodFromJsonSchema()` or enforce a zod input at the route boundary. |

### Sprint 06 — Cross-cutting rule compliance

| ID | File (cited) | Line | Sev | Status | Verified Line | Notes |
|----|--------------|------|-----|--------|---------------|-------|
| F-06-01 | `apps/dashboard/src/components/ai/GuardrailList.tsx` | 51, 57, 63, 73 | L | `active` | 51, 57, 63, 73 | 4 `record: any` casts confirmed. |
| F-06-02 | `apps/dashboard/src/components/ai/VectorStoreShow.tsx` | 28, 44 | L | `active` | 28, 44 | Confirmed. |
| F-06-03 | `apps/dashboard/src/components/ai/VectorStoreList.tsx` | 43, 57, 70 | L | `active-shift` | 43 (only) | Only **one** `record: any` on this branch, not 3. The list view was simplified. Scope the sprint-06 fix accordingly. |
| F-06-04 | `apps/dashboard/src/components/ai/PlaygroundExecutionList.tsx` | (whole) | L | `active` | 58–83 | Inline `FunctionField` `render` closures recreate `Chip` on every parent render. Fix by hoisting render functions or memoising with `useCallback`. |
| F-06-05 | repo-wide | — | L | `rule` / `active` | n/a | `import type` rule: grep at triage time found multiple violations in `apps/dashboard/**` and `packages/module-ai/**`. Sprint 06 will resolve them in-scope (same PR as F-06-01…04). |

### Additional findings moved in from sprint 01 (triage reclassification)

| New ID | Old ID | File | Sev | Status | Notes |
|--------|--------|------|-----|--------|-------|
| F-06-06 | F-01-05 | `apps/dashboard/src/components/ai/PlaygroundExecutionShow.tsx` | L | `active` | 6 `record: any` casts — same pattern as F-06-01/02/03, so fixed in the same pass. |
| F-06-07 | F-01-06 | `apps/dashboard/src/components/ai/PlaygroundExecutionList.tsx` | L | `active` | 3 `record: any` casts — combined with F-06-04 above. |

## Counts (triage verdict)

| Status | Count |
|--------|------:|
| `active` | 12 |
| `active-shift` | 12 |
| `fixed` | 1 (F-01-03) |
| `missing-pkg` | 8 (all of F-02-*, F-04-01..04, F-04-05) |
| `needs-repro` | 0 |
| **Total** | **33** |

## Follow-ups that leave triage with open questions

1. **Q-T-01**: Sprint 02 and Sprint 04 cannot be executed on
   `claude/eager-curie-0da9Q` because `module-chat` and
   `module-agent-core` are absent. Should those sprints be run on a
   different branch that has those packages, or should we wait for the
   corresponding feature branch to merge into `dev` first? Recorded in
   `business-owner.md` § Open questions.
2. **Q-T-02**: F-05-02 claimed "12+ handlers"; only 9 exist on this
   branch. The three missing handlers (if any) either never existed or
   were renamed. BO to confirm whether that is drift or audit error.
3. **Q-T-03**: Sprint 01 reclassified 2 findings into sprint 06 (the
   `record: any` casts). The sprint-01 file needs its finding table
   updated to reflect this move. Done in the same triage commit.

# STATUS — OVEN Bug Sprint

> The async runner updates this file after every sprint run.
> Format: one row per sprint, with status, last commit SHA, and notes.

| Sprint | Title | Status | Last commit | Notes |
|--------|-------|--------|-------------|-------|
| 00 | Triage & audit re-validation | 🔵 Awaiting BO review | `468ea41` (triage commit to follow) | `inventory.md` written; 1 fixed (F-01-03), 8 `missing-pkg` (F-02-*, F-04-01..05), 24 active. Q-T-01..03 open for BO. |
| 01 | AI Playground UX & type safety | ⏳ Planned | — | Scope reduced from 10 → 8 findings; F-01-05/06 moved to Sprint 06 (F-06-06/07). F-01-03 struck (already fixed). |
| 02 | Memory / context window | 🛑 Blocked | — | Blocked on Q-T-01 — `module-chat` absent on this session branch. |
| 03 | Workflow engine correctness | ⏳ Planned | — | 4 findings active. F-03-02 path shifted to `engine.ts` (not `engine/engine.ts`). |
| 04 | Chat & agent-core completion | 🛑 Blocked | — | Blocked on Q-T-01 — `module-agent-core` absent, and F-04-05 depends on `module-chat`. |
| 05 | Handler type safety | 🟡 In progress | cycle-6 Phase 4 (pending push) | F-05-01 **done** cycle-3 (`ai-playground-executions.handler.ts`). F-05-02 **done** cycle-5: `getOrderColumn` rolled to 8 remaining handlers. F-05-03 **done** cycle-6 Phase 4: `assertCallableProvider` + `ProviderNotCallableError` + 11 tests; `ai-providers-test.handler.ts` has zero `as any`. `module-ai` suite: 161/161 (was 150). F-05-04/05 still ⏳. |
| 06 | Cross-cutting rule compliance | ⏳ Planned | — | Scope expanded from 5 → 7 findings (F-06-06/07 inherited from Sprint 01). |

**Status legend**: ⏳ Planned · 🟡 In progress · 🔵 Awaiting BO review · ✅ Done · 🛑 Blocked

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
| 05 | Handler type safety | ✅ Done (cycle-8) | cycle-8 Phase 4 on `claude/inspiring-clarke-HBa3u` | F-05-01 **done** cycle-3. F-05-02 **done** cycle-5: `getOrderColumn` rolled to 8 remaining handlers. F-05-03 **done** cycle-6: `assertCallableProvider` + `ProviderNotCallableError` + 11 tests. F-05-04 **done** cycle-7: `resolveSubClientModel` + `ProviderSubClientNotCallableError` + 12 tests. **F-05-05 done cycle-8**: `parseGenerateObjectInput` zod boundary validator + `GenerateObjectSchema<T> = z.ZodSchema<T> \| Schema<T>` widening on `aiGenerateObject`; `ai-generate-object.handler.ts:26` `as any` removed; +45 tests covering happy path, every JSON-Schema structural keyword, prompt / schema / optional-field rejection, and prototype-bypass normalisation. **Sprint 05 closed**: zero `(schema as any) / (sdkProvider as any) / (sub-client as any)` left in `packages/module-ai/src/api/**`. `module-ai` suite: **218/218** (was 173). Dashboard tsc baseline 460 unchanged. The only `as any` left under `src/api/` is the unrelated `ai-tools-all.handler.ts:18 (mod as any).chat`, tracked separately. |
| 06 | Cross-cutting rule compliance | ⏳ Planned | — | Scope expanded from 5 → 7 findings (F-06-06/07 inherited from Sprint 01). |

**Status legend**: ⏳ Planned · 🟡 In progress · 🔵 Awaiting BO review · ✅ Done · 🛑 Blocked

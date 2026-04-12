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
| 05 | Handler type safety | ✅ Done (cycle-9) | `054ad8c` (cycle-9 `--no-ff` merge) | F-05-01 **done** cycle-3. F-05-02 **done** cycle-5. F-05-03 **done** cycle-6. F-05-04 **done** cycle-7. **F-05-05 landed on `origin/dev` as `054ad8c` (cycle-9 merge of `claude/inspiring-clarke-HBa3u`)**: `parseGenerateObjectInput` zod boundary validator + `GenerateObjectSchema<T> = z.ZodSchema<T> \| Schema<T>` widening; `ai-generate-object.handler.ts:26` `(schema as any)` removed; +45 tests. `@oven/module-ai` 173 → 218 green. **Sprint 05 closed on `dev`** — zero `(schema\|sdkProvider\|sub-client as any)` remain under `packages/module-ai/src/api/**`. The only `as any` left under `src/api/` is the unrelated `ai-tools-all.handler.ts:18 (mod as any).chat`, tracked as sprint-06 candidate. |
| 06 | Cross-cutting rule compliance | 🟡 In progress | cycle-9 Phase 4 on `claude/inspiring-clarke-IODSY` | **F-06-01 done cycle-9 Phase 4**: new `packages/module-ai/src/view/guardrail-record.ts` (`GuardrailRecord` interface + `GUARDRAIL_ACTION_COLORS` + `resolveGuardrailActionColor` with `Object.prototype.hasOwnProperty.call` own-property guard + `truncateGuardrailPattern`); `GuardrailList.tsx` four `FunctionField` call sites re-typed to `<FunctionField<GuardrailRecord>>`; zero `record: any` in the file; **+26 vitest tests** (`@oven/module-ai` 218 → 244 green). Dashboard `tsc --noEmit` 460 → 461 by one new `TS2307 Cannot find module '@oven/module-ai/view/guardrail-record'`, same category as the existing 28 `@oven/module-ai/*` subpath failures (Next.js resolves correctly at runtime via the package `exports` map). F-06-02..F-06-07 still ⏳. |

**Status legend**: ⏳ Planned · 🟡 In progress · 🔵 Awaiting BO review · ✅ Done · 🛑 Blocked

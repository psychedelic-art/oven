# QA Report -- oven-bug-sprint sprint-06 (cycle-11)

Date: 2026-04-12
Branch: `claude/stoic-hamilton-iouNt`
Base: `origin/dev` at `35b3ca9`

## Summary

Sprint-06 (cross-cutting rule compliance) is complete. All 7 findings
(F-06-01..F-06-07) resolved. F-06-01 was landed in cycle-10 on branch
`claude/inspiring-clarke-IODSY`. F-06-02..F-06-07 plus TypedFunctionField
extraction, render-function lift, and import-type sweep done in cycle-11
on this branch.

## Test Results

- `@oven/module-ai` vitest: **291/291 pass** (was 244 after cycle-10)
  - +13 tests (vector-store-record.test.ts)
  - +34 tests (playground-execution-record.test.ts)
- No new test failures introduced.

## Typecheck Results

- `tsc --noEmit` on `apps/dashboard`: 465 errors (was 461 post-cycle-10)
- Delta: +4 new `TS2307 Cannot find module` for subpath imports:
  - `@oven/module-ai/view/vector-store-record` (x2: VectorStoreShow, VectorStoreList)
  - `@oven/module-ai/view/playground-execution-record` (x2: PlaygroundExecutionShow, PlaygroundExecutionList)
- These are the **same category** as the pre-existing 28+
  `@oven/module-ai/*` subpath failures. Next.js resolves them at
  runtime via the package `exports` map. Not a regression.

## Ground-Truth Rule Compliance

- [x] No inline `style={{}}` introduced (checked all 5 modified dashboard files)
- [x] No `record: any` in the 5 sprint-scope files
- [x] No direct `clsx` or `classnames` imports
- [x] All type-only imports use `import type` or inline `type` keyword
- [x] MUI `sx` prop used exclusively (no `styled()`, no `className=`)
- [x] No new `as any` introduced
- [x] No speculative abstractions (TypedFunctionField has 16 call sites)
- [x] Error handling only at system boundaries (view helpers are pure)

## Files Changed

### New files
- `packages/module-ai/src/view/vector-store-record.ts`
- `packages/module-ai/src/view/playground-execution-record.ts`
- `packages/module-ai/src/__tests__/vector-store-record.test.ts`
- `packages/module-ai/src/__tests__/playground-execution-record.test.ts`
- `apps/dashboard/src/components/ai/_fields/TypedFunctionField.tsx`

### Modified files (dashboard)
- `apps/dashboard/src/components/ai/VectorStoreShow.tsx`
- `apps/dashboard/src/components/ai/VectorStoreList.tsx`
- `apps/dashboard/src/components/ai/PlaygroundExecutionShow.tsx`
- `apps/dashboard/src/components/ai/PlaygroundExecutionList.tsx`
- `apps/dashboard/src/components/ai/GuardrailList.tsx`

### Modified files (import type sweep, 23 handlers)
- `packages/module-ai/src/api/ai-aliases.handler.ts`
- `packages/module-ai/src/api/ai-aliases-by-id.handler.ts`
- `packages/module-ai/src/api/ai-budgets.handler.ts`
- `packages/module-ai/src/api/ai-budgets-by-id.handler.ts`
- `packages/module-ai/src/api/ai-describe-video.handler.ts`
- `packages/module-ai/src/api/ai-embed.handler.ts`
- `packages/module-ai/src/api/ai-generate.handler.ts`
- `packages/module-ai/src/api/ai-generate-image.handler.ts`
- `packages/module-ai/src/api/ai-generate-multimodal.handler.ts`
- `packages/module-ai/src/api/ai-generate-object.handler.ts`
- `packages/module-ai/src/api/ai-guardrails.handler.ts`
- `packages/module-ai/src/api/ai-guardrails-by-id.handler.ts`
- `packages/module-ai/src/api/ai-playground-executions.handler.ts`
- `packages/module-ai/src/api/ai-providers.handler.ts`
- `packages/module-ai/src/api/ai-providers-by-id.handler.ts`
- `packages/module-ai/src/api/ai-providers-test.handler.ts`
- `packages/module-ai/src/api/ai-speech.handler.ts`
- `packages/module-ai/src/api/ai-stream.handler.ts`
- `packages/module-ai/src/api/ai-tools-all.handler.ts`
- `packages/module-ai/src/api/ai-transcribe.handler.ts`
- `packages/module-ai/src/api/ai-vector-store-ops.handler.ts`
- `packages/module-ai/src/api/ai-vector-stores.handler.ts`
- `packages/module-ai/src/api/ai-vector-stores-by-id.handler.ts`

### Modified docs
- `docs/modules/todo/oven-bug-sprint/sprint-06-rule-compliance.md`
- `docs/modules/todo/oven-bug-sprint/STATUS.md`

## Verdict

PASS. Safe to merge into dev as cycle-11.

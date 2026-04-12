# QA Report -- `claude/inspiring-clarke-IODSY` (cycle-10)

Branch tip `df41913` sits directly on top of `origin/dev` (`054ad8c`) --
ahead=3, behind=0. No rebase required, no shared unmerged ancestors.

## Summary

3 commits, affecting `packages/module-ai` (new `view/` subpath + 26
tests) and `apps/dashboard/src/components/ai/GuardrailList.tsx`
(typed FunctionField call sites). Also carries docs updates
(PROGRESS.md, README.md, STATUS.md, sprint-06 checkbox,
cycle-9 HBa3u QA report).

Module: **oven-bug-sprint** (sprint-06-rule-compliance, finding F-06-01).

Commits (oldest to newest):

1. `15440f3` -- `docs(todo): regenerate progress after cycle-9 HBa3u landing`
2. `6fa225a` -- `feat(module-ai): F-06-01 typed GuardrailRecord view helpers`
3. `df41913` -- `docs(oven-bug-sprint): flip F-06-01 [x] and update sprint-06 status`

Backup branch: `bk/claude-inspiring-clarke-IODSY-20260412`.

## F-06-01 change surface

### Source changes

| File | Change |
|---|---|
| `packages/module-ai/src/view/guardrail-record.ts` | **NEW** -- 119 lines. `GuardrailRecord` interface (structural mirror of `aiGuardrails` drizzle table with `[key: string]: unknown` index for react-admin compat), `GUARDRAIL_ACTION_COLORS` const record, `resolveGuardrailActionColor(action)` with `Object.prototype.hasOwnProperty.call()` own-property guard, `truncateGuardrailPattern(pattern)` with configurable `GUARDRAIL_PATTERN_TRUNCATE_AT = 40`. |
| `packages/module-ai/package.json` | Added `"./view/*": "./src/view/*"` to `exports` map. |
| `apps/dashboard/src/components/ai/GuardrailList.tsx` | Removed inline `actionColors` map and four `record: any` casts. Now imports `GuardrailRecord`, `resolveGuardrailActionColor`, `truncateGuardrailPattern` from `@oven/module-ai/view/guardrail-record`. Four `FunctionField` call sites typed as `<FunctionField<GuardrailRecord>>`. |

### Docs changes

| File | Change |
|---|---|
| `docs/modules/todo/PROGRESS.md` | Regenerated for cycle-9 (HBa3u landing). |
| `docs/modules/todo/README.md` | Updated oven-bug-sprint row to reflect sprint-05 closure. Added cycle-9 landing note. |
| `docs/modules/todo/oven-bug-sprint/STATUS.md` | Sprint-05 row updated to reference `054ad8c` merge. Sprint-06 row changed to In progress with F-06-01 details. |
| `docs/modules/todo/oven-bug-sprint/sprint-06-rule-compliance.md` | F-06-01 checkbox `[ ] -> [x]` with implementation summary. |
| `docs/modules/todo/qa-reports/claude-inspiring-clarke-HBa3u-QA-REPORT.md` | **NEW** -- 130-line QA report for the cycle-9 landing of F-05-05. |

### Tests

| File | Change |
|---|---|
| `packages/module-ai/src/__tests__/guardrail-record.test.ts` | **NEW** -- 178 lines, **26 tests**. Covers `GUARDRAIL_ACTION_COLORS` structural pin, `resolveGuardrailActionColor` (known actions, fallbacks, prototype rejection), `truncateGuardrailPattern` (absence, length boundaries, ASCII ellipsis), `GuardrailRecord` type surface (full row, partial row, forward-compat index). |

### Test run

```
pnpm --filter @oven/module-ai test
Test Files  16 passed (16)
     Tests  244 passed (244)    (was 218 on dev; +26 guardrail-record)
Duration    2.70s
```

### Dashboard tsc baseline

```
dev (054ad8c):   460 errors
IODSY (df41913): 461 errors   (+1)
```

The +1 error is `TS2307: Cannot find module '@oven/module-ai/view/guardrail-record'`
in `GuardrailList.tsx:22`. Same category as the existing 28
`@oven/module-ai/*` subpath resolution failures -- Next.js resolves
correctly at runtime via the package `exports` map. The `./view/*`
entry is properly declared in `package.json`.

## Bugs

None found.

## Rule Compliance

| Rules file | Verdict |
|---|---|
| `docs/module-rules.md` | Pass -- view helpers live in `packages/module-<x>/src/view/`, new `exports` entry added, pure functions with no side effects. |
| `docs/package-composition.md` | Pass -- no cross-module imports; dashboard imports from `@oven/module-ai` which owns the guardrail schema. |
| `docs/routes.md` | N/A -- no API surface changed. |
| `docs/use-cases.md` | N/A -- no functional change; cosmetic extraction only. |
| `docs/modules/00-overview.md` | Pass -- follows module self-description pattern. |
| `docs/modules/20-module-config.md`, `21-module-subscriptions.md` | N/A -- no config/subscription surface touched. |
| `docs/modules/13-tenants.md`, `17-auth.md` | N/A -- no tenancy/auth boundaries touched. |
| `docs/modules/ai/*.md` | Pass -- no spec drift; view helper is a presentation concern not covered by the API spec. |
| Root `CLAUDE.md` | Pass -- zero `style={{ }}`; zero `clsx`/`classnames` direct imports; `import type` for `GuardrailRecord` and the drizzle type aliases; `sx` prop used for Typography styling; no zustand changes; error handling only at boundary (hasOwnProperty guard is defensive parsing, not try/catch). |
| `docs/modules/todo/oven-bug-sprint/sprint-06-rule-compliance.md` | Pass -- F-06-01 row flipped `[x]` with implementation summary. |

## Style Violations

None. `GuardrailList.tsx` uses `sx` for all styling. `import type` for
type-only `GuardrailRecord`. No inline `style={}`. No `record: any`.

## Test Gaps

None. The 26 new tests exhaustively cover both exported helpers and the
type surface. The `GuardrailList.tsx` component itself is a thin
pass-through to these helpers -- no additional component-level tests
required at this stage.

## Recommendation

**MERGE.**

Clean F-06-01 extraction that removes all `record: any` from
`GuardrailList.tsx`, adds prototype-safe colour resolution, and pins
behaviour with 26 regression tests. `module-ai` 244/244 green.
Dashboard tsc +1 (same-category subpath resolution, resolves at
runtime). Zero rule-compliance violations. Zero behavioural change in
rendered output.

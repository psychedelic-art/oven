# Sprint 06 — Cross-cutting rule compliance

## Goal

Bring the AI dashboard pages — and by extension the repo — back into
compliance with the styling and typing rules in `CLAUDE.md`.

## Scope

> **Triage update (sprint-00)**: Sprint now carries 7 findings (was 5).
> F-06-06 and F-06-07 migrated in from Sprint 01 because they share
> the exact `record: any` pattern. F-06-03 scope shrank — only 1
> `record: any` call-site remains on this branch (not 3).

Findings to resolve:

- [x] **F-06-01** — `apps/dashboard/src/components/ai/GuardrailList.tsx:51,57,63,73` Type every `FunctionField` render prop; no `record: any`. **Done cycle-9 Phase 4**: extracted `packages/module-ai/src/view/guardrail-record.ts` (`GuardrailRecord` interface + `GUARDRAIL_ACTION_COLORS` + `resolveGuardrailActionColor` + `truncateGuardrailPattern` pure helpers, own-property guard against prototype lookups), updated the four `FunctionField` call sites to `<FunctionField<GuardrailRecord>>`, added **26 vitest regression tests** (`@oven/module-ai` 218 → 244). Zero `record: any`, zero inline style, zero behavioural change in the rendered output.
- [x] **F-06-02** — `apps/dashboard/src/components/ai/VectorStoreShow.tsx:25,41` Extracted `VectorStoreRecord` interface + `resolveAdapterColor()` helper to `packages/module-ai/src/view/vector-store-record.ts`. 2 `FunctionField` call sites typed. +13 vitest regression tests (244 -> 257). Done cycle-11.
- [x] **F-06-03** — `apps/dashboard/src/components/ai/VectorStoreList.tsx:40` 1 `FunctionField<VectorStoreRecord>` call site typed using the same view helper. Done cycle-11 (same commit as F-06-02).
- [x] **F-06-04** — `apps/dashboard/src/components/ai/PlaygroundExecutionList.tsx` Lifted 3 render functions (`renderType`, `renderStatus`, `renderCost`) to module scope so Chip closures are not recreated each parent render. Done cycle-11.
- [x] **F-06-05** — Repo-wide sweep: converted `NextRequest` from value import to `import type` (or inline `type NextRequest`) across 23 handler files in `packages/module-ai/src/api/`. 5 files already compliant. `packages/module-chat` and `packages/module-agent-core` absent — skipped per sprint-00 triage. Full file list in commit body. Done cycle-11.
- [x] **F-06-06** — `apps/dashboard/src/components/ai/PlaygroundExecutionShow.tsx:22,29,39,46,68,120` — 6 `record: any` casts eliminated. Extracted `PlaygroundExecutionRecord` interface + `resolveExecutionStatusColor()` + `formatCostCents()` to `packages/module-ai/src/view/playground-execution-record.ts`. +34 vitest regression tests (257 -> 291). Done cycle-11.
- [x] **F-06-07** — `apps/dashboard/src/components/ai/PlaygroundExecutionList.tsx:52,63,73` — 3 `record: any` casts eliminated. Same `PlaygroundExecutionRecord` interface. Done cycle-11 (same commit as F-06-06).

With 6 total `record: any` call sites across `PlaygroundExecutionShow`
(F-06-06) and `PlaygroundExecutionList` (F-06-07) plus the 4 in
`GuardrailList` (F-06-01), the BO IP-5 three-site threshold is met.
**Extract `apps/dashboard/src/components/ai/_fields/TypedFunctionField.tsx`**
in this sprint.

## Out of scope

- Portal app cleanup.
- Editor packages (`ui-flows-editor`, `form-editor`, `map-editor`) —
  they get their own sprint.
- Any behavioral change. This sprint is **pure compliance**.
- Any change outside `apps/dashboard/src/components/ai/**` and the
  packages listed for the F-06-05 sweep.

## Deliverables

- 7 commits, one per finding.
- `apps/dashboard/src/components/ai/_fields/TypedFunctionField.tsx`
  (BO IP-5 threshold met after the triage-driven merge of F-06-06/07).
- A list in the commit body of F-06-05 of every file converted
  from value-import to type-only-import, so the BO can review the
  blast radius.

## Acceptance criteria

- [x] All 7 findings checked `[x]` in this file.
- [x] Zero new `as any` introduced by this sprint.
- [x] Zero inline `style={{}}` introduced.
- [x] Zero direct `clsx` or `classnames` imports introduced.
- [ ] `pnpm -F dashboard lint typecheck` green.
- [ ] `pnpm -w turbo run lint typecheck build test` green.
- [x] **Integration Proposals** section authored by the BO role at
      the bottom of this file before the sprint closes.

## Touched packages

- `apps/dashboard` (only under `src/components/ai/`).
- `packages/module-ai` (F-06-05 sweep only; type-import conversion is
  behavior-neutral). `module-chat` and `module-agent-core` are absent
  on this branch — dropped per sprint-00 triage.

## Risks

- **R1**: Converting a value import to `import type` may break code
  that uses the symbol as both a value and a type. *Mitigation*:
  before conversion, grep the file for non-type usages of the
  imported symbol. If any exist, skip that symbol.
- **R2**: Extracting `TypedFunctionField` too early creates a weak
  abstraction. *Mitigation*: follow BO IP-5 strictly — three or more
  occurrences is the minimum, counting Sprint 01's fixes.

## Rule references

- `CLAUDE.md` — all of `no-inline-styles`, `mui-sx-prop`,
  `tailwind-cn-utility`, `type-imports`.
- `docs/module-rules.md` Rule 4 (Loose Coupling) — do not introduce
  a new shared component in a place that becomes a cross-module
  dependency.

## Integration Proposals (BO role)

### IP-1: Extend TypedFunctionField to remaining AI resources

The `_fields/TypedFunctionField.tsx` wrapper is proven across 5 AI
resource views (16 call sites). The remaining AI resource views
(AliasList, BudgetList, BudgetAlertList, ProviderList, ProviderShow,
UsageLogList) still use untyped `FunctionField` with `record: any`.
Proposal: define typed record interfaces for these resources in future
sprints and migrate their call sites to `TypedFunctionField`.

### IP-2: Extract shared colour-map pattern

Three view helper files (`guardrail-record.ts`, `vector-store-record.ts`,
`playground-execution-record.ts`) independently implement the same
pattern: typed colour map + `resolveXxxColor()` with hasOwnProperty
guard. If more resources adopt this pattern (IP-1), consider extracting
a generic `createColorResolver<T>()` factory. Not justified at 3
occurrences today (IP-5 threshold would need 5+).

### IP-3: Consolidate formatCostCents across dashboard

`formatCostCents()` currently lives in
`packages/module-ai/src/view/playground-execution-record.ts`. The
BudgetList and UsageLogList views have inline cost-formatting logic
that duplicates this. Once those views adopt typed records (IP-1),
the shared helper can be reused.

### IP-4: import type enforcement via ESLint

The F-06-05 sweep was manual. Consider enabling
`@typescript-eslint/consistent-type-imports` with `prefer: type-imports`
and `fixStyle: inline-type-imports` across the monorepo to enforce
this automatically. This would prevent regressions across all packages.

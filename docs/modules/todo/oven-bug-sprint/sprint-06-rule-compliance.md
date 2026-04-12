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
- [x] **F-06-02** — `apps/dashboard/src/components/ai/VectorStoreShow.tsx:28,44` Same pattern; define `interface VectorStoreRecord`. **Done cycle-11**: extracted `packages/module-ai/src/view/vector-store-record.ts` (`VectorStoreRecord` interface + `VECTOR_STORE_ADAPTER_COLORS` + `resolveAdapterColor` pure helper), updated 2 call sites, +18 vitest tests (module-ai 244 -> 262).
- [x] **F-06-03** — `apps/dashboard/src/components/ai/VectorStoreList.tsx:43` Same (only one call site on this branch, triage-verified). **Done cycle-11**: updated 1 call site, removed duplicated `adapterColors` map. Covered by F-06-02 tests.
- [x] **F-06-04** — `apps/dashboard/src/components/ai/PlaygroundExecutionList.tsx` Memoize expensive render functions or lift them to module scope so Chip / Box are not recreated each parent render. **Done cycle-11**: lifted `renderType`, `renderStatus`, `renderCost` to module-scope constants.
- [x] **F-06-05** — Repo-wide sweep: grep for `^import \{[^}]*\}` imports where every symbol is only used as a type and convert to `import type`. Start with `packages/module-ai` and `apps/dashboard/src/components/ai`. **Done cycle-11**: zero conversions needed. All type-only imports already use `import type` or inline `type` keyword.
- [x] **F-06-06** — `apps/dashboard/src/components/ai/PlaygroundExecutionShow.tsx:24,31,41,50,72,124` — 6 `record: any` casts. **Done cycle-11**: extracted `packages/module-ai/src/view/playground-execution-record.ts` (`PlaygroundExecutionRecord` interface + `EXECUTION_STATUS_COLORS` + `EXECUTION_TYPE_COLORS` + `resolveStatusColor` + `resolveTypeColor` + `formatCostCents` pure helpers), updated all 6 call sites, +37 vitest tests (module-ai 262 -> 299).
- [x] **F-06-07** — `apps/dashboard/src/components/ai/PlaygroundExecutionList.tsx:60,71,81` — 3 `record: any` casts. **Done cycle-11**: updated 3 call sites, removed duplicated `statusColors`/`typeColors` maps. Covered by F-06-06 tests.

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

**IP-1: Migrate remaining AI dashboard views to TypedFunctionField**

The `TypedFunctionField` component extracted in this sprint is a thin
wrapper but codifies the "always type your FunctionField" pattern.
Future AI dashboard views (e.g., BudgetList, UsageLogList, ProviderShow)
still import `FunctionField` directly. A follow-up commit could migrate
those call-sites to import from `_fields/TypedFunctionField` for
consistency. Low priority — the existing call-sites do not have
`record: any` because they use `source=` props instead of `render=`.

**IP-2: Extend view helpers to remaining AI resource pages**

The pattern of extracting `*Record` interfaces + pure colour/format
helpers into `packages/module-ai/src/view/` has proven effective across
three resource types. The following pages still use inline colour maps
or untyped render callbacks and would benefit from the same treatment:
- `ProviderList.tsx` / `ProviderShow.tsx` (provider type colours)
- `BudgetList.tsx` (budget scope colours)
- `UsageLogList.tsx` (status colours)
- `AliasList.tsx` (model type colours)
Recommended as sprint-07 candidates if the oven-bug-sprint continues.

**IP-3: Lint rule to prevent `record: any` regression**

Now that all FunctionField call-sites in `apps/dashboard/src/components/ai/`
are typed, consider adding an ESLint rule or a grep-based CI check that
flags new `record: any` patterns in this directory. A simple regex in
`.github/workflows/` would catch regressions before code review.

**IP-4: Consider module-scoped render function pattern for all list views**

The F-06-04 lift of render functions to module scope in
PlaygroundExecutionList is a performance win. The same pattern could be
applied to GuardrailList, VectorStoreList, and other list views that
use inline arrow render callbacks. Low priority — no measurable perf
issue today, but good hygiene for views with many rows.

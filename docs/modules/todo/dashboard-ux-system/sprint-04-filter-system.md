# Sprint 04 — Shared Filter System

## Goal

Ship a shared, combo-box-first filter toolbar from `@oven/dashboard-ui`
and migrate three reference modules end-to-end. Every filter is driven by
URL query params, every multi-value filter is a combo box by default,
every toolbar supports active-filter chips with a "clear all" affordance.
This closes DRIFT-2 for the reference modules and sets the template for
the consistency pass in sprint-06.

## Scope

### In

- `packages/dashboard-ui/src/filters/FilterToolbar.tsx` — MUI `sx`-only
  toolbar component. Props:
  - `resource: string` (React Admin resource name)
  - `filters: FilterDefinition[]` (typed list)
  - `quickSearch?: { source: string, label: string }` for the always-on
    text input
  - `tenantScoped?: boolean` (defaults `true`) — when true, auto-injects
    the tenant filter from `useTenantContext`
  - Renders an always-on search + a row of filter chips + a "Filters"
    popover button that opens a `<Menu>` listing all non-primary
    filters
  - Active filters render as MUI `<Chip>` with an `onDelete` handler
    that removes the filter from the React Admin `ListContext`
  - A "Clear all" action resets every filter (but never the tenant
    context — admin mode clears independently)
- `packages/dashboard-ui/src/filters/ComboBoxFilter.tsx` — wraps
  `<AutocompleteInput>` with a consistent label, loading state, and
  "no results" slot. Supports both `choices` and `reference` + `optionText`.
- `packages/dashboard-ui/src/filters/DateRangeFilter.tsx` — two-date
  combo filter (from / to) emitting `{ [source]: { gte, lte } }`.
- `packages/dashboard-ui/src/filters/StatusFilter.tsx` — a specialisation
  of `ComboBoxFilter` for enum-style columns (`status`, `enabled`,
  `channelType`, etc.). Accepts `choices` as an array of
  `{ id, name, colour? }` and renders the colour dot in the popover.
- `packages/dashboard-ui/src/filters/QuickSearchFilter.tsx` — the
  always-on search input with debounced commit to `ListContext`.
- `packages/dashboard-ui/src/filters/types.ts` — `FilterDefinition`,
  `FilterKind` (`combo | date-range | status | quick-search | boolean`),
  `FilterValue`.
- `packages/dashboard-ui/src/filters/useUrlFilters.ts` — hook that
  syncs React Admin `ListContext` to `URLSearchParams` so tenant
  switching + browser back-button behave correctly.
- Tests under `packages/dashboard-ui/src/__tests__/filters/`:
  - `FilterToolbar.test.tsx` — renders filters, opens popover, commits
    a combo selection, shows an active chip, clears the chip, clears
    all, and preserves the tenant filter across "clear all".
  - `ComboBoxFilter.test.tsx` — choice list and reference mode.
  - `DateRangeFilter.test.tsx` — from / to commit + invalid range
    rejection.
  - `StatusFilter.test.tsx` — colour dot rendering + multi-select.
  - `useUrlFilters.test.ts` — round-trip filter object to URL and
    back.
- Migrate three reference modules:
  - `apps/dashboard/src/components/ai/AliasList.tsx`
  - `apps/dashboard/src/components/chat/ChatSessionList.tsx`
  - `apps/dashboard/src/components/knowledge-base/EntryList.tsx`
  Each replaces the inline `filters` array with a single
  `<FilterToolbar filters={...} />` call. Every filter maps to
  one `FilterDefinition`. Tenant filter is auto-injected via
  `tenantScoped`.
- Migration note: `docs/modules/todo/dashboard-ux-system/migration-filter-toolbar.md`
  describing the before / after pattern for the remaining modules
  (consumed by sprint-06).

### Out

- Migrating any module beyond the three reference modules (sprint-06)
- Playground refactors (sprint-05)
- New chrome primitives (sprint-06)
- Any change to API handlers — filters map directly to the existing
  React Admin query params consumed by `parseListParams()`

## Deliverables

1. `packages/dashboard-ui/src/filters/**` — toolbar + 4 filter
   components + `useUrlFilters` hook + types
2. 5 test files under `packages/dashboard-ui/src/__tests__/filters/`
3. 3 migrated lists: `ai/AliasList.tsx`, `chat/ChatSessionList.tsx`,
   `knowledge-base/EntryList.tsx`
4. `docs/modules/todo/dashboard-ux-system/migration-filter-toolbar.md`
5. Commit: `feat(dashboard-ui): filter toolbar + 4 filter primitives`
6. Commit: `test(dashboard-ui): cover filter toolbar, combo, date range, status, url sync`
7. Commit: `refactor(dashboard): migrate 3 reference lists to FilterToolbar`
8. Commit: `docs(dashboard-ux-system): record sprint-04 completion + migration pattern`

## Acceptance criteria

- [ ] `pnpm --filter @oven/dashboard-ui test` exits 0 with every filter
  test green.
- [ ] `pnpm --filter dashboard typecheck` exits 0.
- [ ] `FilterToolbar` renders an always-on search, a filter popover,
  and active-filter chips — verified in `FilterToolbar.test.tsx`.
- [ ] `useUrlFilters` round-trips a filter object through
  `URLSearchParams` without data loss — verified in
  `useUrlFilters.test.ts`.
- [ ] The three reference lists have no inline `filters` array
  remaining (`grep -rn 'const filters = \[' apps/dashboard/src/components/{ai/AliasList.tsx,chat/ChatSessionList.tsx,knowledge-base/EntryList.tsx}`
  returns nothing).
- [ ] The "Clear all" action does not reset the tenant filter when the
  user is in tenant mode (`isAdminMode === false`) — asserted in test.
- [ ] Every filter component uses MUI `sx` only — `grep -rn 'style={'
  packages/dashboard-ui/src/filters` returns nothing.
- [ ] `STATUS.md` updated with commit hashes.

## Dependencies

- Sprint-01 (foundation primitive)
- Sprint-03 (tenant context wired — filter toolbar reads
  `useTenantContext`)
- `module-tenants` (for the tenant reference inside the auto-injected
  tenant filter when `isAdminMode` is true)
- Research R4 (Stripe — design patterns for Stripe Apps) — pattern as a
  unit of reuse
- Research R5 (PatternFly — Filters design guidelines) — taxonomy of
  filter types
- Research R6 (bazza/ui — Data table filter) — faceted filter popover +
  URL sync + chips
- Research R7 (MUI X Data Grid Filtering) — `sx` customization recipes
- Research R8 (Smart Interface Design — Complex filtering UX) — active
  chips, OR-within-group / AND-across-group, mobile collapse
- Use case: **consistent filtering across modules** (`$PRIMARY_USE_CASES`)
- Use case: **reusable filter components** (`$PRIMARY_USE_CASES`)

## Risks

- **URL sync conflict with React Admin's own query state** — React
  Admin already pushes filters into the URL. Mitigation: wrap
  `useUrlFilters` around `useListContext()` so we observe RA's state
  rather than fighting it; only translate between `ListContext` filter
  objects and our shared filter definition shape.
- **Chip overflow on small screens** — mitigated by MUI responsive
  breakpoints in `sx`; chips collapse into a "+N" indicator at
  `xs`.
- **Combo box performance on large tenant lists** — mitigated by
  reusing React Admin's built-in virtualized autocomplete for
  `reference`-backed combos.

## Test plan

- TDD order:
  1. Write `FilterToolbar.test.tsx` first asserting render + chip
     commit + clear-all; implement.
  2. Write `ComboBoxFilter.test.tsx`; implement.
  3. Write `DateRangeFilter.test.tsx`; implement.
  4. Write `StatusFilter.test.tsx`; implement.
  5. Write `useUrlFilters.test.ts`; implement.
  6. Migrate `AliasList.tsx`, `ChatSessionList.tsx`, `EntryList.tsx`.
  7. Manual walk-through: filter by tenant + status + date range;
     refresh page, confirm URL restores state.

## Rule compliance checklist

- [ ] Rule 6.1 — filter toolbar works inside React Admin `List`
- [ ] Rule 6.3 — filter toolbar auto-injects the tenant filter
- [ ] Root `CLAUDE.md` `mui-sx-prop` — every new component uses `sx` only
- [ ] Root `CLAUDE.md` `no-inline-styles` — zero `style={}`
- [ ] Root `CLAUDE.md` `type-imports` — every type import uses
  `import type`

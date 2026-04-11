# Sprint 06 — Dashboard Consistency Pass

## Goal

Ship the remaining shared chrome primitives — `PageHeader`, `EmptyState`,
`LoadingSkeleton`, `ErrorBoundary`, `MenuSectionLabel` — from
`@oven/dashboard-ui`, then sweep every module's list / create / edit /
show / custom page to use them. Migrate every non-reference module onto
the sprint-04 filter toolbar. This is the broadest-scope sprint in the
program — it is the consistency pass that makes the dashboard feel
coherent instead of stitched together.

## Scope

### In

- `packages/dashboard-ui/src/chrome/PageHeader.tsx` — MUI `sx`-only
  header with slots for title, breadcrumb, description, and primary
  action button. Props match the React Admin `Title` convention.
- `packages/dashboard-ui/src/chrome/EmptyState.tsx` — renders an icon,
  headline, description, and a primary call-to-action (e.g. "Create
  first entry"). Accepts `icon`, `title`, `description`, `action`.
- `packages/dashboard-ui/src/chrome/LoadingSkeleton.tsx` — wraps MUI
  `<Skeleton>` into three variants: `list`, `form`, `detail`. List
  variant renders a datagrid-shaped skeleton; form variant renders a
  stacked input skeleton.
- `packages/dashboard-ui/src/chrome/ErrorBoundary.tsx` — class component
  (needed for `componentDidCatch`) that renders a recoverable error
  state with a "Retry" button. Logs the error to the console; no
  external telemetry. Follows the root `CLAUDE.md` guidance that error
  handling lives at system boundaries.
- `packages/dashboard-ui/src/chrome/MenuSectionLabel.tsx` — the
  `<Typography variant="overline">` + `<Divider>` pattern currently
  hand-rolled in `CustomMenu.tsx`, wrapped in a single MUI `sx`-only
  component.
- Tests under `packages/dashboard-ui/src/__tests__/chrome/`:
  - `PageHeader.test.tsx`
  - `EmptyState.test.tsx`
  - `LoadingSkeleton.test.tsx`
  - `ErrorBoundary.test.tsx`
  - `MenuSectionLabel.test.tsx`
- `apps/dashboard/src/components/CustomMenu.tsx` — migrate every
  hand-rolled section label to `<MenuSectionLabel>`. Grep check: zero
  `<Typography variant="overline">` remaining inside `CustomMenu.tsx`.
- Apply `<PageHeader>` to every `*List.tsx` and custom page, driven by
  the sprint-02 audit matrix.
- Apply `<EmptyState>` to every list that currently renders a blank
  datagrid when empty.
- Apply `<LoadingSkeleton variant="list" />` to every list via React
  Admin's `loading` slot.
- Wrap every `customRoutes` top-level page in `<ErrorBoundary>`.
- Complete the sprint-04 `FilterToolbar` migration for every remaining
  tenant-scoped list. Driven by the sprint-02 audit: for every row
  routed to sprint-06, the filter array is replaced by a
  `FilterToolbar` call.
- `docs/modules/todo/dashboard-ux-system/sweep-report.md` —
  file-by-file before / after for every modified file, with grep
  checksums demonstrating no `style={}` drift.

### Out

- New features, new modules, new flows
- Any change to API handlers
- Any change to `UnifiedAIPlayground` or `@oven/agent-ui`
- Portal (`apps/dashboard/src/app/portal/**`) — Tailwind surface,
  separate UX system
- Editor packages (`*-editor/`)
- Performance optimisation (out of scope — just consistency)

## Deliverables

1. 5 chrome components + 5 test files under
   `packages/dashboard-ui/src/{chrome,__tests__/chrome}/**`
2. `CustomMenu.tsx` migrated
3. Every tenant-scoped list migrated onto `FilterToolbar` (count from
   sprint-02 audit)
4. Every list with `PageHeader`, `EmptyState`, `LoadingSkeleton`
5. Every custom route wrapped in `ErrorBoundary`
6. `sweep-report.md` with the per-file diff summary
7. Commit: `feat(dashboard-ui): chrome primitives (PageHeader, EmptyState, LoadingSkeleton, ErrorBoundary, MenuSectionLabel)`
8. Commit: `test(dashboard-ui): cover 5 chrome primitives`
9. Commit: `refactor(dashboard): migrate CustomMenu sections to MenuSectionLabel`
10. Commit: `refactor(dashboard): apply FilterToolbar across every tenant-scoped list`
11. Commit: `refactor(dashboard): apply PageHeader + EmptyState + LoadingSkeleton across lists`
12. Commit: `refactor(dashboard): wrap custom routes in ErrorBoundary`
13. Commit: `docs(dashboard-ux-system): record sprint-06 completion + sweep report`

## Acceptance criteria

- [ ] `pnpm --filter @oven/dashboard-ui test` exits 0.
- [ ] `pnpm --filter dashboard typecheck` exits 0.
- [ ] `grep -rn '<Typography variant="overline"' apps/dashboard/src/components/CustomMenu.tsx`
  returns nothing.
- [ ] `grep -rn 'style={' apps/dashboard/src` diff against `dev` shows
  zero new hits.
- [ ] `grep -rn 'const filters = \[' apps/dashboard/src/components`
  returns nothing for tenant-scoped lists.
- [ ] Every `customRoutes` entry in `AdminApp.tsx` renders inside
  `<ErrorBoundary>` — verified by snapshot.
- [ ] `sweep-report.md` enumerates every modified file and shows
  before / after LOC.
- [ ] `STATUS.md` updated; the program-level acceptance checklist has
  every chrome row checked.

## Dependencies

- Sprint-01 (chrome barrel stubs)
- Sprint-02 (audit matrix tells us the exact files to sweep)
- Sprint-03 (tenant context wired)
- Sprint-04 (filter toolbar ready to extend)
- Sprint-05 (playground wrappers already mount the shell — they pick up
  `PageHeader` via the shell slot)
- Research R4 (Stripe design patterns) — consistency as a platform
  feature
- Research R12 (Dashboard design patterns 2026) — chrome taxonomy
- Use case: **admin vs user scoped dashboards** (`$PRIMARY_USE_CASES`)
- Use case: **reusable filter components** (`$PRIMARY_USE_CASES`)

## Risks

- **Diff sprawl** — the sweep touches dozens of files. Mitigation:
  commits are split per primitive so each PR reviewer sees a narrow
  change. The `sweep-report.md` file keeps a running ledger.
- **Typecheck regression** — React Admin slot types can drift when a
  page suddenly renders a new chrome element. Mitigation: run
  `pnpm --filter dashboard typecheck` after every refactor commit,
  not only at the end of the sprint.
- **Empty state false positives** — a list can legitimately be empty
  on first load. The `EmptyState` must distinguish "empty because
  loading" from "empty because no data". Mitigation: use React Admin's
  `total === 0 && !isLoading` guard inside the list render.
- **Error boundary catching real bugs** — wrapping every route risks
  hiding stack traces we used to see in the console. Mitigation: the
  boundary always logs `error.stack` to the console before rendering
  the recovery UI.

## Test plan

- TDD order:
  1. Write the 5 chrome component tests and implement each primitive.
  2. Migrate `CustomMenu.tsx`; run typecheck + manual smoke.
  3. Migrate filter toolbar across each module, one module per
     commit; run typecheck after each.
  4. Apply `PageHeader` + `EmptyState` + `LoadingSkeleton` across each
     list, one module per commit.
  5. Wrap `customRoutes` in `ErrorBoundary`; deliberately throw in a
     dev build to verify the recovery UI.
  6. Record before / after in `sweep-report.md`.

## Rule compliance checklist

- [ ] Rule 6.1 — every CRUD view uses the new chrome
- [ ] Rule 6.2 — `CustomMenu.tsx` section labels use `MenuSectionLabel`
- [ ] Rule 6.3 — tenant filter still auto-injected via `FilterToolbar`
- [ ] Rule 6.4 — no create form regresses
- [ ] Rule 6.6 — show pages untouched unless already in scope
- [ ] Root `CLAUDE.md` `mui-sx-prop` — all new chrome uses `sx` only
- [ ] Root `CLAUDE.md` `no-inline-styles` — zero `style={}` drift
- [ ] Root `CLAUDE.md` `type-imports` — every type-only import correct

# Dashboard UX System -- STATUS

| Field | Value |
|---|---|
| Program type | cross-cutting UX program (not a module) |
| Current sprint | `sprint-01-foundation.md` |
| Sprint state | **done** (cycle-29) |
| Package | `packages/dashboard-ui/` (`@oven/dashboard-ui`) -- LIVE |
| Active branch | `claude/stoic-hamilton-47JqR` |
| Backup branch | `bk/claude-stoic-hamilton-47JqR-20260413` |
| Open PR | pending cycle-29 |
| Test framework | `vitest` 3.2.4 |
| QA verdict | **pass** -- 26/26 tests green |
| Blockers | none |

## Last updates

- 2026-04-13 -- Sprint-01 foundation executed on `claude/stoic-hamilton-47JqR`:
  - `packages/dashboard-ui/` scaffolded with tenant context primitive.
  - `createTenantStore` factory (zustand/vanilla, parameterized, no singleton).
  - `TenantContextProvider` (React context + useRef).
  - `useTenantContext` hook (selector + full-object overloads).
  - `TenantSelector` (MUI Autocomplete, sx-only).
  - Placeholder barrels: filters, chrome, playground.
  - 4 test files, 26 tests: createTenantStore (13), TenantContextProvider (5), TenantSelector (3), rules (5).
  - Zero `style={}` violations. All MUI `sx`. No cross-module imports.
- 2026-04-11 -- Program folder bootstrapped on `claude/dashboard-ux-system-nESUZ`.
  Canonical doc set skipped (program, not module). Sprint roadmap authored
  (00-07). Research shortlist recorded in `CODE-REVIEW.md` under `## Research`.
  No code shipped.

## Discovery outputs (sprint-00)

- **Tenant context primitive** -- IMPLEMENTED (sprint-01).
  `useTenantContext` / `activeTenantId` now exported from `@oven/dashboard-ui`.
- **Filter UX** -- placeholder exported. Implementation deferred to sprint-04.
- **Playgrounds** -- placeholder exported. Implementation deferred to sprint-05.
- **Dashboard chrome** -- placeholders exported. Implementation deferred to sprint-06.
- **Package landscape** -- `@oven/dashboard-ui` now exists.

## Acceptance checklist (program-level)

- [x] `packages/dashboard-ui/` exists, compiles, tests green
- [x] `TenantContextProvider` + `useTenantContext` + `TenantSelector` exported
- [ ] `AdminApp` wraps all routes in `<TenantContextProvider>` (sprint-03)
- [ ] Global tenant selector appears in the React Admin AppBar (sprint-03)
- [ ] Every tenant-scoped `*List` reads `useTenantContext().activeTenantId` (sprint-03)
- [ ] `<FilterToolbar>` + `<ComboBoxFilter>` + `<DateRangeFilter>` + `<StatusFilter>` shipped (sprint-04)
- [ ] At least 3 reference modules migrated to the new filter toolbar (sprint-04)
- [ ] `UnifiedAIPlayground` wraps AI Playground, KB Playground, Agent Playground surfaces (sprint-05)
- [ ] Dead `AIPlayground.tsx` code paths removed (sprint-05)
- [ ] `PageHeader`, `EmptyState`, `LoadingSkeleton`, `ErrorBoundary` exported and applied (sprint-06)
- [ ] Menu sections in `CustomMenu.tsx` use the shared section label primitive (sprint-06)
- [x] No `style={}` introduced anywhere (root `CLAUDE.md` rule)
- [ ] Tenant switching golden path manually verified (sprint-03)
- [ ] `docs/modules/todo/PROGRESS.md` updated with graduation row (sprint-07)

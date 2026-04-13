# Dashboard UX System -- STATUS

| Field | Value |
|---|---|
| Program type | cross-cutting UX program (not a module) |
| Current sprint | `sprint-04-filter-system.md` |
| Sprint state | **done** |
| Package | `packages/dashboard-ui/` (`@oven/dashboard-ui`) -- LIVE |
| Active branch | `claude/dashboard-ux-system-nESUZ` |
| Backup branch | `bk/claude-stoic-hamilton-tOJfY-20260413` |
| Open PR | none |
| Test framework | `vitest` 3.2.4 |
| QA verdict | **pass** -- 63/63 tests green (29 existing + 34 new filter tests) |
| Blockers | none |

## Last updates

- 2026-04-13 -- Sprint-04 filter system executed on `claude/dashboard-ux-system-nESUZ`:
  - `packages/dashboard-ui/src/filters/` shipped: `types.ts`, `useUrlFilters.ts`,
    `FilterToolbar.tsx`, `ComboBoxFilter.tsx`, `StatusFilter.tsx`, `DateRangeFilter.tsx`,
    `QuickSearchFilter.tsx`, barrel `index.ts`.
  - 5 test files, 34 new tests (14 useUrlFilters + 4 ComboBox + 4 Status + 4 DateRange + 8 FilterToolbar).
  - Total: 10 test files, 63/63 tests green.
  - 3 reference lists migrated: `ai/AliasList.tsx`, `chat/ChatSessionList.tsx`,
    `knowledge-base/EntryList.tsx`. All inline `const filters = [` arrays removed.
  - Migration guide: `docs/modules/todo/dashboard-ux-system/migration-filter-toolbar.md`.
  - Grep gates: zero `style={}` in `packages/dashboard-ui/src/filters/`, zero
    `const filters = [` in the 3 migrated files.
- 2026-04-13 -- Sprint-02 UX audit executed on `claude/stoic-hamilton-tOJfY`:
  - Full audit of 62 List, 45 Create, 41 Edit, 34 Show, 4 Playground, and 3 chrome files.
  - 5 audit documents produced: lists.md, create-forms.md, playgrounds.md, chrome.md, summary.md.
  - Key findings: 0/18 lists use useTenantContext, 0/16 create forms auto-assign tenant,
    3/4 playgrounds bypass UnifiedAIPlayground, 18 menu sections hand-rolled.
  - 16 style={} violations found across 8 files (tiles, tilesets, flows, flow-items).
  - Priority backlog: sprint-03 (tenant migration, 34 files), sprint-04 (filter toolbar),
    sprint-05 (playground unification, 2,796 lines), sprint-06 (chrome + consistency).
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
- **Filter UX** -- IMPLEMENTED (sprint-04). `FilterToolbar`, `ComboBoxFilter`,
  `StatusFilter`, `DateRangeFilter`, `QuickSearchFilter`, `serializeFilters`,
  `parseUrlFilters`, `getActiveFilterLabels` exported from `@oven/dashboard-ui`.
- **Playgrounds** -- placeholder exported. Implementation deferred to sprint-05.
- **Dashboard chrome** -- placeholders exported. Implementation deferred to sprint-06.
- **Package landscape** -- `@oven/dashboard-ui` now exists.

## Acceptance checklist (program-level)

- [x] `packages/dashboard-ui/` exists, compiles, tests green
- [x] `TenantContextProvider` + `useTenantContext` + `TenantSelector` exported
- [x] `AdminApp` wraps all routes in `<TenantContextProvider>` (sprint-03, cycle-32)
- [x] Global tenant selector appears in the React Admin AppBar (sprint-03, cycle-32)
- [x] Every tenant-scoped `*List` reads `useTenantContext().activeTenantId` (sprint-03, cycle-32)
- [x] `<FilterToolbar>` + `<ComboBoxFilter>` + `<DateRangeFilter>` + `<StatusFilter>` shipped (sprint-04)
- [x] At least 3 reference modules migrated to the new filter toolbar (sprint-04: AliasList, ChatSessionList, EntryList)
- [ ] `UnifiedAIPlayground` wraps AI Playground, KB Playground, Agent Playground surfaces (sprint-05)
- [ ] Dead `AIPlayground.tsx` code paths removed (sprint-05)
- [ ] `PageHeader`, `EmptyState`, `LoadingSkeleton`, `ErrorBoundary` exported and applied (sprint-06)
- [ ] Menu sections in `CustomMenu.tsx` use the shared section label primitive (sprint-06)
- [x] No `style={}` introduced anywhere (root `CLAUDE.md` rule)
- [ ] Tenant switching golden path manually verified (sprint-03)
- [ ] `docs/modules/todo/PROGRESS.md` updated with graduation row (sprint-07)

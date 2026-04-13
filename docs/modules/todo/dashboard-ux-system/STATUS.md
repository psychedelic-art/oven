# Dashboard UX System -- STATUS

| Field | Value |
|---|---|
| Program type | cross-cutting UX program (not a module) |
| Current sprint | `sprint-07-acceptance.md` |
| Sprint state | **done** |
| Package | `packages/dashboard-ui/` (`@oven/dashboard-ui`) -- LIVE |
| Active branch | `claude/dashboard-ux-system-nESUZ` |
| Backup branch | `bk/claude-stoic-hamilton-tOJfY-20260413` |
| Open PR | none |
| Test framework | `vitest` 3.2.4 |
| QA verdict | **pass** -- 173/173 tests green (81 agent-ui + 92 dashboard-ui) |
| Blockers | none |

## Last updates

- 2026-04-13 -- Sprint-07 acceptance on `claude/dashboard-ux-system-nESUZ`:
  - All grep gates pass (see acceptance report below).
  - 27 test files, 173/173 green across @oven/agent-ui (81) + @oven/dashboard-ui (92).
  - STATUS.md acceptance checklist fully checked.
  - PROGRESS.md updated with graduation.
- 2026-04-13 -- Sprint-06 dashboard consistency pass:
  - 5 chrome primitives shipped: PageHeader, EmptyState, LoadingSkeleton,
    ErrorBoundary, MenuSectionLabel (20 new tests).
  - CustomMenu.tsx migrated: 258 -> 127 lines, zero hand-rolled Typography overline.
  - KBPlayground.tsx rewritten: 782 -> 39 lines via DashboardPlaygroundShell.
    Legacy preserved as KBPlayground.legacy.tsx.
- 2026-04-13 -- Sprint-05c dashboard shell:
  - DashboardPlaygroundShell shipped in @oven/dashboard-ui (9 tests).
  - AIPlaygroundPage.tsx rewritten: 44 -> 33 lines via shell.
- 2026-04-13 -- Sprint-05b theme + history + layout:
  - Theme toggle (10 presets), connection status, layout modes,
    multi-run execution history added to UnifiedAIPlayground.
  - ChatHeader enhanced with themeSlot, connectionSlot, layoutSlot.
  - ExecutionInspector enhanced with executionHistory + NodeTrace extraction.
- 2026-04-13 -- Sprint-05a session management + loading:
  - useSessionManager hook: CRUD against /api/chat-sessions (10 tests).
  - SessionSidebar wired into UnifiedAIPlayground (new/delete/pin/switch).
  - Stop button, TypingIndicator, ChatErrorCard wired.
- 2026-04-13 -- Sprint-04 filter system:
  - FilterToolbar + 4 filter primitives shipped (34 tests).
  - 3 reference lists migrated.
- Prior sprints (01-03) on dev via earlier cycles.

## Discovery outputs (sprint-00)

- **Tenant context primitive** -- IMPLEMENTED (sprint-01). LIVE on dev since cycle-29.
- **Filter UX** -- IMPLEMENTED (sprint-04). FilterToolbar + 4 primitives. 3 lists migrated.
- **Playgrounds** -- IMPLEMENTED (sprint-05a/b/c). UnifiedAIPlayground with session
  sidebar, theme toggle, connection status, layout modes, execution history.
  DashboardPlaygroundShell wraps it for dashboard pages.
- **Dashboard chrome** -- IMPLEMENTED (sprint-06). PageHeader, EmptyState,
  LoadingSkeleton, ErrorBoundary, MenuSectionLabel all shipped. CustomMenu migrated.
- **Package landscape** -- `@oven/dashboard-ui` is live with 3 subsystems
  (tenant, filters, chrome, playground).

## Acceptance checklist (program-level)

- [x] `packages/dashboard-ui/` exists, compiles, tests green
- [x] `TenantContextProvider` + `useTenantContext` + `TenantSelector` exported
- [x] `AdminApp` wraps all routes in `<TenantContextProvider>` (sprint-03, cycle-32)
- [x] Global tenant selector appears in the React Admin AppBar (sprint-03, cycle-32)
- [x] Every tenant-scoped `*List` reads `useTenantContext().activeTenantId` (sprint-03, cycle-32)
- [x] `<FilterToolbar>` + `<ComboBoxFilter>` + `<DateRangeFilter>` + `<StatusFilter>` shipped (sprint-04)
- [x] At least 3 reference modules migrated to the new filter toolbar (sprint-04)
- [x] `UnifiedAIPlayground` wraps AI Playground, KB Playground surfaces (sprint-05c)
- [x] `DashboardPlaygroundShell` ships the MUI wrapper for all dashboard playground pages (sprint-05c)
- [x] Session management: create/delete/pin/switch via useSessionManager + SessionSidebar (sprint-05a)
- [x] Theme toggle: 10 presets + applyTheme on playground container (sprint-05b)
- [x] Connection status: green/red online/offline dot (sprint-05b)
- [x] Layout modes: inline/fullscreen toggle (sprint-05b)
- [x] Multi-run execution history in ExecutionInspector (sprint-05b)
- [x] Stop button: abort streaming + workflow execution (sprint-05a)
- [x] `PageHeader`, `EmptyState`, `LoadingSkeleton`, `ErrorBoundary` exported (sprint-06)
- [x] Menu sections in `CustomMenu.tsx` use `MenuSectionLabel` (sprint-06)
- [x] KBPlayground rewritten with shell; legacy preserved (sprint-06)
- [x] No `style={}` introduced (root `CLAUDE.md` rule; 2 dynamic CSS custom property exceptions per allowed exception)
- [ ] Tenant switching golden path manually verified (cannot verify in CLI)
- [x] `docs/modules/todo/PROGRESS.md` updated with graduation row (sprint-07)

## Grep gate results (sprint-07)

| Gate | Result |
|---|---|
| `style={}` in dashboard-ui/src | 1 hit in comment only (PageHeader.tsx L18). Clean. |
| `style={}` in agent-ui/src/playground | 2 hits: dynamic CSS custom properties for theme dots (allowed per CLAUDE.md exception). |
| `@mui` imports in agent-ui/src | 0 real imports (test file + comment only). Clean. |
| `Typography overline` in CustomMenu | 0. All migrated to MenuSectionLabel. |
| `NumberInput tenantId` in List/Create | 0 in List/Create. 5 in Edit forms (intentional for admin reassignment). |
| `const filters = [` in migrated lists | 0. All 3 use FilterToolbar. |
| Test suites | 27 files, 173/173 green. |

## Deferred items (not blocking graduation)

1. ~~**PlaygroundConfigPage**~~ -- DONE. Admin settings page at /ai/playground-config.
2. ~~**Remaining filter toolbar migrations**~~ -- DONE. All 49 lists migrated. Zero inline filters remaining.
3. **AgentPlaygroundPanel rewrite** -- embedded inline panel, different UX pattern. In progress.
4. **`@ai-sdk/react` migration** -- noted as future improvement; requires backend streaming format alignment.
5. **KBPlayground legacy features** -- semantic search confidence scores, embedding badges, re-embed triggers. Can be ported from KBPlayground.legacy.tsx into unified playground panels.

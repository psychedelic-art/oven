# Dashboard UX System -- STATUS

| Field | Value |
|---|---|
| Program type | cross-cutting UX program (not a module) |
| Current sprint | `sprint-07-acceptance.md` + post-graduation (AI SDK migration, backend streaming) |
| Sprint state | **GRADUATED** + all deferred items CLOSED |
| Package | `packages/dashboard-ui/` (`@oven/dashboard-ui`) -- LIVE |
| Active branch | `claude/dashboard-ux-system-nESUZ` |
| Backup branch | `bk/claude-stoic-hamilton-tOJfY-20260413` |
| Open PR | none (ready to merge as cycle-33) |
| Test framework | `vitest` 3.2.4 |
| QA verdict | **pass** -- 263/263 tests green (90 module-chat + 81 agent-ui + 92 dashboard-ui) |
| Blockers | none |

## Last updates

- 2026-04-13 -- @ai-sdk/react migration + module-chat Sprint 4A.4 on `claude/dashboard-ux-system-nESUZ`:
  - Sprint B (frontend): `useChatAI` + `OvenChatTransport` + `useChatLegacy` +
    feature-flagged `useChat`. Default path now uses `@ai-sdk/react`.
  - Sprint A (backend): `bridgeAIStreamToEvents()` + `processMessageStreaming()`
    generator + SSE POST handler in `/api/chat-sessions/{id}/messages`.
    Closes the Sprint 4A.4 TODO that was blocking 4 other queue items.
  - Sprint C (tool UI): MessageBubble + ToolCallCard already rendered
    tool-call/tool-result parts; legacy SSE parser updated with
    `onToolCallStart`/`onToolCallEnd` handlers.
  - 263/263 tests green (module-chat 90 + agent-ui 81 + dashboard-ui 92).
- 2026-04-13 -- Post-graduation work on same branch:
  - **PlaygroundConfigPage** admin settings page at `/ai/playground-config`
    (11 toggle switches + theme dropdown, MUI sx-only).
  - **All 49 remaining filter lists** migrated to FilterToolbar. Zero
    inline `const filters = [` remaining in any *List.tsx.
  - **AgentPlaygroundPanel** rewritten: 146 -> 72 lines via UnifiedAIPlayground.
    Legacy preserved as AgentPlaygroundPanel.legacy.tsx.
- 2026-04-13 -- Sprint-07 acceptance + graduation.
- 2026-04-13 -- Sprint-06 dashboard consistency pass:
  - 5 chrome primitives shipped: PageHeader, EmptyState, LoadingSkeleton,
    ErrorBoundary, MenuSectionLabel (20 new tests).
  - CustomMenu.tsx migrated: 258 -> 127 lines.
  - KBPlayground.tsx rewritten: 782 -> 39 lines. Legacy preserved.
- 2026-04-13 -- Sprint-05c dashboard shell: DashboardPlaygroundShell + AIPlaygroundPage rewrite (9 tests).
- 2026-04-13 -- Sprint-05b: theme toggle (10 presets), connection status,
  layout modes, multi-run execution history.
- 2026-04-13 -- Sprint-05a: useSessionManager + SessionSidebar + stop button +
  loading indicators (10 tests).
- 2026-04-13 -- Sprint-04: FilterToolbar + 4 filter primitives + 3 reference lists (34 tests).
- Prior sprints (01-03) on dev via earlier cycles.

## Discovery outputs (sprint-00)

- **Tenant context primitive** -- IMPLEMENTED (sprint-01). LIVE on dev since cycle-29.
- **Filter UX** -- IMPLEMENTED (sprint-04). All 52 lists migrated (3 reference + 49 post-graduation).
- **Playgrounds** -- IMPLEMENTED (sprint-05a/b/c). UnifiedAIPlayground with
  session management, theme toggle, connection status, layout modes,
  execution history, stop button, tool call UI.
- **Dashboard chrome** -- IMPLEMENTED (sprint-06). PageHeader, EmptyState,
  LoadingSkeleton, ErrorBoundary, MenuSectionLabel all shipped. CustomMenu migrated.
- **Admin config** -- IMPLEMENTED (post-graduation). PlaygroundConfigPage at /ai/playground-config.
- **AI SDK migration** -- IMPLEMENTED (post-graduation). @ai-sdk/react with
  custom OvenChatTransport. Backend streaming wired via Sprint 4A.4.
- **Package landscape** -- `@oven/dashboard-ui` with 4 subsystems
  (tenant, filters, chrome, playground). `@oven/agent-ui` enhanced with
  useChatAI + OvenChatTransport + useChatLegacy fallback.

## Acceptance checklist (program-level)

- [x] `packages/dashboard-ui/` exists, compiles, tests green
- [x] `TenantContextProvider` + `useTenantContext` + `TenantSelector` exported
- [x] `AdminApp` wraps all routes in `<TenantContextProvider>` (sprint-03, cycle-32)
- [x] Global tenant selector appears in the React Admin AppBar (sprint-03, cycle-32)
- [x] Every tenant-scoped `*List` reads `useTenantContext().activeTenantId` (sprint-03, cycle-32)
- [x] `<FilterToolbar>` + `<ComboBoxFilter>` + `<DateRangeFilter>` + `<StatusFilter>` shipped (sprint-04)
- [x] All 52 lists migrated to the filter toolbar (sprint-04 + post-graduation)
- [x] `UnifiedAIPlayground` wraps AI Playground, KB Playground, Agent Playground surfaces (sprint-05c + post-grad)
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
- [x] AgentPlaygroundPanel rewritten with embedded UnifiedAIPlayground; legacy preserved (post-grad)
- [x] PlaygroundConfigPage admin settings page at `/ai/playground-config` (post-grad)
- [x] @ai-sdk/react migration: useChatAI + OvenChatTransport + legacy fallback (post-grad)
- [x] Backend streaming: processMessageStreaming + bridgeAIStreamToEvents (module-chat Sprint 4A.4)
- [x] No `style={}` introduced (root `CLAUDE.md` rule; 2 dynamic CSS custom property exceptions per allowed exception)
- [ ] Tenant switching golden path manually verified (cannot verify in CLI)
- [x] `docs/modules/todo/PROGRESS.md` updated with graduation row (sprint-07)

## Grep gate results (post-graduation)

| Gate | Result |
|---|---|
| `style={}` in dashboard-ui/src | 1 hit in comment only (PageHeader.tsx L18). Clean. |
| `style={}` in agent-ui/src/playground | 2 hits: dynamic CSS custom properties for theme dots (allowed exception). |
| `@mui` imports in agent-ui/src | 0 real imports (test file + comment only). Clean. |
| `Typography overline` in CustomMenu | 0. All migrated to MenuSectionLabel. |
| `NumberInput tenantId` in List/Create | 0 in List/Create. 5 in Edit forms (intentional for admin reassignment). |
| `const filters = [` in any *List.tsx | **0. All 52 lists migrated.** |
| Test suites | 38 files, 263/263 green (module-chat 90 + agent-ui 81 + dashboard-ui 92). |

## Deferred items (formerly deferred, all now closed)

1. ~~**PlaygroundConfigPage**~~ -- CLOSED. Admin settings page live at /ai/playground-config.
2. ~~**Remaining filter toolbar migrations**~~ -- CLOSED. All 49 post-graduation lists migrated. Zero inline filters remaining.
3. ~~**AgentPlaygroundPanel rewrite**~~ -- CLOSED. Rewritten with embedded UnifiedAIPlayground; legacy preserved.
4. ~~**`@ai-sdk/react` migration**~~ -- CLOSED. useChatAI + OvenChatTransport shipped. useChatLegacy preserved as fallback.
5. ~~**Backend streaming (module-chat Sprint 4A.4)**~~ -- CLOSED. processMessageStreaming + SSE response wired.
6. **KBPlayground legacy features** -- confidence scores, embedding badges, re-embed triggers preserved in KBPlayground.legacy.tsx for future port if needed.

## Newly unblocked (side effect of this branch)

Closing the module-chat Sprint 4A.4 TODO unblocks 4 queue items that were waiting on the streaming pipeline:

- `agent-ui` sprint-02 -- backend streaming now live
- `oven-bug-sprint` sprint-02 -- module-chat integration ready
- `oven-bug-sprint` sprint-04 -- agent-core + module-chat end-to-end
- `notifications` sprint-05-acceptance -- KB + agent-core testable via streaming

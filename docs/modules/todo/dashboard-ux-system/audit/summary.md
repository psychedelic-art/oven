# Dashboard UX Audit -- Summary

> Generated: 2026-04-13 (cycle-30 session)
> Scope: all `*List`, `*Create`, `*Edit`, `*Show`, `*Playground*`,
> and chrome files under `apps/dashboard/src/`

## Aggregate counts

| Category | Count | Notes |
|----------|-------|-------|
| List components | 62 | 18 tenant-scoped, 44 system-level |
| Create components | 45 | 16 tenant-aware, 29 system-level |
| Edit components | 41 | 8 with editable tenantId, 3 with custom editor links |
| Show components | 34 | 16 with related data, 18 without |
| Playground surfaces | 4 | 1 uses UnifiedAIPlayground, 3 are independent |
| Menu sections | 18 | All hand-rolled, none use MenuSectionLabel |
| `style={}` violations | 2 files | tiles/TileEdit.tsx, tilesets/TilesetEdit.tsx |
| `useTenantContext` usage | 0 files | DRIFT-1 fully confirmed |

## Rule compliance summary

| Rule | Compliant | Drifting | Sprint |
|------|-----------|---------|--------|
| 6.1 CRUD convention | 62/62 lists | 0 | -- |
| 6.2 Menu section labels | 0/18 | 18/18 (hand-rolled) | sprint-06 |
| 6.3 Tenant filtering | 0/18 | 18/18 (no useTenantContext) | sprint-03 |
| 6.4 Create auto-assign | 0/16 | 16/16 (no transform) | sprint-03 |
| 6.5 Custom editor links | 3/3 | 0 | -- |
| 6.6 Show related data | 16/34 | 18/34 (no related data) | out of scope |
| CLAUDE.md no-inline-styles | 180/182 | 2 files (tiles, tilesets) | sprint-05 |
| CLAUDE.md zustand pattern | 1/4 playgrounds | 3 use raw useState | sprint-05 |

## Priority-ordered backlog

### Sprint-03 — Tenant context migration (34 files)

**Highest impact.** Wire `TenantContextProvider` into `AdminApp.tsx`,
then migrate all 18 tenant-scoped lists and 16 tenant-aware create
forms to use `useTenantContext`.

Top-10 offending files:
1. `forms/FormList.tsx` -- raw NumberInput for tenantId
2. `forms/FormCreate.tsx` -- NumberInput, no transform
3. `knowledge-base/KnowledgeBaseList.tsx` -- ReferenceInput, no context
4. `knowledge-base/EntryList.tsx` -- 5 filters, ReferenceInput
5. `knowledge-base/EntryCreate.tsx` -- ReferenceInput, no transform
6. `flows/FlowList.tsx` -- NumberInput for tenantId
7. `flows/FlowCreate.tsx` -- NumberInput, no transform
8. `ui-flows/UiFlowList.tsx` -- NumberInput for tenantId
9. `ui-flows/UiFlowCreate.tsx` -- NumberInput, no transform
10. `notifications/ConversationList.tsx` -- NumberInput for tenantId

### Sprint-04 — Filter toolbar standardization (62 files)

Migrate 3 reference lists (AIAliasList, ChatSessionList, KBEntryList)
to the new `FilterToolbar` component. Prove the pattern, then roll out
to remaining lists in sprint-06.

Top-3 reference candidates:
1. `ai/AliasList.tsx` -- 3 filters, clean shape
2. `chat/ChatSessionList.tsx` -- 4 filters, status + search + channel
3. `knowledge-base/EntryList.tsx` -- 5 filters, most complex

### Sprint-05 — Playground unification (2,796 lines to consolidate)

Wrap AI/KB/Agent surfaces in `UnifiedAIPlayground` shell. Remove
duplicated layout/state code. Fix 2 `style={}` violations in
tiles/tilesets while at it.

Top-3 offending files:
1. `ai/AIPlayground.tsx` -- 1,870 lines, 6-tab layout, custom hooks
2. `knowledge-base/KBPlayground.tsx` -- 781 lines, 3-panel layout
3. `agents/AgentPlaygroundPanel.tsx` -- 145 lines, collapsible card

### Sprint-06 — Dashboard consistency pass (~20 files)

Ship chrome primitives (`PageHeader`, `EmptyState`, `LoadingSkeleton`,
`ErrorBoundary`, `MenuSectionLabel`) and migrate 18 menu sections.
Roll out `FilterToolbar` to remaining lists.

Top-5 targets:
1. `CustomMenu.tsx` -- 18 sections need MenuSectionLabel
2. `api-permissions/ApiPermissionList.tsx` -- most sx-heavy custom UI
3. `workflow-agents/*List.tsx` -- 4 files with FunctionField sx
4. `workflows/ExecutionList.tsx` -- FunctionField sx patterns
5. `chat/ChatSessionList.tsx` -- textTransform in sx

## style= violations detail

Only 2 files use raw `style={}` (not `sx=`):

| File | Occurrences | Sprint |
|------|------------|--------|
| `tiles/TileList.tsx` | 3 (`style={{ fontSize, color }}`) | sprint-05 |
| `tilesets/TilesetList.tsx` | 1 (`style={{ color, fontSize }}`) | sprint-05 |
| `tiles/TileShow.tsx` | 1 (`style={{ ... }}`) | sprint-05 |
| `tiles/TileEdit.tsx` | 1 (`style={{ ... }}`) | sprint-05 |
| `tilesets/TilesetEdit.tsx` | 6 (`style={{ width, padding }}`) | sprint-05 |
| `tilesets/TilesetShow.tsx` | 1 (`style={{ ... }}`) | sprint-05 |
| `flows/FlowShow.tsx` | 1 (`style={{ whiteSpace, wordBreak }}`) | sprint-05 |
| `flow-items/FlowItemShow.tsx` | 2 (`style={{ whiteSpace, wordBreak }}`) | sprint-05 |

Total: 16 `style={}` occurrences across 8 files. All routed to sprint-05.

Note: many files use `sx=` inside `FunctionField` render functions —
this is legitimate MUI sx usage, not a violation.

# Dashboard UX System — STATUS

| Field | Value |
|---|---|
| Program type | cross-cutting UX program (not a module) |
| Current sprint | `sprint-01-foundation.md` |
| Sprint state | **ready** — docs-only bootstrap complete; no code yet |
| Package (planned) | `packages/dashboard-ui/` (MUI `sx`-only, dashboard-scoped) |
| Active branch | `claude/dashboard-ux-system-nESUZ` |
| Backup branch | none — no prior feature work to back up |
| Open PR | none (do not create without explicit user approval) |
| Test framework | `vitest` 3.2.4 (matches `packages/module-ai/` + `packages/agent-ui/` convention) |
| QA verdict | n/a — docs only |
| Blockers | none |

## Last updates

- 2026-04-11 — Program folder bootstrapped on `claude/dashboard-ux-system-nESUZ`.
  Canonical doc set skipped (program, not module). Sprint roadmap authored
  (00–07). Research shortlist recorded in `CODE-REVIEW.md` under `## Research`.
  No code shipped.

## Discovery outputs (sprint-00)

- **Tenant context primitive** — not implemented. Docs reference
  `useTenantContext` / `activeTenantId` (`docs/modules/config/UI.md` L33)
  but no hook, no store, no component exist in `apps/dashboard/` or any
  package. Every tenant-scoped list either filters ad-hoc or shows all rows.
- **Filter UX** — fragmented. Every `*List.tsx` declares its own inline
  `filters` array. Tenant input shape varies (`<AutocompleteInput>` in
  `KnowledgeBaseList`, raw `<NumberInput>` in `FormList`, missing in
  `AgentList`, `ChatSessionList`).
- **Playgrounds** — four divergent implementations:
  - `apps/dashboard/src/components/ai/AIPlayground.tsx` (1,809 lines, MUI, tabs)
  - `apps/dashboard/src/components/knowledge-base/KBPlayground.tsx` (781 lines, MUI, custom 3-panel)
  - `apps/dashboard/src/components/agents/AgentPlaygroundPanel.tsx` (145 lines, inline chat card)
  - `packages/agent-ui/src/playground/UnifiedAIPlayground.tsx` — **canonical**, Tailwind, router-free, already called from `workflow-agents/AIPlaygroundPage.tsx` (43 lines)
- **Dashboard chrome** — `apps/dashboard/src/components/shared/` contains only
  `rich-text-editor/`. No header, no theme overrides, no empty state, no error
  boundary. React Admin defaults are in effect.
- **Package landscape** — `@oven/agent-ui` (Tailwind, portable) owns the
  canonical playground. `@oven/oven-ui` (Tailwind) owns `cn()` + base widgets.
  **There is no `@oven/dashboard-ui`** — this program creates it.

## Acceptance checklist (program-level)

Mirrors the gate listed in `docs/modules/todo/dashboard-ux-system/sprint-07-acceptance.md` — updated each sprint.

- [ ] `packages/dashboard-ui/` exists, compiles, tests green
- [ ] `TenantContextProvider` + `useTenantContext` + `TenantSelector` exported
- [ ] `AdminApp` wraps all routes in `<TenantContextProvider>`
- [ ] Global tenant selector appears in the React Admin AppBar for users with `tenants.list`
- [ ] Every tenant-scoped `*List` reads `useTenantContext().activeTenantId`
- [ ] `<FilterToolbar>` + `<ComboBoxFilter>` + `<DateRangeFilter>` + `<StatusFilter>` shipped
- [ ] At least 3 reference modules migrated to the new filter toolbar
- [ ] `UnifiedAIPlayground` wraps AI Playground, KB Playground, Agent Playground surfaces
- [ ] Dead `AIPlayground.tsx` code paths removed (lines cut tracked in `CODE-REVIEW.md`)
- [ ] `PageHeader`, `EmptyState`, `LoadingSkeleton`, `ErrorBoundary` exported and applied
- [ ] Menu sections in `CustomMenu.tsx` use the shared section label primitive
- [ ] No `style={}` introduced anywhere (root `CLAUDE.md` rule)
- [ ] Tenant switching golden path manually verified by a platform admin
- [ ] `docs/modules/todo/PROGRESS.md` updated with graduation row

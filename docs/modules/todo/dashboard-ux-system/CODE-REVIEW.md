# Dashboard UX System — Code Review & Rule Compliance

> Review date: 2026-04-11
> Reviewer: `claude/dashboard-ux-system-nESUZ` session (senior engineering pass)
> Subject: the `apps/dashboard/` UX surface and the proposed
> `packages/dashboard-ui/` shared library. No code exists yet — this file is
> the home for the rule-compliance audit, the discovery findings, and the
> external research shortlist that shapes sprints 01–07.

---

## Scope

There is no `packages/dashboard-ui/` yet. The review covers:

1. The current state of `apps/dashboard/src/components/*` (existing
   `*List`, `*Edit`, `*Show`, `*Playground`, `CustomMenu`, `AdminApp`).
2. The canonical playground in `packages/agent-ui/src/playground/UnifiedAIPlayground.tsx`.
3. Rule compliance against `docs/module-rules.md` Rule 6 (UX Friendly) and
   the root `CLAUDE.md` styling rules.
4. External research on multi-tenant dashboards, filter UX, playground UX,
   and zustand-with-React-context patterns, used as the starting point for
   the foundation sprint.

---

## Rule Compliance Matrix

| Ground truth | Dashboard status | Action |
|---|---|---|
| `docs/module-rules.md` Rule 6.1 (CRUD convention) | **PASS** — every module ships `list`/`create`/`edit`/`show` on its `ResourceConfig`. | No change. |
| Rule 6.2 (menu sections with labels + Divider) | **PARTIAL** — `apps/dashboard/src/components/CustomMenu.tsx` hand-rolls every `<Typography variant="overline">` label. There is no shared `<MenuSectionLabel>` primitive. | Sprint-06: ship `<MenuSectionLabel>` in `@oven/dashboard-ui` and migrate `CustomMenu.tsx`. |
| **Rule 6.3 (list views support tenant filtering)** | **FAIL — drift found** — `useTenantContext` does not exist, so every module either re-reads the tenant filter from its own state or ignores it entirely. See DRIFT-1. | **Sprint-01 ships the primitive; sprint-03 migrates all lists.** |
| **Rule 6.4 (create forms auto-assign tenant)** | **FAIL — drift found** — create forms without tenant context cannot auto-assign `tenantId`. Same primitive gap as 6.3. | **Sprint-03 migrates all create forms.** |
| Rule 6.5 (custom editors linked from edit pages) | **PASS** — `agent-workflows/[id]/editor`, `ui-flows/[id]/editor`, `agents/[id]/playground` all follow the toolbar-button-to-editor pattern. | No change. |
| Rule 6.6 (show pages include related data) | **PARTIAL** — inconsistent. `TenantShow.tsx` shows related data; several others don't. Out of scope for this program; flag as a general todo. | Not routed here. |
| Rule 6.7 (JSONB fields use appropriate editors) | **PARTIAL** — mostly OK. Out of scope. | Not routed here. |
| `docs/module-rules.md` Rule 3.1 (no cross-module imports) | **PASS** for this program — `packages/dashboard-ui/` will never import a module package. It consumes data via the React Admin `dataProvider` and `useQuery`. | Enforce by lint / import graph in sprint-01. |
| Root `CLAUDE.md` `no-inline-styles` | **RISK** — the existing `ai/AIPlayground.tsx` has ~1,809 lines and `KBPlayground.tsx` has ~781 lines of MUI. They are candidates for style-prop creep during refactor. | Sprint-05 adds a grep gate before shipping. |
| Root `CLAUDE.md` `mui-sx-prop` | **PASS** for now; must be enforced as the new `packages/dashboard-ui/` lands. | Enforce from sprint-01 onwards. |
| Root `CLAUDE.md` `tailwind-cn-utility` | **N/A** here — this program is MUI-only. The existing Tailwind surface (`UnifiedAIPlayground`) is reused as-is, never edited from the dashboard side. | Keep the style boundary at the Box container. |
| Root `CLAUDE.md` `zustand-store-pattern` | **APPLIES** — the tenant provider must follow the factory + React-context pattern. Do NOT use a singleton zustand store. | Enforced in sprint-01 contract test. |
| Root `CLAUDE.md` `type-imports` | **APPLIES** to every new file. | Enforced via `import type` grep in sprint-01 acceptance. |

---

## Drift findings

### DRIFT-1 — Rule 6.3 tenant context primitive missing

- **Location**: referenced in `docs/modules/config/UI.md` L33 as
  `useTenantContext()` / `activeTenantId`; referenced in
  `docs/module-rules.md` Rule 6.3 and Rule 6.4 example code. The
  hook, the store, and the context do not exist anywhere in
  `apps/dashboard/` or `packages/`.
- **Symptom**: `apps/dashboard/src/components/knowledge-base/KnowledgeBaseList.tsx`
  L10–14 hand-rolls `<ReferenceInput source="tenantId" reference="tenants">`.
  `apps/dashboard/src/components/forms/FormList.tsx` L20 uses a raw
  `<NumberInput key="tenantId" source="tenantId" label="Tenant ID" />`.
  `TenantList`, `AgentList`, `ChatSessionList`, `FlowList`, `WorkflowList`
  show all rows regardless of tenant. `*Create.tsx` files do not
  auto-assign `tenantId`, forcing users to pick the tenant on every form.
- **Resolved design** (see
  [`sprint-01-foundation.md`](./sprint-01-foundation.md) and
  [`sprint-03-tenant-context.md`](./sprint-03-tenant-context.md)):
  1. `packages/dashboard-ui/src/tenant/` ships
     `createTenantStore(dataProvider)`, `TenantContextProvider`,
     `useTenantContext`, and `TenantSelector`.
  2. `AdminApp.tsx` wraps the React Admin root in
     `<TenantContextProvider>`.
  3. `TenantSelector` renders in the React Admin `AppBar` slot via a
     custom layout and is only shown when the user has `tenants.list`
     permission.
  4. Every tenant-scoped `*List.tsx` is migrated to read
     `useTenantContext().activeTenantId` and pass it as
     `filter={{ tenantId }}`.
  5. Every `*Create.tsx` is migrated to auto-assign `tenantId` via
     `transform`.
- **Action**:
  - Sprint-01 ships the primitive + contract tests.
  - Sprint-02 produces an audit matrix of every `*List` / `*Create`.
  - Sprint-03 executes the migrations and lands the Rule 6.3 enforcement
    test (fail-build if any tenant-scoped list lacks the
    `useTenantContext` call).

### DRIFT-2 — Filter toolbar is re-implemented per module

- **Location**: every `*List.tsx` under `apps/dashboard/src/components/`
  declares its own `filters` array inline. Examples:
  - `ai/AliasList.tsx` L20–25 (type + enabled)
  - `ai/PlaygroundExecutionList.tsx` L9–32 (model + type + status)
  - `chat/ChatSessionList.tsx` L17–37 (search + status + channel + pinned)
  - `forms/FormList.tsx` L14–23 (search + status + tenantId as raw number)
- **Symptom**: tenant filter input shape varies per module
  (`AutocompleteInput` vs raw `NumberInput` vs missing entirely); search
  field keys drift (`q` vs module-specific); status choice rendering
  varies (`SelectInput` vs `BooleanInput`); no standardized date / range
  filter even though every entity has `createdAt` / `updatedAt`.
- **Action**:
  - Sprint-04 ships `<FilterToolbar>`, `<ComboBoxFilter>`,
    `<DateRangeFilter>`, `<StatusFilter>`, and `<QuickSearchFilter>` in
    `@oven/dashboard-ui`, all combo-box-first per the
    `ui.bazza.dev/docs/data-table-filter` pattern.
  - Sprint-04 migrates 3 reference modules end-to-end (AI aliases, Chat
    sessions, KB entries) as proof, with the other modules following in
    sprint-06 as part of the consistency pass.

### DRIFT-3 — Four divergent playgrounds

- **Location**:
  - `apps/dashboard/src/components/ai/AIPlayground.tsx` — 1,809 lines,
    MUI, tab layout, local `useSessionState` hook.
  - `apps/dashboard/src/components/knowledge-base/KBPlayground.tsx` —
    781 lines, MUI, custom 3-panel with hand-rolled tenant/KB
    autocomplete.
  - `apps/dashboard/src/components/agents/AgentPlaygroundPanel.tsx` —
    145 lines, collapsible inline chat card embedded in `AgentEdit`.
  - `packages/agent-ui/src/playground/UnifiedAIPlayground.tsx` —
    **canonical**, Tailwind, router-free, already used by
    `workflow-agents/AIPlaygroundPage.tsx`.
- **Symptom**: users see four different mental models of "try a thing
  against this model/agent/KB". Maintenance burden is ~2,500 lines of
  duplicated layout / state code.
- **Resolved design**: `UnifiedAIPlayground` becomes the shell for every
  dashboard playground. AI / KB / agent surfaces become thin MUI wrappers
  that mount the Tailwind shell via the existing Box-container pattern
  from `workflow-agents/AIPlaygroundPage.tsx`.
- **Action**:
  - Sprint-05 wraps AI / KB / Agent playgrounds in
    `UnifiedAIPlayground`. Dead code paths in `AIPlayground.tsx`
    (tab infrastructure, local session state, custom chat UI) are
    removed.

### DRIFT-4 — No shared dashboard chrome

- **Location**: `apps/dashboard/src/components/shared/` contains only
  `rich-text-editor/`. There is no `PageHeader`, no `EmptyState`, no
  `LoadingSkeleton`, no `ErrorBoundary`, no `MenuSectionLabel`.
- **Action**:
  - Sprint-06 ships these as part of the consistency pass.

---

## Existing GitHub issues / PRs

A `mcp__github__search_issues` search in `psychedelic-art/oven` for
`dashboard-ux`, `tenant selector`, `filter toolbar`, `unified playground`
returned **no open issues or pull requests** touching this program as of
2026-04-11. The program is genuinely greenfield.

---

## Research

External research shortlist feeding the sprint plan. Each item is rated
for fit with MUI 7 + React Admin 5, and tagged with the sprint that
consumes it.

| # | Title | URL | Why it matters | Sprint |
|---|---|---|---|---|
| R1 | Notion — Create, join & leave workspaces | https://www.notion.com/help/create-delete-and-switch-workspaces | Workspace switcher affordance at the top-left of the sidebar; the "click workspace name to switch" pattern is the exact interaction we want for the tenant selector. | sprint-01, sprint-03 |
| R2 | Clerk — `<OrganizationSwitcher />` | https://clerk.com/docs/guides/organizations/overview | Production reference for the organization / tenant switcher component, including list, search, and "create new" slot. | sprint-01, sprint-03 |
| R3 | Vercel — Multi-tenant SaaS | https://vercel.com/solutions/multi-tenant-saas | Confirms the team-switcher pattern is the de-facto SaaS default and explains the middleware-driven URL scoping alternative (which we deliberately reject — we stay session-scoped). | sprint-03 |
| R4 | Stripe — Design patterns for Stripe Apps | https://docs.stripe.com/stripe-apps/patterns | Reference for "pattern as a unit of reuse" and for filter toolbar consistency across a multi-surface dashboard. | sprint-04, sprint-06 |
| R5 | PatternFly — Filters design guidelines | https://www.patternfly.org/patterns/filters/design-guidelines/ | Explicit taxonomy of filter types (single-value, multi-value, typeahead, range) and when to use each. Directly maps to our `<ComboBoxFilter>` / `<DateRangeFilter>` / `<StatusFilter>` split. | sprint-04 |
| R6 | bazza/ui — Data table filter | https://ui.bazza.dev/docs/data-table-filter | Faceted filter popover + URL-sync pattern + active-filter chips. The reference implementation for sprint-04's toolbar. | sprint-04 |
| R7 | MUI X — Data Grid Filtering | https://mui.com/x/react-data-grid/filtering/ | Native MUI primitive for quick-filter + filter panel. We do not migrate to Data Grid — we borrow the `sx`-only customization recipes. | sprint-04, sprint-06 |
| R8 | Smart Interface Design — Complex filtering UX | https://smart-interface-design-patterns.com/articles/complex-filtering/ | Active-filter chips, OR-within-group / AND-across-group logic, mobile collapse. Informs the `<FilterToolbar>` props shape. | sprint-04 |
| R9 | OpenAI — Prompt management in Playground | https://help.openai.com/en/articles/9824968-prompt-management-in-playground | The canonical split-panel playground layout: system prompt on the left, chat stream in the centre, settings (model / temperature / tools) on the right. Matches the 3-panel shell we're graduating. | sprint-05 |
| R10 | LangSmith Playground v2 | https://x.com/LangChainAI/status/1826301889799225384 | "Unified layout deeply embedded in LangSmith" — explicit validation of the "one playground shell used for prompt, trace, and eval" strategy. Maps to sprint-05 reusing `UnifiedAIPlayground` across AI / KB / Agent / Workflow surfaces. | sprint-05 |
| R11 | TkDodo — Zustand and React Context | https://tkdodo.eu/blog/zustand-and-react-context | Canonical explanation of the factory + React context pattern for per-instance stores. This is the exact pattern the root `CLAUDE.md` `zustand-store-pattern` rule requires. | sprint-01 |
| R12 | Dashboard Design Patterns for Modern Web Apps 2026 | https://artofstyleframe.com/blog/dashboard-design-patterns-web-apps/ | Contemporary taxonomy of dashboard chrome (page header, filter bar, content area, side rail). Informs sprint-06. | sprint-06 |

## Recommendation

**Proceed into sprint-01 on `claude/dashboard-ux-system-nESUZ`.** The
audit is sound; the research shortlist is production-grade; the four
drifts are scoped to later sprints without overlap. There is no
pre-existing code to worry about colliding with, and `UnifiedAIPlayground`
is already the canonical playground — this program extends it rather
than reinventing it.

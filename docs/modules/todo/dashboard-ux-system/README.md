# Dashboard UX System & Tenant-Aware Experience — TODO

> **Program type**: cross-cutting UX program (not a registered module)
> **Top-level spec**: `docs/modules/todo/dashboard-ux-system/` (this folder — no
> `docs/modules/NN-dashboard-ux-system.md` is created; this is a program and does
> not live in the registered-module namespace)
> **Primary surface**: `apps/dashboard/`
> **Current sprint**: [`sprint-01-foundation.md`](./sprint-01-foundation.md)
> **Status**: see [`STATUS.md`](./STATUS.md)

---

## Why this is in the queue

The OVEN dashboard has grown one module at a time. Each module ships its own
list filters, its own tenant plumbing (or lack of it), and its own playground
surface. The result — confirmed by the sprint-00 discovery survey — is:

1. **No tenant context primitive.** There is no `TenantSelector` component, no
   `useTenantContext` hook, no `activeTenantId` store. `module-rules.md` Rule
   6.3 and Rule 6.4 describe how list views and create forms should read the
   active tenant, but the primitive they depend on does not exist. Every module
   hand-rolls tenant filtering (or skips it — see `TenantList`, `AgentList`,
   `ChatSessionList` which today show rows for every tenant in admin mode).
2. **Fragmented filter UX.** Every `*List.tsx` declares its own React Admin
   `filters` array inline. Tenant input shape differs per module
   (`<AutocompleteInput>` in `KnowledgeBaseList`, raw `<NumberInput>` in
   `FormList`, missing entirely in `AgentList`). Search field keys drift
   (`q` vs module-specific). There is no shared filter component library.
3. **Four divergent playgrounds.** `ai/AIPlayground.tsx` (1,809 lines,
   MUI-based, tab layout), `agent-ui/UnifiedAIPlayground` (canonical,
   Tailwind, 3-panel), `knowledge-base/KBPlayground.tsx` (781 lines,
   custom 3-panel), `agents/AgentPlaygroundPanel.tsx` (collapsible chat
   card embedded in `AgentEdit`). Users see four different mental models
   of "try a thing against this model/agent/KB".
4. **No shared dashboard chrome.** `apps/dashboard/src/components/shared/`
   currently contains only `rich-text-editor/`. There is no tenant switcher,
   no page header component, no filter toolbar, no empty-state, no error
   boundary.

This program's job is to define, design, and land the primitives that every
future module can lean on — *without* touching module business logic. It is
a docs-and-planning program until sprint-03; code lands starting in sprint-03.

---

## Scope boundaries

**In scope**

- Shared tenant context primitive (store, provider, hook, selector component)
- Shared filter toolbar system (combo-box-first, URL-sync, tenant-aware)
- Playground standardization (one layout, one state model, one command surface)
- Dashboard consistency pass across every `*List` / `*Edit` / `*Show` / custom page
- Page header, empty state, error boundary, loading skeleton primitives
- Documentation under `docs/modules/todo/dashboard-ux-system/`

**Out of scope**

- Portal (`apps/dashboard/src/app/portal/**`) — lives under Tailwind + `@oven/oven-ui`
  and has its own UX system
- Any module's business logic, schema, or API surface
- Changes to React Admin version, MUI version, or Next.js routing
- Editor packages (`packages/*-editor/`) internals — they keep their own
  canvas chrome; only their embed points into the dashboard are touched
- Designing a new brand system, logo, or marketing surface

---

## Sprint roadmap

| Sprint | File | State | Goal |
|---|---|---|---|
| 00 | [`sprint-00-discovery.md`](./sprint-00-discovery.md) | ready | Inventory current UX; gap analysis; research shortlist |
| 01 | [`sprint-01-foundation.md`](./sprint-01-foundation.md) | ready | Scaffold `packages/dashboard-ui/` with theme, `TenantContextProvider`, `useTenantContext`, `TenantSelector` primitive, contract tests |
| 02 | [`sprint-02-ux-audit.md`](./sprint-02-ux-audit.md) | ready | Full audit of every module's list/edit/show/custom page against the foundation primitives; gap matrix routed to later sprints |
| 03 | [`sprint-03-tenant-context.md`](./sprint-03-tenant-context.md) | ready | Wire `TenantSelector` into `AdminApp` header; migrate every tenant-scoped list to read from `useTenantContext`; Rule 6.3 enforcement test |
| 04 | [`sprint-04-filter-system.md`](./sprint-04-filter-system.md) | ready | Ship `<FilterToolbar>` + `<ComboBoxFilter>` + `<DateRangeFilter>` + `<StatusFilter>` from `@oven/dashboard-ui`; URL sync; migrate 3 reference modules |
| 05 | [`sprint-05-playground-standardization.md`](./sprint-05-playground-standardization.md) | ready | Graduate `UnifiedAIPlayground` to canonical — wrap AI / agent / KB playgrounds in a common 3-panel shell; kill dead code paths in `AIPlayground.tsx` |
| 06 | [`sprint-06-dashboard-consistency.md`](./sprint-06-dashboard-consistency.md) | ready | Page header, empty state, loading skeleton, error boundary, section menu groupings; apply across every module resource |
| 07 | [`sprint-07-acceptance.md`](./sprint-07-acceptance.md) | ready | End-to-end walk-through by a platform admin + a tenant admin; acceptance checklist; `PROGRESS.md` graduation |

---

## Dependencies

Declared in order of registration consumption (this program is a *consumer* of
modules, never a producer of runtime behavior):

1. **`module-tenants`** — source of truth for tenant identity. Read-only here.
2. **`module-auth`** — role / permission gates for admin-mode tenant switching
   (only users with `tenants.list` permission get the global selector).
3. **`module-ui-flows`** — reference for how a Tailwind + MUI hybrid chrome
   wraps an embed host.
4. **`module-agent-core`** + **`module-chat`** + **`module-workflow-agents`** —
   consumers of the unified playground shell. They do not import from this
   program; the program reaches into them via the existing
   `UnifiedAIPlayground` facade in `@oven/agent-ui`.

### Dependency on existing work

- `packages/agent-ui/src/playground/UnifiedAIPlayground.tsx` is already the
  canonical playground per `docs/modules/IMPLEMENTATION-STATUS.md`. This
  program does not rebuild it — it extends it and reuses it as the shell for
  every dashboard playground.
- `packages/oven-ui/` contributes the `cn()` utility and base Tailwind
  primitives (used inside `@oven/agent-ui` already — not leaked into MUI
  dashboard pages).

---

## Rule 13 and styling posture

This program writes **MUI `sx`-only code** inside `apps/dashboard/` and
`packages/dashboard-ui/` (the new shared library). No `style={}`, no
`className=` with hand-written CSS, no `styled()`. The canonical playground
shell is and stays Tailwind — dashboard wrappers expose it as a Box
container so MUI pages never directly touch Tailwind classes. This is the
same split already in place for `workflow-agents/AIPlaygroundPage.tsx`.

## Quick links

- Discovery: [`sprint-00-discovery.md`](./sprint-00-discovery.md)
- Foundation: [`sprint-01-foundation.md`](./sprint-01-foundation.md)
- Status: [`STATUS.md`](./STATUS.md)
- Boot prompt: [`PROMPT.md`](./PROMPT.md)
- Research + senior review: [`CODE-REVIEW.md`](./CODE-REVIEW.md)
- Business owner: [`business-owner.md`](./business-owner.md)

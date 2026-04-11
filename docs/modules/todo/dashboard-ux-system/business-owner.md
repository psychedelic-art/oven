# Dashboard UX System — Business Owner

> This document captures the business framing for prioritisation. Engineering
> uses it when choosing which sprint to pull next from the queue across
> modules and programs.

## Priority tier

**Tier 1** (platform enablement blocker) — this program is blocking every
module that wants to feel like a coherent product instead of a stack of
admin forms. Specifically:

- Dental-project (`docs/dental-project.md`) admins currently cannot cleanly
  switch between the two dental tenants in the same session because there
  is no global tenant selector.
- The notifications module (`docs/modules/todo/notifications/`) ships a
  dashboard UI in its sprint-04. If it lands before this program's
  sprint-03, it will bake in yet another ad-hoc filter pattern that we
  will then have to rip out.
- The chat analytics dashboards flagged in
  `docs/modules/IMPLEMENTATION-STATUS.md` cannot reason about tenant scope
  without a primitive.

## Business value (12-month horizon)

| Outcome | Signal |
|---|---|
| Consistent tenant scoping across all modules | 0 module-specific tenant inputs remaining |
| Faster admin workflows | Average time-to-switch-tenant under 3 seconds |
| Reduced onboarding friction for new modules | Any new `*List.tsx` uses the shared `<FilterToolbar>` in under 20 LOC |
| Unified playground mental model | One 3-panel layout across AI / agents / KB / workflow-agents playgrounds |
| Reduced tech debt | Dead paths in `ai/AIPlayground.tsx` (1,809 lines) removed; shared shell wraps it |

## Stakeholders

- **Platform admin** — needs to switch tenants in one click, see aggregate
  data in admin mode, and drill down to a single tenant.
- **Tenant admin** — needs every module's list to auto-scope to their tenant
  without ever seeing another tenant's data, and without a manual tenant
  picker on every form.
- **Module engineer** — needs a drop-in `<FilterToolbar>` and
  `useTenantContext()` so new list views take hours, not days.
- **QA** — needs one golden path (global tenant switcher → each module's
  list view reflects the switch) to verify, not N per-module flows.

## Non-goals (explicit)

- **No portal redesign.** `apps/dashboard/src/app/portal/**` is Tailwind +
  `@oven/oven-ui`. It has its own UX rhythm. This program is MUI-only.
- **No new brand system.** Typography, colour, logo are untouched. We
  re-use the existing MUI theme.
- **No React Admin fork.** We stay within React Admin 5's extension points.
- **No editor package refactors.** `ui-flows-editor`, `map-editor`,
  `form-editor`, `agent-workflow-editor` keep their current canvas chrome.
  Only their embed host page is touched by the consistency pass.
- **No telemetry, analytics, or metrics.** Out of scope for this program.
- **No drive-by fixes.** If the module's list is broken for reasons
  unrelated to filters / tenant / playground, file a bug — don't patch it
  here.

## Success criteria (sprint-07 acceptance)

1. A platform admin can open the dashboard, click the tenant selector in the
   header, pick "Dental Clinic North", and see every list (tenants,
   agents, chat sessions, KB entries, workflows, notifications channels,
   flows, forms) auto-filter to that tenant's data.
2. A tenant admin logs in, sees no tenant selector (single-tenant mode),
   and every list shows only their tenant's data with no hand-rolled
   filter code in any module.
3. Every tenant-scoped list has a filter toolbar built from the shared
   primitives. No `<NumberInput source="tenantId">` survives anywhere.
4. The AI Playground, KB Playground, and Agent Playground all mount
   `UnifiedAIPlayground` as their shell. Their wrapper files are under
   100 lines each.
5. Menu sections in `CustomMenu.tsx` use the shared section label
   primitive. No hand-written `<Typography variant="overline">` labels
   remain in the custom menu.
6. `vitest` coverage for `packages/dashboard-ui/` is at least 30 unit
   tests spanning the tenant provider, filter components, playground
   shell, and layout primitives.
7. Zero `style={}` in any file touched by this program. Enforced by grep
   in `sprint-07-acceptance.md`.

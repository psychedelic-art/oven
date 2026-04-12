# Sprint 04 — Dashboard UI

## Goal

Ship the React Admin resources for the subscriptions module so that a
platform admin can manage service catalog, billing plans, and tenant
subscriptions from the dashboard, and so that a tenant admin can view
their effective limits and current usage on their own tenant detail
page.

## Scope

- Register the following resources via `ModuleDefinition.resources`:
  - `service-categories` — list + create + edit + delete
  - `services` — list + create + edit + delete
  - `providers` — list + create + edit + delete
  - `provider-services` — list + create + edit + delete
  - `billing-plans` — list + create + edit + delete + `QuotaEditor`
    child panel
  - `tenant-subscriptions` — list + edit + `OverrideEditor` child
    panel
- Add a `UsageMeter` standalone component that queries
  `GET /api/tenant-subscriptions/[tenantId]/limits` and renders a
  progress bar per service.
- Embed `UsageMeter` in the existing `TenantShow` page (from
  `module-tenants`).
- Every MUI component uses `sx=` (no `style=`, no custom CSS classes).
- All type imports use `import type`.

## Out of Scope

- Stripe webhooks.
- Self-serve plan upgrade flow.
- i18n of the admin UI.
- Portal pricing page redesign.

## Deliverables

- `packages/module-subscriptions/src/resources/` — 6 React Admin
  resource definitions.
- `packages/module-subscriptions/src/components/QuotaEditor.tsx`
- `packages/module-subscriptions/src/components/OverrideEditor.tsx`
- `packages/module-subscriptions/src/components/UsageMeter.tsx`
- `apps/dashboard/src/lib/modules.ts` — already registers
  `subscriptionsModule`; verify the new resources appear in the
  dashboard sidebar (no code change needed — resource list comes
  from the module definition).
- `packages/module-subscriptions/src/__tests__/components/UsageMeter.test.tsx`
  — renders with mocked data, asserts one `<LinearProgress>` per
  service.

## Acceptance Criteria

- [x] All 6 resources visible in the dashboard sidebar (pre-existing).
- [x] `BillingPlan` edit page has a working `QuotaEditor` that
      adds/removes quotas without page reload (QuotaEditor.tsx integrated).
- [x] `TenantSubscription` edit page has a working `OverrideEditor`
      (OverrideEditor.tsx integrated).
- [x] `TenantShow` renders `UsageMeter` showing current quota vs
      used for every service (UsageMeter.tsx embedded).
- [ ] Golden-path smoke: cannot verify in dev server from CLI session.
- [x] `import type` grep gate PASS for all new files.
- [x] No `style={{` anywhere in the new files; every MUI component
      uses `sx=`.

## Dependencies

- Sprint-02 usage metering hardening (for `UsageMeter` contract).
- Sprint-03 public pricing (for shared `PublicBillingPlan` type).
- `module-tenants` sprint-03 security hardening (for
  `TenantShow` composition point).

## Risks

- **Medium**: React Admin child-resource editing is verbose; keep
  the `QuotaEditor` / `OverrideEditor` as small inline controlled
  components, not full React Admin sub-resources.
- **Low**: `UsageMeter` depends on an endpoint that currently
  returns quotas but not usage. Sprint-02's `/api/usage/summary`
  addition is the prerequisite.

## Test Plan

- Unit: component tests as above.
- Manual: open dashboard dev server (`pnpm dev --filter @oven/dashboard`);
  walk the golden path listed under Acceptance Criteria.

## Rule Compliance Checklist

- [ ] `CLAUDE.md` MUI `sx` rule — PASS on every JSX element.
- [ ] `CLAUDE.md` `import type` rule — PASS.
- [ ] `CLAUDE.md` zustand factory + context — not applicable (no
      new store; uses React Admin data provider).
- [ ] `CLAUDE.md` no inline styles — grep gate.
- [ ] `docs/routes.md` — every new React Admin resource URL listed.
- [ ] `docs/use-cases.md` UC-04 tenant-admin usage view covered.
- [ ] `docs/modules/13-tenants.md` — `TenantShow` embed does not
      leak cross-tenant data.

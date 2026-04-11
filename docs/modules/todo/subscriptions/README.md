# Module Subscriptions — Todo Queue

> **Top-level spec**: [`docs/modules/21-module-subscriptions.md`](../../21-module-subscriptions.md)
> **Canonical docs**: [`docs/modules/subscriptions/`](../../subscriptions/)
> **Package**: `packages/module-subscriptions/` — **already implemented on `dev`**
> **Dependencies**: `module-registry`, `module-config`, `module-tenants`
> **Queue entry reason**: Crosscheck report §6.2 item #2 and §6.3 item #3
> flagged the module as having no canonical doc set, yet it is a
> prerequisite for `module-ai` middleware (`checkQuota` + `trackUsage`
> call `UsageMeteringService`) and for `module-notifications`
> (per-channel send quotas).

---

## What this module does

`module-subscriptions` is the dynamic **billing, service catalog, and
usage-metering** module for the OVEN platform. It models OVEN as a
**service reseller** — packaging upstream providers (Twilio for
WhatsApp, OpenAI for AI, Resend for email, etc.) into billing plans
that tenants subscribe to.

All provider, service, category, and quota rows are plain DB records;
no constants in code. A new upstream provider can be added at runtime
via `POST /api/providers` + `POST /api/services` + `POST /api/provider-services`
without shipping new code.

## Why it is in the todo queue

The package is **already in production code** but its documentation is
**split across the top-level spec only** (`21-module-subscriptions.md`,
887 lines). The canonical 11-file doc set under
`docs/modules/subscriptions/` did not exist until this entry. The
crosscheck report explicitly flags two missing items that the canonical
set now captures:

- `sub_usage_records` table documentation (crosscheck §6.2 #1) —
  now in `database.md`.
- `UsageMeteringService` endpoints (`POST /api/usage/track`,
  `GET /api/usage/summary`, `GET /api/tenant-subscriptions/[tenantId]/usage`)
  — now in `api.md`.

## Current code state

- **Schema**: `packages/module-subscriptions/src/schema.ts` defines
  9 tables (`sub_service_categories`, `sub_services`, `sub_providers`,
  `sub_provider_services`, `sub_billing_plans`, `sub_plan_quotas`,
  `sub_tenant_subscriptions`, `sub_quota_overrides`, `sub_usage_records`).
- **API**: 23 handler files covering service catalog, billing plans,
  tenant subscriptions, overrides, limits, and usage.
- **Engine**: `src/engine/usage-metering.ts` — single entry point for
  `checkQuota(tenantId, serviceSlug)` + `trackUsage(...)` called by
  `module-ai` middleware and (planned) `module-notifications` channels.
- **Seed**: `src/seed.ts` — idempotent `INSERT … ON CONFLICT DO UPDATE`
  across categories, services, providers, provider-services, billing
  plans, plan quotas (updated cycle-1, 2026-04-11).
- **Tests**: **none yet** — this is the biggest sprint-01 gap.

## Sprint queue

- `sprint-00-discovery.md` — drift audit between
  `21-module-subscriptions.md`, canonical doc set, and current code.
- `sprint-01-foundation.md` — scaffold vitest + baseline test coverage
  for the engine.
- `sprint-02-usage-metering.md` — harden `UsageMeteringService`,
  expose `POST /api/usage/track` idempotency key, add per-period
  aggregation tests.
- `sprint-03-public-pricing.md` — lock down `GET /api/billing-plans/public`
  and add snapshot tests for the marketing pricing page shape.
- `sprint-04-dashboard-ui.md` — React Admin resources, plan editor,
  tenant subscription detail view, usage dashboard.
- `sprint-05-acceptance.md` — terminal sprint, full rule-compliance gate.

## References

- `docs/modules/21-module-subscriptions.md` — 887-line top-level spec.
- `docs/modules/crosscheck-report.md` §6.2 / §6.3 — gaps this module
  plugs.
- [Stripe Metered Billing Guide for SaaS 2026](https://www.buildmvpfast.com/blog/stripe-metered-billing-implementation-guide-saas-2026)
  — architecture touchstone (Meter → Price → Subscription → Event).
- [Stripe: Usage-based billing docs](https://docs.stripe.com/billing/subscriptions/usage-based)
  — aggregation methods (sum/count/last) inform our per-period roll-up.
- [Multi-tenant data isolation with PostgreSQL RLS (AWS)](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/)
  — tenant pool + RLS pattern for `sub_*` tables.
- [OpenMeter: Implementing usage-based pricing](https://openmeter.io/blog/implementing-usage-based-pricing-with-stripe)
  — high-volume buffering (app-side aggregation → bulk flush).

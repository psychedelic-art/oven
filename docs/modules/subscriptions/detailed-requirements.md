# Subscriptions — Detailed Requirements

Source of truth: `docs/modules/21-module-subscriptions.md` §§1..12.
This file is the implementation-oriented restatement. Every
requirement is tagged `SUB-RN-M` where `N` is the section and `M`
the sub-item, matching the sprint files' DRIFT references.

## SUB-R1 — Dynamic catalog

- **SUB-R1-1**: Providers, services, categories, and provider-services
  MUST be regular DB rows. No constants, no enums, no TypeScript
  unions of string literals that would require a code change to add
  a new provider.
- **SUB-R1-2**: `POST /api/providers` + `POST /api/services` +
  `POST /api/provider-services` MUST be sufficient to register a new
  upstream provider at runtime.
- **SUB-R1-3**: A `service.slug` MUST match `^[a-z0-9-]+$` and be
  unique globally.
- **SUB-R1-4**: A `provider_service` row carries the upstream
  `costCents` so that future margin reporting works from the same
  schema.

## SUB-R2 — Plan-based quotas

- **SUB-R2-1**: A billing plan defines zero or more `sub_plan_quotas`
  rows, each keyed `(planId, serviceId)` unique.
- **SUB-R2-2**: A `period` column on `sub_plan_quotas` enumerates
  `daily | monthly | yearly`. No other values permitted.
- **SUB-R2-3**: A plan with no quota for a service means the tenant
  has **zero** quota for that service. "Implicitly unlimited" is
  never a valid state.

## SUB-R3 — Tenant subscriptions

- **SUB-R3-1**: At most one `sub_tenant_subscriptions` row per tenant
  MAY have `status = 'active'`. Enforced at the application layer
  (transition from `active` → `canceled` on plan change).
- **SUB-R3-2**: Subscription status transitions:
  `trial → active → canceled`. `past_due` is a sideband status set
  by billing webhooks.
- **SUB-R3-3**: Canceling a subscription MUST NOT delete
  `sub_usage_records` for that tenant — the ledger is permanent.

## SUB-R4 — Quota overrides

- **SUB-R4-1**: An override is keyed `(subscriptionId, serviceId)`
  unique. Exactly one override per `(subscription, service)`.
- **SUB-R4-2**: An override fully replaces the plan quota for that
  service — there is no "added to" semantics.
- **SUB-R4-3**: When a subscription is canceled, its overrides are
  no longer considered by the limit resolver, but the rows are kept
  for audit.

## SUB-R5 — Limit resolution

The five-step algorithm (see `architecture.md` and
`module-design.md`) is the contract.

- **SUB-R5-1**: The resolver MUST run in O(4) DB queries (fetch
  subscription, service, override, plan-quota). No joins, no
  window functions, no pagination.
- **SUB-R5-2**: The resolver MUST return a discriminated-union
  result, never `null | undefined`.
- **SUB-R5-3**: The resolver MUST be covered by unit tests for
  every terminal branch: `no-subscription`, `unknown-service`,
  `override`, `plan`, `not-in-plan`.

## SUB-R6 — Usage metering

- **SUB-R6-1**: Every metered event MUST land in
  `sub_usage_records` with `tenant_id`, `service_id`, `amount`,
  and `recorded_at`.
- **SUB-R6-2**: `POST /api/usage/track` MUST be idempotent when
  the caller supplies `X-Usage-Idempotency-Key`.
- **SUB-R6-3**: A usage insert MUST NOT fail when the quota is
  exceeded — the caller (middleware) is responsible for checking
  the quota **before** the upstream call. Track is always
  fire-and-forget after the fact.
- **SUB-R6-4**: `GET /api/usage/summary` MUST return totals for
  the current billing period, rolled up per service. The "current
  period" is derived from `sub_tenant_subscriptions.started_at`
  and the plan's `period` column, not from the calendar month.

## SUB-R7 — Public pricing

- **SUB-R7-1**: `GET /api/billing-plans/public` is the **only**
  public (unauthenticated) route in the module.
- **SUB-R7-2**: The response MUST project only
  `{ id, slug, name, priceCents, currency, quotas[] }` and MUST NOT
  include `costCents`, `providerId`, `marginPercent`, or any
  column whose name starts with `_`.
- **SUB-R7-3**: The projection MUST use explicit Drizzle
  `select({ ... })` listing each column. A snapshot test asserts
  the shape.

## SUB-R8 — Tenant isolation

- **SUB-R8-1**: Every tenant-scoped table
  (`sub_tenant_subscriptions`, `sub_quota_overrides`,
  `sub_usage_records`) MUST have an RLS policy that constrains
  `SELECT / UPDATE / DELETE` to rows where `tenant_id = ANY(current_setting('app.tenant_ids')::int[])`.
- **SUB-R8-2**: Catalog tables (categories, services, providers,
  plans) are platform-wide and do NOT have RLS — they are visible
  to every authenticated user.
- **SUB-R8-3**: `GET /api/tenant-subscriptions/[tenantId]/limits`
  MUST re-verify `tenantId` against the caller's tenant scope even
  though RLS would catch it — defence in depth.

## SUB-R9 — Event emission

- **SUB-R9-1**: Events MUST be declared in
  `ModuleDefinition.events.schemas` per Rule 2.3.
- **SUB-R9-2**: `subscription.activated` fires on `POST /api/tenant-subscriptions` 201.
- **SUB-R9-3**: `subscription.quota.exceeded` fires when
  `checkQuota` returns `allowed: false` — even though this is a
  hot path, the event is important for alerting.
- **SUB-R9-4**: `usage.threshold.crossed` fires when a usage insert
  takes the rolling total across 80% or 100% of the effective
  quota. Emission must be idempotent per `(tenantId, serviceSlug, threshold)`
  per period.

## SUB-R10 — Seed idempotency

- **SUB-R10-1**: `seed(db)` MUST be safe to run N times. All upserts
  via `INSERT … ON CONFLICT DO UPDATE` keyed on `slug`.
- **SUB-R10-2**: `seed(db)` MUST NOT write any tenant-scoped rows.
  If it ever does, it is a bug.
- **SUB-R10-3**: A vitest integration test asserts that two
  sequential `seed()` calls produce the same row counts on both
  runs (sprint-01).

## SUB-R11 — Rate limits

- **SUB-R11-1**: `POST /api/usage/track` is rate-limited at 1,000
  requests per minute per tenant at the gateway layer (outside
  this module). This module trusts the gateway and does not
  double-limit.
- **SUB-R11-2**: `GET /api/billing-plans/public` is rate-limited at
  60 requests per minute per IP to protect the marketing page.

## SUB-R12 — Observability

- **SUB-R12-1**: Every 422 `quota_exceeded` response MUST be logged
  with `{ tenantId, serviceSlug, quota, remaining }` at WARN level.
- **SUB-R12-2**: Seed runs MUST log one INFO line per table with
  the row delta (`"sub_services: 12 rows (+0)"`).
- **SUB-R12-3**: `trackUsage` deduplication events MUST log at
  DEBUG level with the colliding idempotency key prefix (not the
  full key — prefix only for correlation without leaking).

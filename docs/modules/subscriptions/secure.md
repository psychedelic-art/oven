# Subscriptions — Security

Threat model and mitigations for a module that touches billing, quota
enforcement, and the public pricing page.

## Trust boundaries

```
┌─────────────────────────────┐
│ Public internet              │──► GET /api/billing-plans/public
│                              │    (rate-limited by gateway, no auth)
└──────────────┬───────────────┘
               │
┌──────────────▼───────────────┐
│ Authenticated dashboard user │──► all other /api/* routes
│ (platform admin or tenant    │    (auth required, tenant-scoped)
│  admin)                      │
└──────────────┬───────────────┘
               │
┌──────────────▼───────────────┐
│ Server-side middleware       │──► engine.checkQuota / trackUsage
│ (from module-ai,             │    (in-process, trusted)
│  module-notifications, etc.) │
└──────────────────────────────┘
```

## OWASP Top 10 coverage

### A01 — Broken Access Control

**Mitigations**:

- Every tenant-scoped handler reads `tenantId` from the auth
  context, never from the request body. Handlers that accept a
  `tenantId` path parameter (e.g.
  `/api/tenant-subscriptions/[tenantId]/limits`) re-verify the
  parameter against the caller's tenant scope before touching the
  DB.
- Row-level security (RLS) policies on `sub_tenant_subscriptions`,
  `sub_quota_overrides`, and `sub_usage_records` enforce
  tenant isolation at the database layer as defence in depth.
- Platform-admin-only resources (`services`, `providers`,
  `billing-plans`) check `permissions.has('platform.admin')` on
  every mutation.

**Test coverage**: sprint-02 slug-validation tests + cross-tenant
access integration tests.

### A02 — Cryptographic Failures

**Mitigations**:

- Upstream provider credentials (Twilio SID, OpenAI API key)
  live in `module-config` under `platform` scope, encrypted at
  rest with the AES-GCM scheme documented in
  `docs/modules/config/secure.md`. Subscriptions NEVER stores
  a credential.
- `idempotencyKey` values are logged as prefix-only (first 8
  chars) to avoid correlation leaks through log aggregation.

### A03 — Injection

**Mitigations**:

- All DB access is via Drizzle with parameterised queries — no
  string interpolation into SQL.
- `serviceSlug` path parameters are validated against
  `^[a-z0-9-]+$` at the handler boundary before any DB query
  (sprint-02 hardens this on
  `GET /api/tenant-subscriptions/[tenantId]/limits/[serviceSlug]`).
- The F-05-01 sort allowlist helper
  (`packages/module-ai/src/api/_utils/sort.ts`) is the reference
  pattern — subscriptions handlers that accept a sort parameter
  copy the pattern (do NOT import the helper; Rule 3.1 forbids
  cross-module imports of internal utilities).

**Test coverage**: sprint-02 slug-validation test with
`../../etc/passwd`, `DROP TABLE users;--`, and prototype-key
inputs.

### A04 — Insecure Design

**Mitigations**:

- Override precedence is explicit and traceable: override → plan
  → zero. No "god mode" flag, no implicit unlimited.
- The limit resolver returns a `source` field so audit logs show
  exactly which row won.
- `trackUsage` is fire-and-forget AFTER the upstream request —
  a quota exceeded event does NOT block the insert, it just
  emits an alert event.

### A05 — Security Misconfiguration

**Mitigations**:

- `GET /api/billing-plans/public` uses an explicit Drizzle
  projection, never `select()`. Response shape is asserted via
  snapshot test in sprint-03.
- Public response NEVER includes `costCents`, `providerId`,
  `marginPercent`, or any column starting with `_`.
- Gateway-level rate limits (60 req/min/IP) protect the marketing
  page from scraping.

### A06 — Vulnerable & Outdated Components

- Dependency surface: `drizzle-orm`, `@oven/module-registry`,
  `@oven/module-config`, `@oven/module-tenants`. No third-party
  npm packages beyond those. `vitest` is a dev dep only.

### A07 — Identification & Authentication Failures

- Delegated to `module-auth`. Subscriptions trusts the
  `req.context.user` shape set by the upstream middleware.

### A08 — Software & Data Integrity Failures

**Mitigations**:

- `POST /api/usage/track` accepts `X-Usage-Idempotency-Key`
  (sprint-02). Retries from middleware collapse to a single
  row via the partial unique index on
  `sub_usage_records (tenant_id, idempotency_key)`.
- The seed is idempotent — re-running the deploy never corrupts
  the catalog.
- Drizzle migrations are idempotent and never truncate
  `sub_usage_records`.

### A09 — Security Logging & Monitoring

**Mitigations**:

- Every 422 `quota_exceeded` response logs WARN with
  `{ tenantId, serviceSlug, quota, remaining }`.
- `subscription.activated` and `subscription.canceled` events
  are consumed by the (planned) audit module for structured
  audit log entries.
- Seed runs log one INFO line per table with the row delta.
- `usage.threshold.crossed` events (80% / 100%) can be consumed
  by the alerting pipeline.

### A10 — SSRF

- No outbound HTTP in this package. Upstream provider calls
  live in `module-ai` / `module-notifications`.

## Public surface — GET /api/billing-plans/public

This is the only unauthenticated endpoint in the subscriptions module.
The handler uses an explicit Drizzle `select({ ... })` projection to
ensure internal columns are never loaded from the database, let alone
returned in the response.

Exact response shape (`PublicBillingPlan[]`):

```ts
{
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  billingCycle: string | null;
  features: Record<string, unknown> | null;
  order: number;
  quotas: Array<{
    service: string;
    unit: string;
    quota: number;
    period: string;
  }>;
}
```

Forbidden columns (must NEVER appear): `isPublic`, `isSystem`,
`enabled`, `createdAt`, `updatedAt`, `costCents`, `providerId`,
`marginPercent`, `internalNotes`, any key starting with `_private`.

Enforced by `public-pricing.test.ts` (snapshot + fuzz).

## Row-level security policies

Applied at deployment time by a Drizzle migration:

```sql
-- sub_tenant_subscriptions
ALTER TABLE sub_tenant_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY sub_tenant_subscriptions_tenant_scope
  ON sub_tenant_subscriptions
  USING (tenant_id = ANY(current_setting('app.tenant_ids')::int[]));

-- sub_quota_overrides (indirect via subscription)
ALTER TABLE sub_quota_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY sub_quota_overrides_tenant_scope
  ON sub_quota_overrides
  USING (
    subscription_id IN (
      SELECT id FROM sub_tenant_subscriptions
       WHERE tenant_id = ANY(current_setting('app.tenant_ids')::int[])
    )
  );

-- sub_usage_records
ALTER TABLE sub_usage_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY sub_usage_records_tenant_scope
  ON sub_usage_records
  USING (tenant_id = ANY(current_setting('app.tenant_ids')::int[]));
```

The GUC `app.tenant_ids` is set by `module-tenants`'
session-initialisation middleware on every authenticated request.
See `docs/modules/tenants/secure.md` §"Tenant session GUC".

## Audit trail requirements

The following events must be captured in the audit log:

| Event                          | Actor            | Target                 |
|--------------------------------|------------------|------------------------|
| Plan created / updated / deleted | Platform admin  | `sub_billing_plans`    |
| Plan quota added / removed      | Platform admin  | `sub_plan_quotas`      |
| Subscription activated / canceled | Platform admin | `sub_tenant_subscriptions` |
| Override added / removed        | Platform admin  | `sub_quota_overrides`  |
| Usage tracked                   | Server middleware (system) | `sub_usage_records` |

The audit module is the consumer — it subscribes to the events
emitted by this module (`subscription.*`, `usage.tracked`) and
persists to a separate audit log table. Subscriptions itself does
not write audit rows.

## Incident response

If a quota-bypass bug is discovered:

1. **Disable** `checkQuota` short-circuit behaviour (if any exists
   in middleware) via a `module-config` kill-switch.
2. **Audit** `sub_usage_records` for the impacted tenant + service
   against the effective limit.
3. **Backfill** overrides or plan adjustments if overage is
   acceptable.
4. **Roll forward** with a fix + new unit test before re-enabling
   the middleware.

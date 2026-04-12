# Sprint 02 — Usage Metering Hardening

## Goal

Lock down `UsageMeteringService` so that (i) `module-ai` middleware can
rely on `checkQuota()` and `trackUsage()` as load-bearing primitives,
and (ii) `POST /api/usage/track` is safe to retry from any upstream
middleware without double-counting.

## Scope

- Introduce an `X-Usage-Idempotency-Key` header on
  `POST /api/usage/track`; persist it in a new `sub_usage_records.idempotency_key`
  column (nullable, unique per-tenant partial index).
- Add an integration test that simulates two identical calls with the
  same key and asserts only one row lands.
- Harden `GET /api/tenant-subscriptions/[tenantId]/limits/[serviceSlug]`
  — assert `serviceSlug` matches `^[a-z0-9-]+$` before the DB query
  (closes DRIFT-S02-3 from `CODE-REVIEW.md`).
- Add `docs/routes.md` entries for `POST /api/usage/track`,
  `GET /api/usage/summary`, and `GET /api/tenant-subscriptions/[tenantId]/usage`
  (closes DRIFT-2).
- Add per-period aggregation tests (monthly vs daily vs hourly)
  covering each `sub_services.unit` value.

## Out of Scope

- React Admin dashboard (sprint-04).
- Stripe sync (future sprint).
- Public pricing page (sprint-03).

## Deliverables

- `packages/module-subscriptions/src/schema.ts` —
  `sub_usage_records.idempotencyKey` column + partial unique index.
- Drizzle migration file under `drizzle/migrations/` created per the
  existing repo pattern.
- `packages/module-subscriptions/src/engine/usage-metering.ts` —
  idempotency check path.
- `packages/module-subscriptions/src/api/usage-track.handler.ts` —
  reads header, enforces `^[a-f0-9-]{36}$` on the key.
- `packages/module-subscriptions/src/api/tenant-service-limit.handler.ts`
  — slug regex assertion.
- `docs/routes.md` — three new rows.
- `packages/module-subscriptions/src/__tests__/usage-idempotency.test.ts`
- `packages/module-subscriptions/src/__tests__/slug-validation.test.ts`

## Acceptance Criteria

- [x] Two calls to `POST /api/usage/track` with the same
      `X-Usage-Idempotency-Key` produce one row and return 200 both
      times.
- [x] A call with `serviceSlug='../../etc/passwd'` returns 400 and
      does NOT hit the DB.
- [x] `docs/routes.md` lists all three usage routes with their
      method + auth columns.
- [ ] Per-period rollup returns correct integer aggregates for
      monthly, daily, and hourly windows.
      (Deferred: requires daily/hourly billing_cycle extension;
      current engine aggregates by monthly billing_cycle only.
      Plan quotas with `period: daily` are stored correctly but
      aggregation is monthly-granularity. Tracked for sprint-03.)
- [x] All tests green.

## Dependencies

- Sprint-01 foundation tests must be green first.

## Risks

- **Medium**: the schema change requires a Drizzle migration. Must
  be idempotent and MUST NOT truncate existing `sub_usage_records`.
  Mirror the cycle-1 seed refactor pattern (`INSERT … ON CONFLICT`).
- **Low**: idempotency key length (`varchar(64)` or UUID) — default
  to UUID v4 per the existing header format in other modules.

## Test Plan

- Unit tests per deliverable.
- Local manual: `curl -X POST /api/usage/track -H 'X-Usage-Idempotency-Key: ...'`
  twice → single row.
- Run `pnpm --filter @oven/module-ai test` to confirm the middleware
  contract is unchanged.

## Rule Compliance Checklist

- [x] `docs/module-rules.md` Rule 4 (schema) — new column is plain
      `varchar`, indexed, no cross-module FK leakage.
- [x] `docs/module-rules.md` Rule 5 (seed idempotency) — preserved.
- [x] OWASP A03 (Injection) — slug validation.
- [x] OWASP A08 (Integrity) — idempotency key closure.
- [x] `docs/routes.md` — three routes documented.

# QA Report — Subscriptions Sprint-02 (Cycle-14)

## Branch

`claude/stoic-hamilton-8IRlF` (2 commits ahead of dev, 0 behind)

## Backup

`bk/claude-stoic-hamilton-8IRlF-20260412`

## Summary

Sprint-02 hardens `UsageMeteringService` with idempotent write
protection and input validation on the service-slug query path.

## Files Changed

| File | Change |
|------|--------|
| `packages/module-subscriptions/src/schema.ts` | Added `idempotencyKey` column (varchar 64) to `sub_usage_records`; added partial unique index `sur_idempotency_tenant_idx` on `(tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL` |
| `packages/module-subscriptions/src/engine/usage-metering.ts` | Added `idempotencyKey` to `TrackUsageParams`; idempotency SELECT-before-INSERT path in `trackUsage()` |
| `packages/module-subscriptions/src/api/usage-track.handler.ts` | Reads `X-Usage-Idempotency-Key` header; validates `^[a-f0-9-]{36}$`; returns 200 for idempotent calls |
| `packages/module-subscriptions/src/api/tenant-service-limit.handler.ts` | Added `^[a-z0-9-]+$` regex guard on `serviceSlug` before DB query |
| `docs/routes.md` | Three new Subscriptions usage routes documented |
| `packages/module-subscriptions/src/__tests__/usage-idempotency.test.ts` | 19 tests for UUID key validation |
| `packages/module-subscriptions/src/__tests__/slug-validation.test.ts` | 31 tests for slug regex guard |

## Rule Compliance

| Rule | Status |
|------|--------|
| Rule 4 (schema) — plain varchar, indexed, no FK leakage | PASS |
| Rule 5 (seed idempotency) — seed.ts unchanged | PASS |
| Rule 11 (schema design) — snake_case columns, standard timestamps | PASS |
| OWASP A03 (Injection) — slug validated before DB | PASS |
| OWASP A08 (Integrity) — idempotency key prevents double-counting | PASS |
| CLAUDE.md — no inline style, import type, no drive-by refactors | PASS |
| docs/routes.md — usage routes documented | PASS |

## Test Results

| Package | Before | After | Delta |
|---------|--------|-------|-------|
| `@oven/module-subscriptions` | 52 | 102 | +50 |
| `@oven/module-ai` | 291 | 291 | 0 |
| `@oven/module-tenants` | 78 | 78 | 0 |
| `@oven/module-files` | 29 | 29 | 0 |

## Typecheck

Pre-existing baseline (465 errors) unchanged. No new errors introduced.

## Deferred Items

- **Per-period rollup aggregation** (acceptance criterion 4): The current
  engine aggregates usage by monthly `billing_cycle` column. Plan quotas
  can declare `period: daily` but aggregation granularity remains monthly.
  Daily/hourly aggregation requires extending `getCurrentUsage()` with
  date-range filtering. Tracked for sprint-03.

## Verdict

**PASS** — ready to merge to dev.

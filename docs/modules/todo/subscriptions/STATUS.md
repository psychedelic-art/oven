# Subscriptions — Status

## Current state

- **Top-level spec**: `docs/modules/21-module-subscriptions.md` (887 lines) — LIVE
- **Canonical doc set**: `docs/modules/subscriptions/` — 11/11 files
- **Package**: `packages/module-subscriptions/` — already on `dev`
- **Unit tests**: **102** — sprint-02 added 50 tests (19 idempotency + 31 slug validation)
- **Sprint queue**: 6 files (`sprint-00..05`)
- **Active sprint**: `sprint-03-public-pricing` (sprint-02 shipped cycle-14)

## History

| Date       | Event                                                                              |
|------------|------------------------------------------------------------------------------------|
| 2026-04-11 | Cycle-3 Phase-3: canonical 11-file doc set scaffolded; todo folder + 6 sprint files created. |
| 2026-04-11 | Cycle-3 Phase-4: sprint-01 foundation shipped. Extracted `computeBillingCycle` and `resolveEffectiveLimit` (pure helpers) from `usage-metering.ts`; refactored the engine to delegate; wrote 52 vitest tests across three files (10 billing-cycle + 25 resolver + 17 module-definition). `module-ai` and `module-tenants` test suites remain green (110 + 28) — no regression. |
| 2026-04-12 | Cycle-14: sprint-02 usage-metering shipped. Added `idempotencyKey` column to `sub_usage_records` with partial unique index; idempotency check in engine; `X-Usage-Idempotency-Key` header reading with UUID validation in `usage-track.handler.ts`; `serviceSlug` regex guard in `tenant-service-limit.handler.ts` (OWASP A03); three usage routes documented in `docs/routes.md`; 50 new tests (19 idempotency + 31 slug validation). Total: 102 tests. |

## Dependencies satisfied

- `module-registry` ✓
- `module-config` ✓
- `module-tenants` ✓ (canonical doc set landed cycle-3)

## Blockers

- None.

## Next action

Execute `sprint-03-public-pricing`: public billing plans endpoint
and pricing page component.

## Backup branch

- `bk/claude-stoic-hamilton-8IRlF-20260412` (cycle-14)

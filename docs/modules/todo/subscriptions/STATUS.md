# Subscriptions — Status

## Current state

- **Top-level spec**: `docs/modules/21-module-subscriptions.md` (887 lines) — LIVE
- **Canonical doc set**: `docs/modules/subscriptions/` — **scaffolded this session** (11 files)
- **Package**: `packages/module-subscriptions/` — already on `dev`
- **Unit tests**: **83** — sprint-03 public pricing shipped cycle-23
- **Sprint queue**: 6 files (`sprint-00..05`)
- **Active sprint**: `sprint-03-public-pricing` DONE. Next: `sprint-04-dashboard-ui`.

## History

| Date       | Event                                                                              |
|------------|------------------------------------------------------------------------------------|
| 2026-04-11 | Cycle-3 Phase-3: canonical 11-file doc set scaffolded; todo folder + 6 sprint files created. |
| 2026-04-11 | Cycle-3 Phase-4: sprint-01 foundation shipped. Extracted `computeBillingCycle` and `resolveEffectiveLimit` (pure helpers) from `usage-metering.ts`; refactored the engine to delegate; wrote 52 vitest tests across three files (10 billing-cycle + 25 resolver + 17 module-definition). `module-ai` and `module-tenants` test suites remain green (110 + 28) — no regression. |
| 2026-04-12 | Sprint-02 usage metering shipped: idempotency key column + handler dedup, slug validation on tenant-service-limit, routes.md entries, +28 tests (52 -> 80). |

## Dependencies satisfied

- `module-registry` ✓
- `module-config` ✓
- `module-tenants` ✓ (canonical doc set landed cycle-3)

## Blockers

- None. Ready for sprint-00 discovery.

## Next action

Execute `sprint-00-discovery`: diff the top-level spec against the
canonical doc set and against the current code. Write a drift report
under `CODE-REVIEW.md`. File any deviations as sprint-01 test
acceptance items.

## Backup branch

This session did not rebase any feature branch for subscriptions.
No backup branch required for cycle-3.

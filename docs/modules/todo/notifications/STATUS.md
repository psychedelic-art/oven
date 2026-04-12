# Notifications — STATUS

| Field | Value |
|---|---|
| Current sprint | `sprint-03-usage-metering.md` |
| Sprint state | **done** (cycle-24) |
| Package | `packages/module-notifications/` (87 tests), `packages/notifications-meta/` (21 tests) |
| Active branch | `claude/stoic-hamilton-Ucqlg` |
| Backup branch | `bk/claude-stoic-hamilton-Ucqlg-20260412` |
| Open PR | pending cycle-24 |
| Test framework | `vitest` 3.2.4 |
| QA verdict | **pass** — 87/87 module-notifications green |
| Blockers | none |

## Last updates

- 2026-04-12 — sprint-03-usage-metering executed on `claude/stoic-hamilton-Ucqlg`:
  - New `usage-limit-resolver.ts`: three-tier cascade (subscriptions/config/fail-safe) via HTTP deps (Rule 3.1 + 3.2).
  - New `usage-metering.ts`: `checkUsageLimit()`, `incrementUsage()`, `getMonthStart()`, `getPeriodEnd()` with atomic counter + event emission on crossing.
  - New `notifications-usage.handler.ts`: GET endpoint returning per-channel usage summary.
  - Updated `conversation-pipeline.ts` to check limits before processing and call `incrementUsage()` after.
  - Updated `index.ts` to register the new handler and export services.
  - 3 new test files: `usage-limit-resolver.test.ts` (12 tests), `usage-metering.test.ts` (19 tests), `notifications-usage-handler.test.ts` (8 tests).
  - Updated existing tests: `conversation-pipeline.test.ts`, `webhook-handler.test.ts`, `module-definition.test.ts` to work with new usage services.
  - DRIFT-1 resolved: spec `15-notifications.md` section 6 updated to reference subscriptions/config cascade instead of `tenant.whatsappLimit`.
  - Tests: 87/87 green (39 new tests added in sprint-03).
- 2026-04-12 — sprint-02-whatsapp-meta-adapter executed on `claude/stoic-hamilton-iouNt`:
  - New package `@oven/notifications-meta` with `metaAdapter`. 21 vitest tests.
  - 5 API handlers. `ingestInboundMessage()` pipeline service.
  - Module registered in `apps/dashboard/src/lib/modules.ts`.
  - Tests: 48/48 module-notifications, 21/21 notifications-meta green.
- 2026-04-11 — folder bootstrapped; canonical doc set scaffolded; sprint roadmap authored (00-05).
- 2026-04-11 — sprint-01-foundation: package scaffold, 7 source files, 5 test files, 37 tests.

## Acceptance checklist (module-level)

Mirrors [`docs/module-rules.md`](../../../module-rules.md) "Before Merging a New Module" checklist — updated each sprint.

- [x] `ModuleDefinition` contract implemented (sprint-01)
- [x] Registered in `apps/dashboard/src/lib/modules.ts` in dependency order (cycle-12)
- [x] `chat` block declared (sprint-01)
- [x] Events listed in `events.emits` with typed `schemas` (sprint-01)
- [x] No direct imports from other module packages (sprint-01 — enforced by `no-cross-module-imports.test.ts`)
- [x] Adapter interface + separate adapter packages (interface sprint-01; `@oven/notifications-meta` shipped cycle-12)
- [x] Tenant-scoped tables have `tenantId` column with index (sprint-01)
- [x] API handlers filter by `tenantId` (cycle-12 — channels handler; cycle-24 — usage handler)
- [x] Events include `tenantId` in payload (sprint-01 schemas)
- [x] Permissions seeded for CRUD + resolve (sprint-01 seed)
- [x] PUT handlers auto-create version snapshots — n/a (no versioned entities)
- [x] `listResponse()` + `parseListParams()` used (cycle-12 — channels + conversations handlers)
- [ ] Menu items added to `CustomMenu.tsx` (sprint-04)
- [ ] Resources registered with list/create/edit/show (sprint-04)
- [ ] Create forms auto-assign `tenantId` (sprint-04)
- [x] Seed idempotent (sprint-01 — `onConflictDoNothing`)
- [x] Config declared in `configSchema` (sprint-01)
- [x] Tenant-customizable settings in `module-config`, not on domain tables (sprint-01; sprint-03 usage resolver confirmed)
- [x] Slug columns unique — n/a
- [x] Foreign keys are plain integers (sprint-01)
- [x] Public endpoints marked in `api_endpoint_permissions` (sprint-01 seed for webhook routes)
- [x] Usage limits resolved via module-subscriptions + module-config cascade (sprint-03, Rule 13 compliant)

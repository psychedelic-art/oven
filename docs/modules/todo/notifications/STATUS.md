# Notifications — STATUS

| Field | Value |
|---|---|
| Current sprint | `sprint-02-whatsapp-meta-adapter.md` |
| Sprint state | **done** (cycle-12) |
| Package | `packages/module-notifications/` (48 tests), `packages/notifications-meta/` (21 tests) |
| Active branch | `claude/stoic-hamilton-iouNt` |
| Backup branch | `bk/claude-stoic-hamilton-iouNt-20260412` |
| Open PR | none |
| Test framework | `vitest` 3.2.4 |
| QA verdict | **pass** — 48/48 module-notifications + 21/21 notifications-meta green |
| Blockers | none |

## Last updates

- 2026-04-12 — sprint-02-whatsapp-meta-adapter executed on `claude/stoic-hamilton-iouNt`:
  - New package `@oven/notifications-meta` with `metaAdapter` (verifyMetaSignature, parseInboundMetaWebhook, sendMetaMessage). 21 vitest tests.
  - 5 API handlers: channels CRUD, conversations list/show, WhatsApp webhook GET+POST.
  - `ingestInboundMessage()` conversation pipeline service.
  - Module registered in `apps/dashboard/src/lib/modules.ts` with `registerNotificationAdapter(metaAdapter)`.
  - Tests: 48/48 module-notifications, 21/21 notifications-meta green.
- 2026-04-11 — folder bootstrapped from `docs/modules/15-notifications.md`; canonical doc set scaffolded at `docs/modules/notifications/`; sprint roadmap authored (00–05); Rule 13 drift identified and routed to `module-subscriptions`.
- 2026-04-11 — sprint-01-foundation executed on `claude/eager-curie-4GaQC`:
  - `packages/module-notifications/` scaffolded with `package.json`, `tsconfig.json`, 7 source files, 5 test files.
  - Tests: 5 files / 37 tests passing (`pnpm test` output: `Test Files  5 passed (5)`, `Tests  37 passed (37)`).
  - Rule compliance greps clean: no `references()` in schema, no adapter-package imports in src, no inline `style={}`.
  - Sprint-01 acceptance checklist fully satisfied; module-definition invariants enforced by `src/__tests__/module-definition.test.ts` (15 assertions).

## Acceptance checklist (module-level)

Mirrors [`docs/module-rules.md`](../../../module-rules.md) "Before Merging a New Module" checklist — updated each sprint.

- [x] `ModuleDefinition` contract implemented (sprint-01)
- [x] Registered in `apps/dashboard/src/lib/modules.ts` in dependency order (cycle-12)
- [x] `chat` block declared (sprint-01)
- [x] Events listed in `events.emits` with typed `schemas` (sprint-01)
- [x] No direct imports from other module packages (sprint-01 — enforced by `no-cross-module-imports.test.ts`)
- [x] Adapter interface + separate adapter packages (interface sprint-01; `@oven/notifications-meta` shipped cycle-12)
- [x] Tenant-scoped tables have `tenantId` column with index (sprint-01)
- [x] API handlers filter by `tenantId` (cycle-12 — channels handler filters by tenantId)
- [x] Events include `tenantId` in payload (sprint-01 schemas)
- [x] Permissions seeded for CRUD + resolve (sprint-01 seed)
- [x] PUT handlers auto-create version snapshots — n/a (no versioned entities)
- [x] `listResponse()` + `parseListParams()` used (cycle-12 — channels + conversations handlers)
- [ ] Menu items added to `CustomMenu.tsx` (sprint-04)
- [ ] Resources registered with list/create/edit/show (sprint-04)
- [ ] Create forms auto-assign `tenantId` (sprint-04)
- [x] Seed idempotent (sprint-01 — `onConflictDoNothing`)
- [x] Config declared in `configSchema` (sprint-01)
- [x] Tenant-customizable settings in `module-config`, not on domain tables (sprint-01)
- [x] Slug columns unique — n/a
- [x] Foreign keys are plain integers (sprint-01)
- [x] Public endpoints marked in `api_endpoint_permissions` (sprint-01 seed for webhook routes)

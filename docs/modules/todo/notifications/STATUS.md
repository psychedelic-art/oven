# Notifications — STATUS

| Field | Value |
|---|---|
| Current sprint | `sprint-04-dashboard-ui.md` |
| Sprint state | **done** (cycle-27) |
| Package | `packages/module-notifications/` (87 tests), `packages/notifications-meta/` (21 tests) |
| Active branch | `claude/stoic-hamilton-Nij5c` |
| Backup branch | `bk/claude-stoic-hamilton-Nij5c-20260413` |
| Open PR | pending cycle-27 |
| Test framework | `vitest` 3.2.4 |
| QA verdict | **pass** — 87/87 module-notifications green |
| Blockers | none |

## Last updates

- 2026-04-13 — sprint-04-dashboard-ui executed on `claude/stoic-hamilton-Nij5c`:
  - 10 new UI component files under `apps/dashboard/src/components/notifications/`.
  - Resources: notification-channels (CRUD), notification-conversations (list/show with chat bubbles), notification-escalations (list/show/edit).
  - UsageDashboardPage custom route with LinearProgress gauges and detail table (no chart library installed — gauge+table fallback per sprint risk plan).
  - Module definition updated: 3 resources, 4 menu items registered.
  - CustomMenu.tsx: Notifications section added with 4 entries.
  - AdminApp.tsx: 3 Resource elements + 1 CustomRoute wired.
  - Module-definition test updated (resources no longer empty).
  - Tests: 87/87 green (0 new — sprint delivers UI components, not handler logic).
  - Zero `style={{}}` violations. All MUI `sx`. All theme-unit spacing.
- 2026-04-12 — sprint-03-usage-metering: usage-limit-resolver, usage-metering, usage handler, +39 tests.
- 2026-04-12 — sprint-02-whatsapp-meta-adapter: metaAdapter, 5 handlers, pipeline service.
- 2026-04-11 — sprint-01-foundation: package scaffold, 7 source files, 37 tests.
- 2026-04-11 — folder bootstrapped; canonical doc set scaffolded; sprint roadmap authored.

## Acceptance checklist (module-level)

Mirrors [`docs/module-rules.md`](../../../module-rules.md) "Before Merging a New Module" checklist.

- [x] `ModuleDefinition` contract implemented (sprint-01)
- [x] Registered in `apps/dashboard/src/lib/modules.ts` in dependency order (cycle-12)
- [x] `chat` block declared (sprint-01)
- [x] Events listed in `events.emits` with typed `schemas` (sprint-01)
- [x] No direct imports from other module packages (sprint-01)
- [x] Adapter interface + separate adapter packages (sprint-01; `@oven/notifications-meta` cycle-12)
- [x] Tenant-scoped tables have `tenantId` column with index (sprint-01)
- [x] API handlers filter by `tenantId` (cycle-12, cycle-24)
- [x] Events include `tenantId` in payload (sprint-01)
- [x] Permissions seeded for CRUD + resolve (sprint-01)
- [x] `listResponse()` + `parseListParams()` used (cycle-12)
- [x] Menu items added to `CustomMenu.tsx` (sprint-04, cycle-27)
- [x] Resources registered with list/create/edit/show (sprint-04, cycle-27)
- [ ] Create forms auto-assign `tenantId` (deferred: useTenantContext not yet built)
- [x] Seed idempotent (sprint-01)
- [x] Config declared in `configSchema` (sprint-01)
- [x] Tenant-customizable settings in `module-config` (sprint-03)
- [x] Foreign keys are plain integers (sprint-01)
- [x] Public endpoints marked in `api_endpoint_permissions` (sprint-01)
- [x] Usage limits resolved via subscriptions + config cascade (sprint-03)

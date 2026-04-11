# Notifications — STATUS

| Field | Value |
|---|---|
| Current sprint | `sprint-01-foundation.md` |
| Sprint state | **done** (Phase 4 shipped) |
| Package | `packages/module-notifications/` (scaffolded + 37 tests passing) |
| Active branch | `claude/eager-curie-4GaQC` |
| Backup branch | n/a — no prior feature work to back up |
| Open PR | none (do not create without explicit user approval) |
| Test framework | `vitest` 3.2.4 (matches `packages/module-ai/src/__tests__/*.test.ts` convention) |
| QA verdict | **pass** — 37/37 vitest green on first run |
| Blockers | none |

## Last updates

- 2026-04-11 — folder bootstrapped from `docs/modules/15-notifications.md`; canonical doc set scaffolded at `docs/modules/notifications/`; sprint roadmap authored (00–05); Rule 13 drift identified and routed to `module-subscriptions`.
- 2026-04-11 — sprint-01-foundation executed on `claude/eager-curie-4GaQC`:
  - `packages/module-notifications/` scaffolded with `package.json`, `tsconfig.json`, 7 source files, 5 test files.
  - Tests: 5 files / 37 tests passing (`pnpm test` output: `Test Files  5 passed (5)`, `Tests  37 passed (37)`).
  - Rule compliance greps clean: no `references()` in schema, no adapter-package imports in src, no inline `style={}`.
  - Sprint-01 acceptance checklist fully satisfied; module-definition invariants enforced by `src/__tests__/module-definition.test.ts` (15 assertions).

## Acceptance checklist (module-level)

Mirrors [`docs/module-rules.md`](../../../module-rules.md) "Before Merging a New Module" checklist — updated each sprint.

- [x] `ModuleDefinition` contract implemented (sprint-01)
- [ ] Registered in `apps/dashboard/src/lib/modules.ts` in dependency order (sprint-05)
- [x] `chat` block declared (sprint-01)
- [x] Events listed in `events.emits` with typed `schemas` (sprint-01)
- [x] No direct imports from other module packages (sprint-01 — enforced by `no-cross-module-imports.test.ts`)
- [ ] Adapter interface + separate adapter packages (interface shipped sprint-01; Meta adapter package ships sprint-02)
- [x] Tenant-scoped tables have `tenantId` column with index (sprint-01)
- [ ] API handlers filter by `tenantId` (sprint-02 onwards)
- [x] Events include `tenantId` in payload (sprint-01 schemas)
- [x] Permissions seeded for CRUD + resolve (sprint-01 seed)
- [x] PUT handlers auto-create version snapshots — n/a (no versioned entities)
- [ ] `listResponse()` + `parseListParams()` used (sprint-02 handlers)
- [ ] Menu items added to `CustomMenu.tsx` (sprint-04)
- [ ] Resources registered with list/create/edit/show (sprint-04)
- [ ] Create forms auto-assign `tenantId` (sprint-04)
- [x] Seed idempotent (sprint-01 — `onConflictDoNothing`)
- [x] Config declared in `configSchema` (sprint-01)
- [x] Tenant-customizable settings in `module-config`, not on domain tables (sprint-01)
- [x] Slug columns unique — n/a
- [x] Foreign keys are plain integers (sprint-01)
- [x] Public endpoints marked in `api_endpoint_permissions` (sprint-01 seed for webhook routes)

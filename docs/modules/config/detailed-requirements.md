# Module Config -- Detailed Requirements

> Numbered requirements checklist. Each item maps to at least one sprint,
> at least one test, and at least one ground-truth rule.

---

## R1 -- Registration & Discoverability

- **R1.1** `configModule` exports a `ModuleDefinition` named `'config'` with
  zero dependencies (Rule 1.1).
- **R1.2** The module registers itself in
  `apps/dashboard/src/lib/modules.ts` before `workflowsModule` once the
  sprint-03 migration ships (Rule 1.2).
- **R1.3** The `chat` block exposes `description`, `capabilities`, and at
  least three `actionSchemas`: `config.resolve`, `config.resolveBatch`,
  `config.list` (Rule 2.1).
- **R1.4** Every emitted event (`config.entry.created`, `...updated`,
  `...deleted`) has a typed schema in `events.schemas` (Rule 2.3).

**Sprints**: sprint-00 (declare), sprint-02 (register).

---

## R2 -- Cascade Correctness

- **R2.1** The resolver walks tiers in strict priority order: tenant-instance >
  tenant-module > platform-instance > platform-module > schema default.
- **R2.2** The resolver never returns a lower-tier value when a higher-tier
  value exists (priority inversion is a bug).
- **R2.3** The resolver returns `{ value: null, source: 'default' }` when no
  tier matches -- it never throws for a missing key.
- **R2.4** Every response includes a `source` field whose value is one of
  `tenant-instance | tenant-module | platform-instance | platform-module |
  schema | default`.
- **R2.5** The batch resolver preserves the cascade contract for every key
  independently and does **not** cross-resolve (a tenant-module hit for key
  `A` does not affect key `B`).

**Sprints**: sprint-01 (tests).
**Tests**: `module-configs-resolve.test.ts`, `module-configs-resolve-batch.test.ts`.

---

## R3 -- Tenant Isolation

- **R3.1** Every tenant-scoped table has a `tenantId` column (Rule 5.1).
- **R3.2** `module_configs.tenantId` is indexed (Rule 5.1).
- **R3.3** API handlers filter by `tenantId` at the application level for
  tenant-scoped requests (Rule 5.2).
- **R3.4** RLS policies enforce tenant isolation at the DB level (Rule 5.3).
- **R3.5** Platform-global rows (`tenantId IS NULL`) are readable by all
  tenants and writable only by superadmins.
- **R3.6** Every event payload includes `tenantId` (Rule 5.6).

**Sprints**: sprint-00 (schema), sprint-03 (RLS migration).
**Tests**: unit tests in sprint-01 cover handler filters; sprint-03 adds an
integration test against a Neon preview branch for RLS.

---

## R4 -- Upsert Semantics

- **R4.1** `POST /api/module-configs` with an existing tuple
  `(tenantId, moduleName, scope, scopeId, key)` updates the existing row
  and emits `config.entry.updated`.
- **R4.2** `POST /api/module-configs` with a new tuple inserts and emits
  `config.entry.created`.
- **R4.3** The COALESCE unique index prevents duplicate rows in concurrent
  writes (sprint-03).

**Sprints**: sprint-00 (code already implements this), sprint-01 (test,
optional), sprint-03 (unique index migration).

---

## R5 -- Events

- **R5.1** `config.entry.created` fires on insert only, never on upsert-update.
- **R5.2** `config.entry.updated` fires on both upsert-update and PUT.
- **R5.3** `config.entry.updated` includes `oldValue` and `newValue`.
- **R5.4** `config.entry.deleted` fires on DELETE only.
- **R5.5** Events do not fire for tier-5 (schema default) reads. Only
  persisted-row mutations emit events.

**Sprints**: sprint-01 (event tests, optional), sprint-02 (dashboard proof).

---

## R6 -- Permissions & Seed

- **R6.1** Seed registers four permissions:
  `module-configs.read|create|update|delete` (Rule 5.5).
- **R6.2** Seed is idempotent (`ON CONFLICT DO NOTHING`).
- **R6.3** API handlers are registered in `api_endpoint_permissions` with
  the correct required-permission slug.

**Sprints**: sprint-00 (code), sprint-02 (dashboard seed run).

---

## R7 -- Dashboard UI

- **R7.1** `ModuleConfigList` shows columns: `moduleName`, `key`, `scope`,
  `scopeId`, `tenantId` (admin only), `value` (truncated), `description`.
- **R7.2** `ModuleConfigCreate` and `ModuleConfigEdit` expose: module
  dropdown, key input, scope selector, scopeId input, JSON value editor,
  description textarea.
- **R7.3** The menu item lives under a "Platform" section label.
- **R7.4** List view applies `useTenantContext().activeTenantId` filter when
  set.
- **R7.5** **No inline `style={}`**. All styling uses the MUI `sx` prop.
- **R7.6** Type-only imports use `import type`.
- **R7.7** No `styled()` calls, no `className=` with custom CSS.

**Sprints**: sprint-02.
**Rules**: Rule 6 + root `CLAUDE.md`.

---

## R8 -- No Cross-Module Imports

- **R8.1** `packages/module-config/src/**` does **not** import any other
  module's business logic directly.
- **R8.2** Consumers (`module-tenants`, `module-notifications`, etc.) call
  `GET /api/module-configs/resolve` -- never import handlers directly.
- **R8.3** Dashboard route shims in `apps/dashboard/src/app/api/module-configs/`
  use the `export { GET, POST } from '@oven/module-config/api/...'` pattern.

**Sprints**: sprint-00 (code already compliant), sprint-02 (shim addition).
**Rules**: Rule 3.1, Rule 4.4.

---

## R9 -- Performance

- **R9.1** Single-key resolve p95 < 50ms (tier-4 cold path).
- **R9.2** Batch resolve (14 keys) p95 < 80ms.
- **R9.3** No resolver call issues more than one DB query per tier.

**Sprints**: integration tests, later. Unit tests in sprint-01 do not
measure latency.

---

## R10 -- Documentation Integrity

- **R10.1** The 11 canonical doc files exist with real content (no
  placeholders).
- **R10.2** Every external reference in `references.md` has a URL and a
  one-sentence "why this is relevant" note.
- **R10.3** Rule compliance tables in every sprint file mark pass / fail
  for each ground-truth rules file.
- **R10.4** Status and progress tables are regenerated from the code state
  at the start of every working session.

**Sprints**: sprint-00, sprint-04.

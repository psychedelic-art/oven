# Sprint 03 — RLS + module-workflows Migration

> **Module**: config
> **Sprint**: 03
> **Goal**: Enable row-level security on `module_configs` and migrate
> ownership of the table away from `module-workflows`.
> **Status**: Ready (blocked by sprint-02)

## Goal

Lock tenant isolation at the database level and finish the ownership
transfer so `config` is the single source of truth for `module_configs`.

## Scope

- Drizzle SQL migration: `ALTER TABLE module_configs ENABLE ROW LEVEL
  SECURITY` + the 5 policies in `20-module-config.md` section 6.
- COALESCE-based unique index migration
  (`module_configs_unique`) replacing the plain unique constraint that
  `module-workflows` created.
- Remove `moduleConfigs` table definition from
  `packages/module-workflows/src/schema.ts`.
- Remove `'module-configs'` API handlers, resource, and menu entry from
  `packages/module-workflows/src/index.ts`.
- Add `dependencies: ['config']` to `workflowsModule` so registration order
  is enforced.
- Update `apps/dashboard/src/lib/modules.ts` — register `configModule` before
  `workflowsModule`.

## Out of Scope

- Adding `hierarchyNodeId` scoping (forever out of scope per `PROMPT.md`).
- Rewriting the workflow engine — it calls `GET /api/module-configs/resolve`
  already, so nothing on the read path needs to change.

## Deliverables

- [ ] `packages/module-config/src/migrations/0001_enable_rls.sql`
- [ ] `packages/module-config/src/migrations/0002_unique_coalesce.sql`
- [ ] Updated `packages/module-workflows/src/schema.ts` (table removed).
- [ ] Updated `packages/module-workflows/src/index.ts` (handlers + resource
      removed, dependency declared).
- [ ] Updated `apps/dashboard/src/lib/modules.ts` (registration order).
- [ ] Integration test against a Neon preview branch verifying:
      - A tenant-scoped row is readable only when the session var
        `app.current_tenant_id` matches.
      - Platform-global rows (tenant_id IS NULL) are readable by every tenant.
      - Inserts with a non-matching `tenant_id` are rejected by the WITH
        CHECK clause.

## Acceptance Criteria

1. `module_configs` has RLS enabled and the 5 policies in place — verified
   by `SELECT * FROM pg_policies WHERE tablename='module_configs'`.
2. `module-workflows` no longer declares `moduleConfigs` in its exported
   schema.
3. `registry.register(workflowsModule)` throws if `configModule` is not
   registered first (dependency check).
4. A tenant user cannot SELECT another tenant's row even if they craft a raw
   SQL query — RLS blocks it.
5. The superadmin policy still allows cross-tenant access.
6. A smoke run of the dashboard shows both Configs (from `config`) and
   Workflows (from `workflows`) with correct menu sections.

## Dependencies

- sprint-02 (dashboard UI) must be merged. This sprint moves ownership of
  the table; we need the UI working under the new owner before cutover.
- A Neon preview branch available for integration testing.

## Risks

- **HIGH: destructive migration**. Dropping the table definition from
  `module-workflows` in one atomic migration risks schema drift if the
  migration and the code change land in different deploys. Mitigation:
  ship both in the same commit, run migration first in CI, verify RA still
  mounts before merging.
- **RLS session vars must be set**: if the auth middleware does not set
  `app.current_tenant_id` + `app.current_role`, the policies deny all
  non-superadmin reads. Sprint-02 cannot safely land ahead of the auth
  middleware being in place. Cross-check with `module-auth` sprints before
  merging this sprint.
- **Backup branch required**: per the prompt's Phase 2 pipeline, a
  `bk/<branch>-<YYYYMMDD>` backup branch must be pushed before any merge
  into `dev`.

## Test Plan

1. Local: run the migration against a throwaway Neon branch, run the full
   resolver test suite (sprint-01) against the new owner, manually verify
   the dashboard still works.
2. RLS smoke: use `psql` with `SET app.current_tenant_id = '1'` and assert
   that tenant-2 rows are invisible.
3. Regression: the sprint-01 resolver tests must stay green. No changes
   to the handler code are expected.

## Rule Compliance Checklist

- [ ] `docs/module-rules.md` Rule 5.3 — RLS policies documented and applied.
- [ ] `docs/module-rules.md` Rule 4.3 — FKs remain plain integers.
- [ ] `docs/modules/13-tenants.md` — tenant context via session vars respected.
- [ ] `docs/modules/17-auth.md` — session vars set by auth middleware before
      any query runs.

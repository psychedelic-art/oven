# Sprint 03 — Tenant Context System

## Goal

Wire the sprint-01 tenant primitive into the dashboard. Every tenant-scoped
list reads from `useTenantContext`. Every tenant-scoped create form
auto-assigns `tenantId`. The global `TenantSelector` renders in the React
Admin `AppBar` for users with the `tenants.list` permission. Admin mode
works — an admin with no active tenant sees "all tenants" with a tenant
column; selecting a tenant narrows every list in one click.

This closes DRIFT-1 and satisfies Rule 6.3 and Rule 6.4 for the first time
in the project.

## Scope

### In

- Add `@oven/dashboard-ui` as a workspace dependency of
  `apps/dashboard/package.json`.
- `apps/dashboard/src/components/AdminApp.tsx`:
  - Import `TenantContextProvider` and wrap the `<Admin>` root. Pass
    the React Admin `dataProvider` and the `permissions` object to the
    provider.
  - Add a custom `<Layout>` that injects `TenantSelector` into the
    AppBar via React Admin's `AppBar` / `Layout` extension slot (per
    React Admin 5 `customAppBar` docs).
- Every tenant-scoped `*List.tsx` under `apps/dashboard/src/components/`
  (list enumerated in `audit/lists.md` from sprint-02). For each:
  - Remove hand-rolled `<ReferenceInput source="tenantId">`,
    `<NumberInput source="tenantId">`, or any ad-hoc tenant filter.
  - Call `const activeTenantId = useTenantContext((s) => s.activeTenantId)`
    and pass `filter={activeTenantId ? { tenantId: activeTenantId } : undefined}`.
  - When `isAdminMode` is true, add a `<ReferenceField source="tenantId" reference="tenants">`
    column to the datagrid. When false, hide it.
- Every tenant-scoped `*Create.tsx`:
  - Remove any exposed tenant picker for non-admin users.
  - Add `transform={(data) => ({ ...data, tenantId: data.tenantId ?? activeTenantId })}`
    reading `activeTenantId` from `useTenantContext`.
  - Admin mode keeps the picker so cross-tenant creates still work.
- `packages/dashboard-ui/src/__tests__/rule-6-enforcement.test.ts` —
  new fail-build test that greps `apps/dashboard/src/components/**/*List.tsx`
  and asserts:
  - Every file that imports from a tenant-scoped resource handler
    contains a call to `useTenantContext`.
  - No file contains `<NumberInput source="tenantId"`.
  - No file contains `<ReferenceInput source="tenantId"` *unless* it
    is inside an `isAdminMode &&` conditional branch.
- Migration documentation: `docs/modules/todo/dashboard-ux-system/migration-tenant-context.md`
  with the exact codemod / before-after pattern.

### Out

- Filter toolbar (sprint-04) — sprint-03 only replaces the tenant filter,
  not the rest of the filter array
- Playground refactors (sprint-05)
- Dashboard chrome primitives (sprint-06)
- Any change to `packages/dashboard-ui/` beyond the enforcement test

## Deliverables

1. `apps/dashboard/package.json` — new workspace dep on
   `@oven/dashboard-ui`.
2. `apps/dashboard/src/components/AdminApp.tsx` wraps the root in
   `TenantContextProvider` and injects `TenantSelector` into a custom
   AppBar.
3. Every tenant-scoped `*List.tsx` migrated — count from sprint-02 audit.
4. Every tenant-scoped `*Create.tsx` migrated — count from sprint-02 audit.
5. `packages/dashboard-ui/src/__tests__/rule-6-enforcement.test.ts` passing.
6. `docs/modules/todo/dashboard-ux-system/migration-tenant-context.md`.
7. Commit: `feat(dashboard-ui): rule 6 enforcement test`
8. Commit: `feat(dashboard): wire TenantContextProvider into AdminApp`
9. Commit: `refactor(dashboard): migrate tenant-scoped lists to useTenantContext`
10. Commit: `refactor(dashboard): migrate tenant-scoped create forms to useTenantContext`
11. Commit: `docs(dashboard-ux-system): record sprint-03 completion`

## Acceptance criteria

- [ ] `pnpm --filter dashboard typecheck` exits 0. (skipped — no tsconfig for dashboard-ui, pre-existing 465+ baseline)
- [x] `pnpm --filter @oven/dashboard-ui test` exits 0 including the new
  `rule-6-enforcement.test.ts`. (29/29 green)
- [x] `grep -rn '<NumberInput source="tenantId"' apps/dashboard/src/components`
  returns nothing.
- [x] `grep -rn '<ReferenceInput source="tenantId"' apps/dashboard/src/components`
  returns matches only inside `isAdminMode &&` conditional branches.
- [x] `grep -rn 'useTenantContext' apps/dashboard/src/components | wc -l`
  matches the count of tenant-scoped lists + creates from the sprint-02
  audit.
- [ ] A platform admin can open the dashboard, click the `TenantSelector`
  in the AppBar, pick a tenant, and every tenant-scoped list narrows
  in a single render pass (verified by manual walkthrough). (cannot verify in CLI)
- [ ] A tenant admin (no `tenants.list` permission) does not see the
  selector at all (verified by manual walkthrough). (cannot verify in CLI — no authProvider)
- [x] No `style={}` introduced in any file touched by this sprint
  (`grep -rn 'style={' apps/dashboard/src/components` diff against `dev`
  returns no new hits).
- [x] `STATUS.md` updated; acceptance checklist in STATUS has the
  "AdminApp wraps all routes" and "Every tenant-scoped `*List` reads"
  rows checked.

## Dependencies

- Sprint-01 (foundation primitive)
- Sprint-02 (audit matrix — tells us the exact set of files to migrate)
- `module-tenants` for the `/api/tenants` endpoint (read-only)
- `module-auth` for the `Permissions.has('tenants.list')` call
- Root `CLAUDE.md` `zustand-store-pattern` and `mui-sx-prop` rules
- Use case: **tenant switching for admins** (`$PRIMARY_USE_CASES`)
- Research R1 (Notion workspace switcher) and R2 (Clerk organization
  switcher) for the interaction shape

## Risks

- **Silent tenant leak during migration** — if a migration accidentally
  drops the `filter={{ tenantId }}` prop, a tenant admin would see
  another tenant's data. Mitigation: the `rule-6-enforcement.test.ts`
  grep catches missing `useTenantContext` imports at build time; manual
  QA with a 2-tenant test account is required before sprint close.
- **React Admin AppBar slot API** — `<Layout>` / `<AppBar>` extension
  points changed between RA 4 and 5. Mitigation: read the RA 5 source of
  `apps/dashboard/node_modules/ra-ui-materialui/src/layout/AppBar.tsx`
  before wiring the selector.
- **Stale audit** — sprint-02 audit counts may differ from the actual
  code by the time sprint-03 runs. Mitigation: first step of sprint-03
  is to re-run the grep and diff against the audit table; delta is
  recorded in `STATUS.md`.

## Test plan

- TDD order:
  1. Write `rule-6-enforcement.test.ts` first asserting zero hits on
     `<NumberInput source="tenantId"` and every `*List.tsx` importing
     `useTenantContext`. It will fail on `main`.
  2. Migrate lists module-by-module until the test passes.
  3. Write a second test asserting every `*Create.tsx` has `transform`
     containing `tenantId`. Migrate until it passes.
  4. Manual QA walk-through with two tenants.

## Rule compliance checklist

- [ ] Rule 6.3 — every tenant-scoped list reads `useTenantContext`
- [ ] Rule 6.4 — every tenant-scoped create form auto-assigns `tenantId`
- [ ] Rule 5.2 — API handlers already filter by tenant; no change needed
- [ ] Root `CLAUDE.md` `mui-sx-prop` — any new JSX uses `sx` only
- [ ] Root `CLAUDE.md` `no-inline-styles` — no new `style={}`
- [ ] Root `CLAUDE.md` `type-imports` — every new `import type` is correct
- [ ] Root `CLAUDE.md` `zustand-store-pattern` — provider still
  per-instance, not singleton

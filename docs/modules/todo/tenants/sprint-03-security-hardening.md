# Sprint 03 — Security Hardening

## Goal

Close every high and medium security gap identified in
[`CODE-REVIEW.md`](./CODE-REVIEW.md). Each fix lands with a
regression test from the sprint-02 test infrastructure.

## Scope

### In

1. **DRIFT-2 — Remove `id` leak from public endpoint**
   - Edit `src/api/tenants-public.handler.ts` to omit `id` from the
     assembled response body.
   - Add a regression test:
     `__tests__/tenants-public.handler.test.ts`:
     `expect(body).not.toHaveProperty('id')`.

2. **DRIFT-3 — Last-owner guard**
   - Before `DELETE /api/tenant-members/[id]`:
     `SELECT count(*) FROM tenant_members WHERE tenant_id = $1 AND role = 'owner'`.
     If the target member is the last owner (`count = 1` and the
     row's `role = 'owner'`), return `409 Conflict` with
     `{ error: 'Cannot remove the last owner', field: 'role' }`.
   - Same check applies to a future `PUT` that would change a role
     away from `owner`.
   - Test: create a tenant with one owner, assert DELETE returns
     409 and the member row still exists.

3. **DRIFT-4 — MAX_MEMBERS_PER_TENANT enforcement**
   - Before `POST /api/tenant-members`, call
     `module-config.resolve-batch` for
     `tenants.MAX_MEMBERS_PER_TENANT` for the target tenant.
   - `SELECT count(*) FROM tenant_members WHERE tenant_id = $1`.
   - If `count >= maxMembers`, return `409 Conflict` with
     `{ error: 'Tenant member limit reached', limit: maxMembers }`.
   - Test: seed a tenant config with `MAX_MEMBERS_PER_TENANT = 2`,
     insert 2 members, assert the third POST returns 409.

4. **DRIFT-5 — Sort-field allowlist (F-05-01 pattern)**
   - Copy `getOrderColumn` from `packages/module-ai/src/api/_utils/sort.ts`
     into `packages/module-tenants/src/api/_utils/sort.ts`. (When
     the helper moves to `@oven/module-registry/api-utils` as part
     of the oven-bug-sprint, tenants imports from there.)
   - Apply to `tenants.handler.ts` GET and
     `tenant-members.handler.ts` GET with allowlists:
     - tenants: `['id', 'name', 'slug', 'enabled', 'createdAt', 'updatedAt']`
     - tenant_members: `['id', 'tenantId', 'userId', 'role', 'createdAt']`
   - Test: invalid sort returns 400 with an allowlist in the body.

5. **DRIFT-6 — Seed idempotency test**
   - `__tests__/seed.test.ts`: create a scratch in-memory Drizzle
     mock OR run against a real Neon dev DB (`pnpm db:seed` twice)
     and assert the permission row count is stable.

### Out

- RLS policies (blocked on `module-auth` middleware — cross-module
  sprint)
- Handler integration tests for every endpoint (scheduled
  separately; this sprint only adds enough tests to cover the
  drift fixes)
- Optimistic concurrency check on PUT (sprint-04)
- Midnight-wrap schedule support (sprint-04)

## Deliverables

- [ ] 5 handler edits across `tenants-public`, `tenant-members`,
  `tenant-members-by-id`, `tenants` (list), `tenant-members` (list)
- [ ] 1 new `_utils/sort.ts` file (F-05-01 copy)
- [ ] 5 new test files (1 per drift fix)
- [ ] Every test green under `pnpm --filter @oven/module-tenants test`
- [ ] `STATUS.md` updated with sprint-03 completion

## Acceptance criteria

- Every DRIFT-2..DRIFT-6 item in `CODE-REVIEW.md` has a closed
  checkbox in `STATUS.md` acceptance checklist
- Public endpoint response has no `id` field (regression test)
- Last-owner removal returns 409 (regression test)
- Max-member limit is enforced (regression test)
- Invalid sort returns 400 (regression test)
- Seed is idempotent (assertion test)

## Rule compliance checklist

- [ ] `docs/module-rules.md` Rule 3.1 — no cross-module imports
- [ ] `docs/module-rules.md` Rule 6.1 — CRUD convention preserved
- [ ] `docs/modules/20-module-config.md` — use `resolve-batch`, not
  per-key HTTP loops
- [ ] Root `CLAUDE.md` — `import type` for all type-only imports
- [ ] Root `CLAUDE.md` — error handling only at HTTP boundaries
- [ ] No new npm dependencies

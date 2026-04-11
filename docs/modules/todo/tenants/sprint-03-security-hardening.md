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

- [x] 4 handler edits across `tenants-public`, `tenant-members`,
  `tenant-members-by-id`, `tenants` (list), `tenant-members` (list)
  — cycle-8
- [x] 1 new `_utils/sort.ts` file (F-05-01 copy) — cycle-8
- [x] 1 new `_utils/member-guards.ts` file (`checkLastOwnerRemoval`,
  `checkMemberLimit`) — cycle-8
- [x] 1 new `_utils/public-response.ts` file
  (`assembleTenantPublicResponse`, typed shape forbids `id`) — cycle-8
- [x] 3 new test files (`sort-guard.test.ts` 23 tests,
  `member-guards.test.ts` 15 tests, `public-response.test.ts` 12 tests) — cycle-8
- [x] Every test green under `pnpm -F @oven/module-tenants test`
  — **78/78** (was 28 baseline) cycle-8
- [x] `STATUS.md` updated with sprint-03 completion — cycle-8
- [ ] DRIFT-6 seed idempotency test — **deferred**, requires DB mock
  infra not yet in the module. Tracked in `STATUS.md`.

## Acceptance criteria

- [x] DRIFT-2 (public id leak): closed — `assembleTenantPublicResponse`
  shape structurally forbids `id`; 12 regression tests.
- [x] DRIFT-3 (last-owner guard): closed — `checkLastOwnerRemoval`
  + DELETE handler wiring returns 409 `{ error, field: 'role' }`;
  6 pure-helper tests + handler edit.
- [x] DRIFT-4 (member limit): closed — POST handler resolves
  `MAX_MEMBERS_PER_TENANT` (tenant override → platform → schema
  default) and uses `checkMemberLimit` to refuse inserts with 409
  `{ error, limit }`; 9 pure-helper tests + handler edit.
- [x] DRIFT-5 (sort allowlist): closed — `getOrderColumn` copied
  verbatim from `module-ai` per IP-4 rule; `tenants` and
  `tenant-members` list handlers both return 400 on invalid sort
  with the allowlist echoed; 23 regression tests.
- [ ] DRIFT-6 (seed idempotency): deferred to a future sprint —
  requires either an in-memory drizzle mock or an integration DB
  harness that this cycle does not add.

## Rule compliance checklist

- [x] `docs/module-rules.md` Rule 3.1 — no cross-module imports
  (sort helper is a verbatim copy, not an import from `module-ai`;
  `module-config` consumed via direct DB query against
  `moduleConfigs` schema import, matching the existing
  `tenants-public.handler.ts` pattern — no HTTP loop, no workspace
  dep beyond the already-declared `@oven/module-config` in
  `package.json`)
- [x] `docs/module-rules.md` Rule 6.1 — CRUD convention preserved
  (handlers keep their existing route shape; only error responses
  gain 409 codes)
- [x] `docs/modules/20-module-config.md` — direct DB read on
  `moduleConfigs` table is the documented performance-sensitive
  pattern for intra-process handlers; tenant-override → platform →
  schema default cascade matches the `tenants-public.handler.ts`
  implementation
- [x] Root `CLAUDE.md` — `import type` for all type-only imports
  (`TenantPublicResolvedConfig` imported via `import type` in
  `tenants-public.handler.ts`; every other import is value-only
  by design)
- [x] Root `CLAUDE.md` — error handling only at HTTP boundaries
  (`checkLastOwnerRemoval`, `checkMemberLimit`,
  `assembleTenantPublicResponse`, and `getOrderColumn` are pure —
  no throws, no try/catch; handlers wrap their DB calls and
  convert verdicts to HTTP responses)
- [x] No new npm dependencies

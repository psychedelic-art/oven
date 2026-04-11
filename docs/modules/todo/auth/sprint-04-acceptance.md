# Sprint 04 — Acceptance (RLS migration + handler cut-over + graduation)

## Goal

Land the RLS migration for all 4 auth tables, cut every existing
dashboard handler over to `getAuthContext(request)`, and publish the
auth module's graduation: delete `docs/modules/todo/auth/` and mark
the module live in `docs/modules/IMPLEMENTATION-STATUS.md`.

## Scope

1. **RLS migration** — a single drizzle-kit migration adding the
   policies from `docs/modules/auth/secure.md` § "RLS Policies".
   Ships with a Postgres `SET LOCAL` wrapper in
   `packages/module-registry/src/db-session.ts` so the middleware
   can push `app.user_id`, `app.tenant_ids`, `app.role` before every
   handler runs.
2. **Handler cut-over** — every file from sprint-00's
   `inventory.md` with classification `call-site` loses its direct
   JWT / Argon2 import and calls `getAuthContext(request)` instead.
   One commit per file (small blast radius, easy revert).
3. **Users admin resource** — ship `UserList`, `UserCreate`,
   `UserEdit`, `UserShow` per `UI.md`. Scope via tenancy.
4. **Platform-admin impersonation** — UC-AUTH-14. A single custom
   header `X-Impersonate-Tenant-Id` that the middleware honours only
   when `current role == 'platform_admin'`.
5. **Session cleanup job** — hourly deletion of expired
   `auth_sessions` rows. Backed by the existing job runner; no new
   infrastructure.
6. **End-to-end acceptance tests** — one `.test.ts` file per use
   case UC-AUTH-01 through UC-AUTH-18 from
   `docs/modules/auth/use-case-compliance.md`.
7. **Graduation**:
   - Delete `docs/modules/todo/auth/**` in the same commit that
     marks the module live.
   - Update `docs/modules/IMPLEMENTATION-STATUS.md` to `auth: live`.
   - Update `docs/modules/todo/README.md` and `PROGRESS.md`.
   - Update the top-level `docs/modules/00-overview.md` to reference
     `docs/modules/auth/` as the live canonical doc set.

## Out of scope

- Firebase and Auth0 adapter packages — future work.
- Migrating anonymous `X-Session-Token` issuance out of
  `module-chat` — future work.

## Deliverables

- 1 drizzle migration under
  `packages/module-auth/migrations/NNNN_auth_rls.sql`.
- Cut-over commits: one per call site from `inventory.md`.
- `UserList.tsx`, `UserCreate.tsx`, `UserEdit.tsx`, `UserShow.tsx`.
- 18 acceptance test files.
- Graduation commit removing `docs/modules/todo/auth/`.

## Acceptance criteria

- [ ] All 18 use-case acceptance tests pass.
- [ ] Zero `jsonwebtoken` / `argon2` / `next-auth` imports remain
      outside `packages/auth-authjs/`.
- [ ] `pnpm db:migrate` applies the RLS migration cleanly on Neon.
- [ ] Cross-tenant read of `api_keys` by a non-admin user returns
      `0 rows` at the SQL level (RLS enforcement, verified with
      `psql` one-liner in the acceptance test).
- [ ] `pnpm -w turbo run lint typecheck test build` green.
- [ ] Session cleanup job removes expired rows in an integration
      test.
- [ ] `docs/modules/IMPLEMENTATION-STATUS.md` shows `auth: live`.
- [ ] `docs/modules/todo/auth/` is removed.

## Touched packages

- `packages/module-auth`
- `packages/module-registry`
- `apps/dashboard`
- Every package referenced by `inventory.md` with a `call-site`
  classification.

## Risks

- **R1**: The `SET LOCAL` wrapper conflicts with Neon's HTTP driver
  (no persistent session). *Mitigation*: use Neon serverless
  driver in transaction mode for RLS-bearing queries; fall back to
  a connection pool when available.
- **R2**: Cross-tenant user list queries in `UserList` need to
  aggregate across memberships without breaking RLS. *Mitigation*:
  `UserList` runs as `platform_admin` only; the tenant-scoped view
  is a filtered projection derived from `tenant_members`.
- **R3**: Handler cut-over may surface latent bugs in handlers that
  previously bypassed the middleware. *Mitigation*: one commit per
  file, CI green per commit.

## Rule compliance checklist

- `docs/module-rules.md` Rule 3.1 (plain FKs) — RLS does not change
  FK style.
- `docs/module-rules.md` Rule 3.2 (idempotent seeds) — seed
  unchanged.
- `docs/modules/17-auth.md` — every section now has a live
  counterpart in the package.
- `docs/routes.md` — auth routes listed.
- `docs/use-cases.md` — UC-AUTH-01 through UC-AUTH-18 covered.
- `CLAUDE.md` styling rules — all UI sprint deliverables re-audited.

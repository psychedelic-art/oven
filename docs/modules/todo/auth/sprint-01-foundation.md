# Sprint 01 — Foundation (package, schema, registry, middleware scaffold)

## Goal

Stand up `@oven/module-auth` with the adapter registry, schema, seed,
and a non-functional middleware scaffold. No adapter implementation
yet — that is sprint-02. Ship enough that sprint-02 can plug in
AuthJS with zero additional wiring.

## Scope

1. Create `packages/module-auth/` with `package.json`, `tsconfig.json`,
   and a `src/` skeleton matching `docs/modules/auth/architecture.md`
   §2.
2. Implement `src/adapters/types.ts` — `AuthAdapter`, `AuthUser`,
   `SessionToken`, `ApiKeyInfo` (copy from `17-auth.md` §3, verbatim).
3. Implement `src/adapters/registry.ts` — three functions:
   `registerAuthAdapter`, `setActiveAuthAdapter`, `getAuthAdapter`.
4. Implement `src/schema.ts` — `users`, `auth_sessions`, `api_keys`,
   `password_reset_tokens` tables as documented in
   `docs/modules/auth/database.md`.
5. Implement `src/seed.ts` — idempotent seed for permissions and
   public endpoint flags (9 + 5 rows).
6. Implement `src/get-auth-context.ts` — `getAuthContext(request)`
   helper that reads an attached context field. No actual attachment
   logic yet; the middleware scaffold in step 7 simply sets a stub.
7. Implement `src/middleware.ts` — exports
   `createAuthMiddleware(options)` returning a function suitable for
   Next.js App Router. For this sprint, the middleware only parses
   credentials and attaches a **stub context** if no adapter is
   active. If an adapter is active, it calls `verifyToken` and
   attaches a real context if that returns non-null.
8. Write an ESLint `no-restricted-imports` rule ensuring that
   `packages/module-auth/src/**` never imports `jsonwebtoken`,
   `next-auth`, `argon2`, `bcrypt`, or `hash-wasm`.
9. Write unit tests for the registry (register → get → set active →
   overwrite active fails without registration). Target: 6 tests.

## Out of scope

- Any real adapter implementation.
- Any handler under `src/api/**` — deferred to sprint-02.
- Dashboard UI — sprint-03.
- RLS migration — sprint-04.

## Deliverables

- `packages/module-auth/package.json` with workspace deps on
  `@oven/module-registry`, `drizzle-orm`, `zod`.
- `packages/module-auth/src/index.ts` that re-exports the registry,
  types, middleware factory, and `getAuthContext`.
- `packages/module-auth/tests/registry.test.ts` with 6 tests.
- `packages/module-auth/.eslintrc.json` with the
  `no-restricted-imports` rule.
- `pnpm -F @oven/module-auth test` green.
- `pnpm turbo run typecheck lint --filter=...@oven/module-auth` green.

## Acceptance criteria

- [ ] `packages/module-auth/` builds standalone.
- [ ] 6/6 registry tests pass.
- [ ] `pnpm -w turbo run typecheck` reports no new errors.
- [ ] ESLint rule catches a `import jwt from 'jsonwebtoken'` attempt
      inside `src/api/stub.ts` (a test fixture added temporarily).
- [ ] `src/index.ts` exports exactly: `AuthAdapter`, `AuthUser`,
      `SessionToken`, `ApiKeyInfo`, `AuthContext`,
      `registerAuthAdapter`, `setActiveAuthAdapter`, `getAuthAdapter`,
      `getAuthContext`, `createAuthMiddleware`.
- [ ] The middleware scaffold never imports a provider library.

## Touched packages

- `packages/module-auth` (new)

## Risks

- **R1**: The rate-limit primitive from `@oven/module-registry/rate-limit`
  may not exist yet. *Mitigation*: introduce a minimal
  `rateLimit(key, limit, windowSec)` in a follow-up PR if missing; do
  not block this sprint — rate limiting moves to sprint-02 instead.
- **R2**: `drizzle-kit` generate may complain about integer FKs
  without `references()`. *Mitigation*: run `pnpm drizzle-kit push`
  against the dev DB to verify; accept the warning if it appears —
  Rule 3.1 explicitly wants plain FKs.

## Rule compliance checklist

- `docs/module-rules.md` Rule 3.1 (plain integer FKs) — covered.
- `docs/module-rules.md` Rule 3.2 (idempotent seeds) — covered.
- `docs/module-rules.md` Rule 3.3 (adapter pattern) — covered.
- `docs/modules/17-auth.md` §3 adapter interface — verbatim copy.
- `CLAUDE.md` `import type` — all type-only imports use it.
- `CLAUDE.md` no inline `style={}` — no UI in this sprint.

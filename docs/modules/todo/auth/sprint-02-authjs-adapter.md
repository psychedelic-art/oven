# Sprint 02 — AuthJS adapter (MVP) + API handlers

## Goal

Ship `@oven/auth-authjs` — the MVP adapter package — and wire up the
`/api/auth/*` handlers it backs. By the end of this sprint, a
dashboard user can log in, call `/api/auth/me`, and log out against
a live Neon DB. No dashboard UI yet (sprint-03).

## Scope

1. Create `packages/auth-authjs/` with `package.json` depending on
   `@oven/module-auth`, `next-auth` (for `encode`/`decode` only), and
   `hash-wasm` (Argon2id).
2. Implement `src/index.ts` exporting `authJsAdapter: AuthAdapter`
   with all 8 methods:
   - `verifyToken` — `decode({ token, secret: AUTH_SECRET })` and
     return `AuthUser | null`.
   - `createSession` — `encode` with `maxAge` from
     `JWT_ACCESS_TOKEN_EXPIRY`.
   - `revokeSession` — delete `auth_sessions` row by `sha256(token)`.
   - `verifyApiKey` — lookup `api_keys` by `sha256(key)` with
     expiry/enabled guard.
   - `hashPassword` / `verifyPassword` — Argon2id via `hash-wasm`
     with parameters documented in `secure.md`.
   - `getLoginUrl` / `handleCallback` — return `undefined`
     (not implemented for credentials provider).
3. Implement the `/api/auth/*` handlers listed in `api.md`, backed by
   `packages/module-auth/src/api/**`. Each handler uses
   `getAuthAdapter()` for its single-line operation — no direct
   imports.
4. Implement the middleware in
   `packages/module-auth/src/middleware.ts` end-to-end, following
   `architecture.md` §1–§4. Every error path uses the `AUTH_*` code
   set.
5. Register the adapter in `apps/dashboard/src/lib/modules.ts`:

   ```typescript
   import { registerAuthAdapter } from '@oven/module-auth';
   import { authJsAdapter } from '@oven/auth-authjs';

   registerAuthAdapter(authJsAdapter);
   ```

6. Write unit tests:
   - 6 middleware tests covering every branch of `architecture.md`
     §1 (public bypass, API key, Bearer, cookie, no credential,
     expired session).
   - 4 handler tests for `login`, `logout`, `me`, `refresh`.
   - 1 adapter test proving Argon2id roundtrip.
7. Write integration tests that hit `POST /api/auth/login` against a
   seeded test DB and assert the token verifies via
   `adapter.verifyToken`.

## Out of scope

- Dashboard UI — sprint-03.
- API keys CRUD endpoints — sprint-03.
- Password reset flow — sprint-03.
- RLS migration — sprint-04.

## Deliverables

- `packages/auth-authjs/` package.
- `packages/module-auth/src/api/` with 4 handlers (`login`, `logout`,
  `me`, `refresh`).
- `packages/module-auth/src/middleware.ts` fully wired.
- `apps/dashboard/src/lib/modules.ts` registers the adapter.
- `packages/module-auth/tests/middleware.test.ts` (6 tests).
- `packages/module-auth/tests/handlers/*.test.ts` (4 tests).
- `packages/auth-authjs/tests/password.test.ts` (1 test).
- `pnpm -w turbo run test --filter=...@oven/module-auth --filter=...@oven/auth-authjs`
  green.

## Acceptance criteria

- [ ] `POST /api/auth/login` returns a working access token against a
      seeded test user.
- [ ] `GET /api/auth/me` with the returned token returns the context.
- [ ] `POST /api/auth/logout` invalidates the session and a follow-up
      `GET /api/auth/me` returns `401 AUTH_INVALID_TOKEN`.
- [ ] 11/11 new tests green.
- [ ] Typecheck delta: 0 new errors.
- [ ] `packages/module-auth/src/**` has zero imports of
      `jsonwebtoken`, `next-auth`, `argon2`, `bcrypt`, `hash-wasm`.

## Touched packages

- `packages/module-auth` (new handlers + middleware)
- `packages/auth-authjs` (new)
- `apps/dashboard/src/lib/modules.ts` (registration)

## Risks

- **R1**: `hash-wasm` initialization has async first-load cost.
  *Mitigation*: eager-initialize in `authJsAdapter.hashPassword`
  lazy-loader.
- **R2**: `AUTH_SECRET` may not be set in CI. *Mitigation*: fail
  fast with `AuthConfigError`; add a `.env.test.local.example` with
  a deterministic test secret.
- **R3**: Cookie vs. Bearer token precedence differs between
  Next.js App Router and Pages Router. *Mitigation*: handle App
  Router only (the dashboard is already App Router).

## Rule compliance checklist

- `docs/module-rules.md` Rule 3.3 (adapter pattern) — satisfied.
- `docs/module-rules.md` Rule 10.1 (`parseListParams`/`listResponse`)
  — handler shells follow the convention (no list handlers in this
  sprint, but the error shapes match).
- `docs/modules/17-auth.md` — all of §4 through §6 implemented.
- `CLAUDE.md` `import type` — enforced on every type import.
- `CLAUDE.md` zustand — not used in this sprint.

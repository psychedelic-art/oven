# Module Auth — Detailed Requirements

Grouped by sprint. Each requirement is written as an acceptance-style
statement so test code can hit it directly.

## R1 — Package boundaries

- R1.1 `packages/module-auth/src/**` MUST NOT import `jsonwebtoken`,
  `next-auth`, `argon2`, `bcrypt`, or `hash-wasm`. Enforced by a
  `no-restricted-imports` ESLint rule.
- R1.2 The adapter package `packages/auth-authjs/**` MUST depend on
  `@oven/module-auth` only through `import type { AuthAdapter }`.
- R1.3 The adapter registry MUST treat the first `registerAuthAdapter`
  call as the default active adapter; subsequent calls add to the map
  without replacing the active one.
- R1.4 `setActiveAuthAdapter(name)` MUST throw if `name` is not
  registered. Error message MUST include the name.
- R1.5 `getAuthAdapter()` MUST throw when called before any adapter
  has been registered.

## R2 — Credential extraction

- R2.1 Middleware MUST check credentials in this exact order:
  `X-API-Key` → `X-Session-Token` → `Authorization: Bearer` → session
  cookie. The first present wins; lower-priority headers are ignored.
- R2.2 Requests with **no** credential and **no** public-endpoint
  entry MUST receive `401 AUTH_MISSING_CREDENTIAL`.
- R2.3 Requests to paths flagged `isPublic = true` in
  `api_endpoint_permissions` MUST bypass all credential checks.
- R2.4 An expired `auth_sessions` row MUST surface as
  `AUTH_EXPIRED_TOKEN`, never as `AUTH_INVALID_TOKEN`.

## R3 — Active tenant resolution

- R3.1 If `X-Tenant-Id` is present and the user is a member of that
  tenant, it wins.
- R3.2 If `X-Tenant-Id` is present but the user is NOT a member, the
  response MUST be `403 AUTH_TENANT_FORBIDDEN`. The middleware MUST
  NOT silently fall back to a different tenant.
- R3.3 When `X-Tenant-Id` is absent, `defaultTenantId` wins if the
  user still has a membership in that tenant.
- R3.4 Otherwise the first membership ordered by `joinedAt ASC` wins.
- R3.5 Users with zero memberships MUST still authenticate
  successfully with `tenantId = null`; only routes that call
  `requireTenant()` get `403 AUTH_TENANT_REQUIRED`.

## R4 — Session lifecycle

- R4.1 `createSession` MUST store the token as `sha256(plaintext)`
  hex. Plaintext MUST NOT appear in the DB.
- R4.2 Refresh-token rotation MUST delete the old row and insert a
  new one atomically in one transaction.
- R4.3 Reuse of a rotated refresh token MUST delete the current
  session row for the user and return `AUTH_INVALID_TOKEN`.
- R4.4 `MAX_SESSIONS_PER_USER` MUST be enforced at session creation
  by deleting the oldest row when count + 1 > limit.
- R4.5 Logout MUST remove the current session row and MUST NOT affect
  sibling sessions.

## R5 — API keys

- R5.1 On create, the plaintext key MUST be returned in the response
  body and MUST NOT be persisted anywhere except `sha256` hash.
- R5.2 The `keyPrefix` column MUST be exactly the first 8 characters
  of the plaintext.
- R5.3 Revocation MUST hard-delete the row and emit
  `auth.apiKey.revoked`.
- R5.4 API-key verification MUST reject expired keys regardless of
  the `enabled` flag state.
- R5.5 List responses MUST use `parseListParams` + `listResponse`
  from `@oven/module-registry/api-utils` (Rule 10.1 of
  `docs/module-rules.md`). Sort columns MUST go through the
  `getOrderColumn` allowlist helper.

## R6 — Password handling

- R6.1 Password hashing MUST run through `authAdapter.hashPassword`.
  If the active adapter does not implement it, the operation MUST
  throw a typed `AdapterCapabilityError`.
- R6.2 Password resets MUST invalidate every existing session for the
  user.
- R6.3 `forgot-password` MUST always return `200` regardless of
  whether the email exists (no user enumeration).
- R6.4 `reset-password` tokens are single-use: `usedAt` is set on
  success; re-use MUST return `AUTH_INVALID_TOKEN`.

## R7 — Events

- R7.1 The 8 events in `17-auth.md` §10 MUST be emitted with exactly
  the documented payload shapes. No extra fields, no missing fields.
- R7.2 Event emission MUST NOT block the HTTP response — it fires
  after the response is written using the module-registry event bus
  (already async in its current implementation).

## R8 — Styling (CLAUDE.md compliance)

- R8.1 No dashboard UI file in `apps/dashboard/src/components/auth/**`
  may contain `style={{` literals.
- R8.2 All styling uses the MUI `sx` prop.
- R8.3 All type-only imports use `import type`.
- R8.4 Zustand stores introduced by this module (if any) use the
  factory + React context pattern, not singleton stores.

## R9 — Security (OWASP Top 10)

- R9.1 **A01 Broken Access Control**: RLS + handler-layer
  tenant filtering (defence in depth). Tested in `secure.md`.
- R9.2 **A02 Cryptographic Failures**: Argon2id via `hash-wasm`
  with `m=19456, t=2, p=1` minimum. Salt is 16 random bytes.
- R9.3 **A07 Identification & Authentication Failures**: rate limit
  login to 5 attempts per minute per IP + email combo. Reset tokens
  single-use, 30-minute expiry.
- R9.4 **A04 Insecure Design**: reuse detection on refresh tokens
  triggers full session invalidation, not silent rotation.
- R9.5 **A05 Security Misconfiguration**: `AUTH_SECRET` is required
  at startup; missing value raises a fail-fast error before any
  request is served.

## R10 — Tenancy

- R10.1 Every query that writes or reads `api_keys`, `auth_sessions`,
  or `users` outside `/api/auth/me` MUST include an explicit tenant
  filter when the caller is not a platform admin.
- R10.2 Tenant switching is performed **only** through the auth
  middleware's `X-Tenant-Id` path. Handlers never read the header
  directly.

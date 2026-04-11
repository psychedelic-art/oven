# Module Auth — Architecture

## 1. Request Lifecycle

Every API request passes through a single middleware installed at
`apps/dashboard/src/middleware.ts`. The middleware is intentionally
thin: it never talks to JWT, Argon2, or any provider SDK directly —
it delegates to the active `AuthAdapter` and composes the result with
`module-roles` + `module-tenants`.

```
Request ──▶ Middleware ──▶ Public endpoint?  ──yes──▶ skip auth
               │                │
               │               no
               │                ▼
               │        Extract credential (in order):
               │          1. X-API-Key header
               │          2. X-Session-Token header (anonymous widget)
               │          3. Authorization: Bearer <token>
               │          4. Session cookie (next-auth.session-token)
               │                │
               │                ▼
               │        adapter.verifyApiKey / adapter.verifyToken
               │                │
               │          ┌─────┴─────┐
               │       success        failure
               │          │               │
               │          ▼               ▼
               │    Resolve user         401
               │    + tenant memberships
               │    (module-tenants)
               │                │
               │                ▼
               │    Resolve role permissions
               │    (module-roles — flattened slugs)
               │                │
               │                ▼
               │    Pick active tenant:
               │      X-Tenant-Id header ▶ defaultTenantId ▶ first membership
               │                │
               │                ▼
               │    Attach AuthContext to request
               ▼
         API handler:
           const auth = getAuthContext(request);
           if (!auth.permissions.includes('kb-entries.create')) return forbidden();
```

The middleware **never throws** to callers — every failure path goes
through `unauthorized()` / `forbidden()` helpers from
`@oven/module-registry/api-utils` so response shapes stay uniform.

## 2. Adapter Boundary

```
packages/module-auth/
 ├── src/
 │   ├── middleware.ts            ← sits in the Next.js pipeline
 │   ├── get-auth-context.ts      ← reads attached context from request
 │   ├── auth-utils.ts            ← thin wrappers over the active adapter
 │   ├── adapters/
 │   │   ├── types.ts             ← AuthAdapter, AuthUser, SessionToken, ApiKeyInfo
 │   │   └── registry.ts          ← registerAuthAdapter / setActiveAuthAdapter / getAuthAdapter
 │   ├── api/                     ← login, logout, refresh, me, forgot/reset, api-keys, sessions
 │   ├── schema.ts                ← users, auth_sessions, api_keys, password_reset_tokens
 │   ├── seed.ts                  ← permissions + public endpoint flags
 │   └── index.ts
 └── package.json

packages/auth-authjs/             ← MVP adapter package (separate)
 ├── src/
 │   ├── index.ts                 ← exports authJsAdapter: AuthAdapter
 │   ├── encode.ts                ← wraps NextAuth encode/decode
 │   └── password.ts              ← argon2 via hash-wasm (no native deps)
 └── package.json
```

Key invariant: **`packages/module-auth/src/**` must never import
`jsonwebtoken`, `next-auth`, `argon2`, or any provider SDK.** Those
imports belong in the adapter packages. Enforced by an ESLint rule in
sprint-01 and re-verified in acceptance.

## 3. Active Tenant Resolution

1. If the request has an `X-Tenant-Id` header, use it **if and only
   if** the user is a member of that tenant (checked against
   `tenant_members` loaded from `module-tenants`).
2. Otherwise, fall back to `user.defaultTenantId` if present.
3. Otherwise, use the first membership row ordered by `joinedAt ASC`.
4. If there are no memberships the auth context is still valid but
   `tenantId` is `null` — platform-admin routes can still run; all
   other routes return `403 TENANT_REQUIRED`.

## 4. Error Taxonomy

All errors returned by `module-auth` follow a closed set of codes so
the dashboard UI can switch on them without parsing strings:

| Code                     | HTTP | When                                   |
|--------------------------|------|-----------------------------------------|
| `AUTH_MISSING_CREDENTIAL`| 401  | No credential in request                |
| `AUTH_INVALID_TOKEN`     | 401  | Adapter returned `null`                 |
| `AUTH_EXPIRED_TOKEN`     | 401  | Expiry < now (DB or adapter result)     |
| `AUTH_USER_INACTIVE`     | 401  | Valid token but `user.status != active` |
| `AUTH_TENANT_REQUIRED`   | 403  | Route requires tenancy, user has none   |
| `AUTH_TENANT_FORBIDDEN`  | 403  | Requested tenant not in memberships     |
| `AUTH_PERMISSION_DENIED` | 403  | Permission not in flattened set         |

Each is emitted via `forbidden(code)` / `unauthorized(code)` so clients
key off the code, not the message.

## 5. Integration With Other Modules

- **`module-roles`** — after credential verification the middleware
  calls `getPermissionsForUser(userId, tenantId)` which returns a flat
  `string[]` of permission slugs. Cached per-request; never cached
  across requests (permissions can change mid-session when an admin
  edits a role).
- **`module-tenants`** — `getMembershipsForUser(userId)` is called on
  login and on explicit tenant switch. Memberships are attached to the
  context but **not** cached in Redis — the DB lookup is cheap and
  staleness is unacceptable for tenancy decisions.
- **`module-config`** — reads `JWT_ACCESS_TOKEN_EXPIRY`,
  `JWT_REFRESH_TOKEN_EXPIRY`, `ALLOW_SELF_REGISTRATION`,
  `PASSWORD_MIN_LENGTH`, and `MAX_SESSIONS_PER_USER` via the cascade
  resolver. None are instance-scoped.
- **`module-notifications`** — emits `auth.user.registered` →
  notifications listens and dispatches the welcome email through the
  active notification adapter.

## 6. Concurrency & Session Limits

`MAX_SESSIONS_PER_USER` (default `5`) is enforced at session creation
time. On overflow, the oldest session (by `createdAt`) is deleted —
**not** the least-recently-used one — so audit logs remain clean.
Refresh-token rotation replaces the row in place; it does not count
toward the limit.

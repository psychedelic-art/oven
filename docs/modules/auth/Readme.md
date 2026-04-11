# Module Auth — Overview

> **Package**: `packages/module-auth/`
> **Name**: `@oven/module-auth`
> **Dependencies**: `module-registry`, `module-roles`
> **Status**: Planned — canonical doc scaffold in place, package not yet implemented
> **Spec**: [`docs/modules/17-auth.md`](../17-auth.md)

---

## What It Does

`module-auth` is the **authentication and authorization** module for OVEN.
It provides identity verification, session management, API key handling,
and tenant-scoped access control through a pluggable **adapter pattern**
that mirrors `module-notifications` (Rule 3.3 of `docs/module-rules.md`).

Four credential shapes are supported out of the box:

| Strategy        | Use case                                      | Transport                         |
|-----------------|-----------------------------------------------|-----------------------------------|
| **JWT**         | Dashboard login (email + password)            | `Authorization: Bearer <token>`   |
| **Session**     | Persistent dashboard sessions                 | HTTP-only cookie                  |
| **API Key**     | Webhooks, external integrations, CI/CD        | `X-API-Key: <key>`                |
| **Session Token** | Anonymous chat widget users                 | `X-Session-Token: <token>`        |

AuthJS is the MVP adapter. Firebase and Auth0 adapters are planned but not
in the initial package set.

---

## Why It Exists

Before `module-auth`, each Next.js route that needed protection re-implemented
token parsing, password verification, and tenant resolution inline. That
produced:

1. **Inconsistent failure shapes** — some routes return 401, others 500,
   some leak provider internals in the body.
2. **Un-testable coupling** — handlers imported `jsonwebtoken` and `argon2`
   directly, making it impossible to swap providers or mock credentials in
   unit tests.
3. **Tenancy bugs** — the "active tenant" was resolved differently in every
   handler (header vs. query vs. JWT claim), which is the root cause of
   several cross-tenant leakage findings in `oven-bug-sprint/README.md`.

Auth centralises all of this into a single middleware pipeline that:

- Delegates credential verification to an `AuthAdapter`.
- Resolves roles + permissions from `module-roles`.
- Resolves tenant memberships from `module-tenants`.
- Attaches a typed `AuthContext` to the request.

Handlers then call `getAuthContext(request).permissions.includes(...)` and
never touch JWT or password libraries directly.

---

## Architectural Position

```
      Dashboard UI (React Admin)        Portal / Chat Widget        External API clients
             |                                  |                            |
             v                                  v                            v
   POST /api/auth/login             POST /api/auth/session-token     X-API-Key header
             \                                  |                            /
              \-------------------------------> +---------------------------/
                                                v
                                    +---------------------------+
                                    |   module-auth middleware  |
                                    |  (runs on every request)  |
                                    +---+-------+---------+-----+
                                        |       |         |
                            adapter.verifyToken |         adapter.verifyApiKey
                                        |       |         |
                                        v       v         v
                        +------------+  +--------------+  +-----------+
                        | AuthJS     |  | Firebase     |  | Auth0     |
                        | adapter    |  | adapter (*)  |  | adapter(*)|
                        +-----+------+  +------+-------+  +-----+-----+
                              |                |                |
                              +----------------+----------------+
                                               |
                                               v
                                +----------------------------+
                                |  module-roles + tenants    |
                                |  (permission resolution)   |
                                +--------------+-------------+
                                               |
                                               v
                                 Handler sees AuthContext
                                 with userId, tenantId,
                                 permissions[], authMethod.
```

`(*)` Firebase and Auth0 adapters are planned — not shipped in the MVP.

---

## Key Design Decisions

- **Adapter delegation only** — `module-auth` never imports `jsonwebtoken`
  or `argon2`. Those are implementation details of the adapter package.
- **First registered adapter becomes the active one**, matching the
  notifications module's registry. `setActiveAuthAdapter(name)` allows
  tests to swap.
- **API-key verification lives in the adapter too** — even though it is
  DB-only, it sits behind the adapter boundary so a Firebase tenant can
  opt into Firebase-verified keys later.
- **Anonymous session tokens are a separate credential shape**, not a
  degenerate JWT. They are issued by `module-chat` for widget users and
  carry no user/tenant claims until promoted.
- **Tenant resolution is middleware-layer**, not handler-layer. Handlers
  never read `X-Tenant-Id` themselves.
- **Password hashing is optional on the adapter interface** (`hashPassword?`)
  so SSO-only providers throw a typed error instead of silently accepting
  a password flow.

---

## Where To Go Next

| Topic                                         | Doc                                            |
|-----------------------------------------------|------------------------------------------------|
| Database schema                               | [`database.md`](./database.md)                 |
| API endpoints                                 | [`api.md`](./api.md)                           |
| Middleware + adapter flow                     | [`architecture.md`](./architecture.md)         |
| Detailed requirements checklist               | [`detailed-requirements.md`](./detailed-requirements.md) |
| `ModuleDefinition`, types, contracts          | [`module-design.md`](./module-design.md)       |
| Dashboard UI (login, profile, API keys)       | [`UI.md`](./UI.md)                             |
| RLS, threat model, password storage           | [`secure.md`](./secure.md)                     |
| External references + prior art               | [`references.md`](./references.md)             |
| Use-case coverage                              | [`use-case-compliance.md`](./use-case-compliance.md) |
| Authoring prompts / worked examples           | [`prompts.md`](./prompts.md)                   |

---

## Status & Sprint Plan

Active work lives under
[`docs/modules/todo/auth/`](../todo/auth/README.md). Sprint plan:

1. **sprint-00**: Discovery — audit of every file in `apps/dashboard/**`
   that currently imports `jsonwebtoken`, `next-auth`, or `argon2`.
2. **sprint-01**: Foundation — `@oven/module-auth` package with
   adapter registry, schema, and middleware scaffold.
3. **sprint-02**: `@oven/auth-authjs` adapter package implementing the
   full `AuthAdapter` interface against NextAuth.
4. **sprint-03**: Dashboard UI — login page, profile, API keys CRUD.
5. **sprint-04**: Acceptance — RLS migration, permission seed,
   cut-over of existing handlers to `getAuthContext`.

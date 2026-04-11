# Module Auth — Todo

> **Package**: `packages/module-auth/` (not yet implemented)
> **Spec**: [`docs/modules/17-auth.md`](../../17-auth.md)
> **Canonical docs**: [`docs/modules/auth/`](../../auth/Readme.md)
> **Current sprint**: [`sprint-00-discovery.md`](./sprint-00-discovery.md)

## What It Is

`module-auth` is the **authentication and authorization** module that
provides identity verification, session management, API key handling,
and tenant-scoped access control through a pluggable adapter pattern.
AuthJS is the MVP adapter; Firebase and Auth0 are planned follow-ups.

The module is the single place where credential shape, token
verification, password hashing, and tenancy resolution live. Every
dashboard handler that today imports `jsonwebtoken` or `next-auth`
directly will route through `getAuthContext(request)` after this
module lands.

## Why It Is Foundational

- Every other module (`chat`, `knowledge-base`, `notifications`,
  `workflow-agents`, `ai`) depends on a uniform `AuthContext`.
- Eliminates per-route token parsing and per-route tenancy logic,
  which is the root cause of several cross-tenant findings in
  `oven-bug-sprint/README.md` § 3.
- Provides the only blessed place to add new auth strategies
  (Firebase, Auth0) without rewriting handlers.
- Feeds `module-roles` and `module-tenants` a typed user context.

## Status Snapshot

| Area                                                | State                         |
|-----------------------------------------------------|-------------------------------|
| Spec doc (`17-auth.md`)                              | Complete                       |
| Package code (`packages/module-auth/src/`)           | **Not started** — sprint-01    |
| Adapter package (`packages/auth-authjs/`)            | **Not started** — sprint-02    |
| Unit tests                                           | **None** — seeded in sprint-01 |
| Dashboard UI components                              | **None** — sprint-03           |
| Canonical doc set (`docs/modules/auth/`)             | ✅ Scaffolded this pass        |
| Registration in `apps/dashboard/src/lib/modules.ts`  | Pending — sprint-03            |
| RLS migration                                        | Documented — sprint-04         |
| Cut-over of existing handlers to `getAuthContext`   | Pending — sprint-04            |

## Sprints

| #  | File                                            | Status    |
|----|-------------------------------------------------|:---------:|
| 00 | [`sprint-00-discovery.md`](./sprint-00-discovery.md) | Ready |
| 01 | [`sprint-01-foundation.md`](./sprint-01-foundation.md) | Ready |
| 02 | [`sprint-02-authjs-adapter.md`](./sprint-02-authjs-adapter.md) | Ready |
| 03 | [`sprint-03-dashboard-ui.md`](./sprint-03-dashboard-ui.md) | Ready |
| 04 | [`sprint-04-acceptance.md`](./sprint-04-acceptance.md) | Ready |

See [`STATUS.md`](./STATUS.md) for QA outcomes, backup branches, and
merge commits once the module enters active development.

## Cross-links

- Top-level spec: [`docs/modules/17-auth.md`](../../17-auth.md)
- Canonical docs: [`docs/modules/auth/Readme.md`](../../auth/Readme.md)
- Todo index: [`docs/modules/todo/README.md`](../README.md)
- Progress: [`docs/modules/todo/PROGRESS.md`](../PROGRESS.md)
- Adapter pattern reference: `packages/module-notifications/src/adapters/`

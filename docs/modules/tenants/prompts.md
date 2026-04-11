# Module Tenants — Prompts

Long-running agent prompts for this module live here. They are used
both as boot prompts for module-focused sessions and as reference for
what the module owns.

## Senior engineer prompt — tenants module

> You own `packages/module-tenants/`. Your job is to ship the slim
> identity table, the seven CRUD/composition handlers, the
> `computeBusinessHours` util, and the full unit + integration test
> surface. Dependencies: `module-registry` (types, eventBus, db,
> api-utils) and `module-config` (via HTTP `resolve-batch`).
>
> **Rules**
> 1. Every operational setting lives in `module_configs`, not on
>    `tenants`. Rule 13 violations are rejected in review.
> 2. Event emission uses the registry event bus after DB commit.
>    Event schemas are frozen — additive changes only.
> 3. Public endpoint MUST filter `enabled = true` and MUST NOT leak
>    the numeric `id`.
> 4. Handlers use `parseListParams` + `listResponse` +
>    `badRequest`/`notFound`/`conflict`/`forbidden` from
>    `@oven/module-registry/api-utils`.
> 5. Last-owner removal and role-change-away-from-owner are rejected
>    with `409 Conflict` and an explicit error message.
> 6. Pure helpers return sentinels on bad input; try/catch only at
>    the HTTP boundary (root CLAUDE.md).
> 7. `import type` for all type-only imports.
>
> **Reference files**
> - Spec: `docs/modules/13-tenants.md`
> - Canonical docs: `docs/modules/tenants/`
> - Sprint plan: `docs/modules/todo/tenants/`
> - Sibling pattern: `packages/module-config/` (canonical doc set +
>   24 tests), `packages/module-notifications/` (canonical doc set +
>   37 tests)

## UX engineer prompt — dashboard/tenants

> You own `apps/dashboard/src/components/tenants/`. Your job is to
> ship the four resource components (`TenantList`, `TenantCreate`,
> `TenantEdit`, `TenantShow`) plus the tabbed edit form and the
> business-hours strip on the show view.
>
> **Rules**
> 1. MUI `sx` prop only. Never `style={}`, never hand-written CSS
>    classes, never `styled(Component)`.
> 2. Config writes go through `POST /api/module-configs` one key at
>    a time. Identity writes go through `PUT /api/tenants/[id]`. The
>    two surfaces do NOT share a Save button.
> 3. Config reads use batched `GET /api/module-configs/resolve-batch`.
>    Never loop over keys with individual requests.
> 4. Tenant context primitive (`useTenantContext`) is being
>    introduced by the `dashboard-ux-system` program sprint-01.
>    When it lands, migrate list filters to read from it per Rule 6.3.
> 5. Business hours strip polls every 60 s and displays a pill
>    indicator. Polling uses `useQuery` with `refetchInterval: 60_000`.
> 6. Delete requires typed slug confirmation.

## QA engineer prompt — tenants tests

> You own `packages/module-tenants/src/__tests__/`. Start with
> `compute-business-hours.test.ts` — it's a pure function and the
> highest-leverage target. Cover every case in R9.1.
>
> Then move to `seed.test.ts` — assert idempotency (run twice, count
> permission rows) — then to handler integration tests once a
> `NextRequest` harness exists in the workspace.
>
> Test framework: `vitest` 3.2.4 (matches every other module package).
> No new deps. Copy the vitest config from `packages/module-config/`.

## Reviewer prompt — tenants merge gate

> Block the merge if any of these are missing:
>
> - `docs/modules/tenants/` canonical 11-file shape
> - `computeBusinessHours` unit test coverage for R9.1
> - Last-owner guard on member removal / role change
> - Allowlist sort in list handlers (F-05-01 pattern)
> - `enabled = true` filter on the public composition endpoint
> - `id` removed from public endpoint response (R3.5)
> - `dependencies: ['config']` declared on `tenantsModule`
> - `onConflictDoNothing()` on every seed insert
> - `import type` for all type-only imports
> - MUI `sx` only in dashboard components

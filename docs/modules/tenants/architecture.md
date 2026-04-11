# Module Tenants — Architecture

## Layering

```
 ┌─────────────────────────────────────────────────────────────┐
 │ apps/dashboard                                              │
 │   src/components/tenants/                                   │
 │     TenantList.tsx  TenantCreate.tsx                        │
 │     TenantEdit.tsx  TenantShow.tsx                          │
 │                                                             │
 │   src/lib/modules.ts → registry.register(tenantsModule)     │
 └────────────────────┬────────────────────────────────────────┘
                      │ React Admin dataProvider → /api/[...route]
                      ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ packages/module-tenants (@oven/module-tenants)              │
 │                                                             │
 │   src/index.ts          ModuleDefinition                    │
 │   src/schema.ts         tenants, tenantMembers              │
 │   src/seed.ts           permissions + public endpoint       │
 │   src/types.ts          TS types for external consumers     │
 │   src/utils.ts          computeBusinessHours                │
 │                                                             │
 │   src/api/                                                  │
 │     tenants.handler.ts          GET, POST                   │
 │     tenants-by-id.handler.ts    GET, PUT, DELETE            │
 │     tenants-by-slug.handler.ts  GET                         │
 │     tenants-public.handler.ts   GET (composition)           │
 │     tenant-members.handler.ts   GET, POST                   │
 │     tenant-members-by-id.handler.ts GET, DELETE             │
 │     tenants-business-hours.handler.ts GET                   │
 └────────────────────┬────────────────────────────────────────┘
                      │
       ┌──────────────┼─────────────────────────┐
       ▼              ▼                         ▼
  ┌──────────┐  ┌─────────────┐          ┌────────────┐
  │ Postgres │  │ module-config│         │ registry    │
  │ (neon)   │  │ resolve-batch│         │ eventBus    │
  └──────────┘  └─────────────┘          └────────────┘
```

## Package boundaries

- **Depends on**: `@oven/module-registry` (types, eventBus, api-utils,
  db accessor) and `@oven/module-config` (indirectly — via the
  `/api/module-configs/resolve-batch` HTTP call, not a direct import).
- **Does NOT depend on**: any other module package. Handlers reach
  `module-config` through HTTP, not through a workspace dep, so the
  package graph stays acyclic. (Rule 3.1 — no cross-module imports.)
- **Consumed by**: `module-auth` (tenant resolution on session),
  `module-chat`, `module-agent-core`, `module-workflow-agents`,
  `module-ui-flows`, `module-notifications`, `module-files`,
  `module-knowledge-base`. All consumers read via HTTP or via
  `tenantsSchema.tenants` for joined SQL in the same package.

## Request lifecycle — public endpoint

`GET /api/tenants/[slug]/public` is the only route that touches multiple
modules in a single request. Its lifecycle:

1. Next.js router hits the `[...route]` catch-all.
2. Registry resolves the route to `tenantsModule.apiHandlers['tenants/[slug]/public'].GET`.
3. Handler runs:
   a. `SELECT * FROM tenants WHERE slug = $1 AND enabled = true` (~1ms).
   b. `fetch('/api/module-configs/resolve-batch?...')` — one round trip,
      14 keys, resolved via module-config's 5-tier cascade.
   c. `computeBusinessHours(schedule, timezone)` — pure CPU, no I/O.
   d. Assemble response JSON.
4. Response streamed back.

The endpoint is intentionally a **composition**, not a join. Reasons:

- The 5-tier cascade has non-trivial logic (module-config has 24 unit
  tests covering it). Reimplementing it in raw SQL here would duplicate
  that logic and drift.
- A single module owning the cascade means one bug fix propagates
  everywhere.
- Performance is fine: one SELECT + one HTTP call to a co-located
  module, both under ~5ms p50 on Neon.

## Business-hours utility

```typescript
computeBusinessHours(schedule, timezone): boolean
```

- **Pure function**. No I/O. Fully unit-testable.
- Uses `Intl.DateTimeFormat` with the tenant timezone to get the current
  weekday and time, then does a string comparison against the
  `{ open, close }` window for that weekday.
- Returns `false` on any missing/invalid input (null schedule, missing
  weekday entry, unknown timezone).
- Edge cases handled: closed days (weekday missing from schedule),
  schedule that wraps past midnight (current impl does NOT support this
  — tracked as a sprint-04 enhancement), comparing `"08:00"` vs `"8:00"`
  (the `hour12: false` formatter always zero-pads).

## Event emission

Events are emitted at the end of the handler's successful transaction,
**after** `commit()`. If emission throws, the handler catches and logs
but does not retry — downstream consumers are expected to be idempotent
and the event bus guarantees at-least-once delivery for persisted
events. The event-bus schema declarations live in `src/index.ts`.

## Error-handling posture

Per the root `CLAUDE.md` "error handling only at boundaries" rule, the
only try/catch blocks in this package are in the API handlers (the
boundary between HTTP and Drizzle). Internal helpers like
`computeBusinessHours` return falsy sentinels on bad input, not throws.

## Concurrency

- Tenant creation is protected by the `slug` UNIQUE constraint at the
  DB level — duplicate slug attempts return `409 Conflict` from
  `tenants.handler.POST`.
- Member-addition uses `tm_tenant_user` UNIQUE compound index — duplicate
  membership attempts return `409 Conflict`.
- No explicit row locks. React Admin's optimistic concurrency via the
  `updated_at` check is not wired yet — tracked as sprint-03 security
  hardening.

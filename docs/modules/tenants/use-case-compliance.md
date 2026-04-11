# Module Tenants — Use Case Compliance

Tracks how this module satisfies the admin use cases in
[`docs/use-cases.md`](../../use-cases.md).

## UC 2 — Onboard a new tenant

**Cross-module**: Tenants + Config + Subscriptions

| Step | Module | Surface |
|---|---|---|
| 1. Platform admin clicks "Create tenant" | tenants | `TenantCreate` |
| 2. Enters name + slug | tenants | `POST /api/tenants` |
| 3. Registry emits `tenants.tenant.created` | tenants | event bus |
| 4. Subscriptions attaches free-tier plan | subscriptions | listener on `tenants.tenant.created` |
| 5. Admin fills Config tab (tone, schedule, branding) | config | `POST /api/module-configs` (one per key) |
| 6. Admin invites owner user | tenants | `POST /api/tenant-members` with `role: 'owner'` |
| 7. Registry emits `tenants.member.added` | tenants | event bus |

**Compliance**: PASS — every step exists end-to-end. The Config tab
is wired. The subscriptions listener is wired
(`packages/module-subscriptions/src/listeners/`).

**Gap**: sprint-02 needs to add an integration test that walks all 7
steps against a scratch Neon database.

## UC 3 — Configure tenant settings

**Cross-module**: Tenants + Config

| Step | Surface |
|---|---|
| Open `TenantEdit` → Config tab | `apps/dashboard/src/components/tenants/TenantEdit.tsx` |
| `useQuery` calls `resolve-batch` with 14 keys | `GET /api/module-configs/resolve-batch` |
| Admin edits fields, field-blur triggers upsert | `POST /api/module-configs` |
| Page reload shows the new effective values | 5-tier cascade |

**Compliance**: PASS. Config reads use batched resolve. Writes use the
per-key upsert pattern documented in [UI.md](./UI.md#config-tab-readwrite-pattern).

## UC 9 — Check tenant full profile

**Cross-module**: Tenants + Config + Subscriptions

| Step | Surface |
|---|---|
| Open `TenantShow` | `TenantShow.tsx` |
| Identity card reads from `tenants` | `GET /api/tenants/[id]` |
| Config summary reads from `module-config` | `GET /api/module-configs/resolve-batch` |
| Active subscription reads from `module-subscriptions` | `GET /api/subscriptions?tenantId=<id>` |
| Business hours strip polls every 60 s | `GET /api/tenants/[id]/business-hours` |

**Compliance**: PASS for identity + config + business hours. Subscription
section depends on `module-subscriptions` having its own subscription
read endpoint — confirmed in its handler set.

## UC 11 — Public portal access (chat widget / embedded portal)

**Module**: Tenants only (public endpoint)

| Step | Surface |
|---|---|
| Portal mounts with `?tenant=acme-dental` | client |
| Client calls `GET /api/tenants/acme-dental/public` | `tenants-public.handler.GET` |
| Server runs 1 SELECT + 1 resolve-batch + compute business hours | handler |
| Client renders brand, schedule, welcome message | portal |

**Compliance**: PASS. Back-compat response shape is verified against
the portal consumer contract.

**Gap**: R3.5 — `id` should not be in the response. Currently leaked.
Tracked sprint-03.

## Rule compliance

| Rule | Status |
|---|---|
| R1 Module contract | PASS — `ModuleDefinition` exported, registered via `registry.register()` |
| R2 Dependency order | PASS — `dependencies: ['config']`; registry throws at registration if config is missing |
| R3 No cross-module imports | PASS — module-config is consumed via HTTP, not via workspace dep |
| R4 Drizzle schema | PASS — plain integer FKs, no `references()` |
| R5 Seed idempotency | PASS — all inserts use `onConflictDoNothing()` |
| R6 CRUD + tenant filtering UI | PARTIAL — CRUD exists; tenant-filter primitive gap routed to `dashboard-ux-system` sprint-03 |
| R7 Event schema typing | PASS — `EventSchemaMap` exported from `src/index.ts` |
| R8 Config cascade | PASS — config reads via `resolve-batch` |
| R9 Permissions | PASS — 7 permissions seeded idempotently |
| R10 Public endpoints whitelisted | PASS — `tenants/[slug]/public` seeded in `api_endpoint_permissions` |
| R11 Chat block | PASS — 3 action schemas exposed |
| R12 TypeScript strict | PASS — `import type` for all type-only imports |
| R13 Config centralization | PASS — 15 `configSchema` entries, zero config columns on the `tenants` table |

## Known use-case gaps

- **UC 7 — Tenant suspension** is not explicitly supported. Soft delete
  via `enabled = false` exists, but there is no "suspend reason",
  "suspended at", or "restore before" metadata. Tracked as a
  product-decision question in sprint-04.

- **UC 10 — Tenant cloning** is not supported. Platform admins cannot
  duplicate a tenant with its config preset. Product-decision open.

These gaps are intentional and not blockers for the current sprint plan.

# Module Config -- Overview

> **Package**: `packages/module-config/`
> **Name**: `@oven/module-config`
> **Dependencies**: `module-registry`
> **Status**: Phase 0 (Core Infrastructure) -- Package implemented, tests + UI in flight
> **Spec**: [`docs/modules/20-module-config.md`](../20-module-config.md)

---

## What It Does

Module Config is the **platform-wide configuration store** for OVEN. Every
module that needs tenant-customizable settings -- tone, schedule, API keys,
thresholds, templates, feature flags -- declares them in its `configSchema`
and reads/writes them through a single API that this module owns.

The store is a single Postgres table, `module_configs`, with a tenant-aware
5-tier cascade resolver. Callers ask "what is the effective value of this
key for this tenant in this scope?" and receive the value plus a `source`
marker that tells them which tier won.

---

## Why It Exists

Before Config, every module that needed a knob had three bad options:

1. **Hard-code the value** -- impossible to change per tenant.
2. **Add a column to its own table** -- forces a migration every time a new
   setting is added, couples schema to settings churn.
3. **Store a JSONB blob on the tenant row** -- cross-tenant settings have no
   place to live, cascade resolution is re-invented per module, no RLS
   policy can target the "tenant's schedule" key specifically.

Config centralizes all of this:

- **One table** for every setting, every module, every tenant.
- **One API** (`/api/module-configs/*`) for CRUD + resolve + batch resolve.
- **One cascade algorithm** that every module uses to find the effective value.
- **One RLS policy surface** scoped to tenant + role, enforced at the DB level.
- **Zero per-module UI code** -- the dashboard discovers settings from each
  module's `configSchema` array and renders a generic CRUD form.

---

## Architectural Position

```
     Dashboard UI              Portal / Chat Widget          Internal callers
          |                            |                            |
          v                            v                            v
  +-------------+           GET /api/public-tenants/:id/config   GET /api/module-configs/resolve
  | RA list/edit |          (aggregated 14-key batch)            (single-key cascade)
  +------+------+                     |                            |
         |                            v                            v
         v                    +-------+----------------------------+------+
                              |                module-config              |
                              |                                            |
                              |   +-------------------+  +--------------+  |
                              |   | Cascade Resolver  |  | Upsert /     |  |
                              |   | (5 tiers)         |  | CRUD         |  |
                              |   +---------+---------+  +------+-------+  |
                              |             |                   |          |
                              |             v                   v          |
                              |       +-------------------------------+    |
                              |       |   Postgres: module_configs    |    |
                              |       |   (RLS policies enabled)      |    |
                              |       +-------------------------------+    |
                              +---------------------------------------------+
                                     ^                          ^
                                     |                          |
                         Module registry              Event bus emits
                         (tier 5: schema defaults)   config.entry.{created,updated,deleted}
```

Config sits **below** every other module that needs settings and **above**
the module registry (for tier-5 schema defaults) and the event bus (for
config change notifications).

---

## Key Design Decisions

- **Tenant-aware cascade**: A nullable `tenantId` column lets a single table
  hold both platform-global defaults and tenant-specific overrides.
- **5-tier resolution**: tenant-instance > tenant-module > platform-instance >
  platform-module > schema default. Higher tiers always win.
- **RLS + handler filtering defence in depth**: RLS policies block
  cross-tenant reads at the DB level; handlers also filter by tenant at the
  API level.
- **Schema defaults are never persisted as rows**: tier 5 values come from
  the code's `configSchema[]` array. They are returned with
  `source: 'schema'` but never trigger `config.entry.created`.
- **Batch resolve is a first-class operation**: the public tenant config
  endpoint resolves 14 keys in one round trip. Sequential single-key calls
  would be too slow.
- **Plain integer FKs**: `tenantId` is `integer('tenant_id')` without a
  Drizzle `references()` -- modules can be registered in any order.

---

## Where To Go Next

| Topic | Doc |
|-------|-----|
| Database schema | [`database.md`](./database.md) |
| API endpoints | [`api.md`](./api.md) |
| Design patterns & data flow | [`architecture.md`](./architecture.md) |
| Detailed requirements checklist | [`detailed-requirements.md`](./detailed-requirements.md) |
| ModuleDefinition shape, types, contracts | [`module-design.md`](./module-design.md) |
| Dashboard UI | [`UI.md`](./UI.md) |
| RLS + permissions + threat model | [`secure.md`](./secure.md) |
| External references + prior art | [`references.md`](./references.md) |
| Use-case coverage | [`use-case-compliance.md`](./use-case-compliance.md) |
| Authoring prompts / worked examples | [`prompts.md`](./prompts.md) |

---

## Status & Sprint Plan

The module's active work lives under
[`docs/modules/todo/config/`](../todo/config/README.md). Sprint plan:

1. **sprint-00**: Discovery & rule compliance (done).
2. **sprint-01**: Unit tests for the cascade resolver (in progress).
3. **sprint-02**: Dashboard UI + module registration.
4. **sprint-03**: RLS migration + ownership transfer from `module-workflows`.
5. **sprint-04**: Acceptance + graduation.

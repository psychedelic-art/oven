# Module Config — Todo

> **Package**: `packages/module-config/`
> **Spec**: [`docs/modules/20-module-config.md`](../../20-module-config.md)
> **Canonical docs**: [`docs/modules/config/`](../../config/Readme.md)
> **Current sprint**: [`sprint-01-foundation-tests.md`](./sprint-01-foundation-tests.md)

## What It Is

`module-config` is the **platform-wide configuration store**. Every module that
needs tenant-customizable settings declares them in `configSchema` and
reads/writes them through this module's API. A single `module_configs` table
with a **5-tier cascade resolver** produces the effective value for any
`(moduleName, key, tenantId?, scopeId?)` tuple.

## Why It Is Foundational

- Eliminates per-module config columns and JSONB blobs for tenant-varying data.
- Gives the dashboard a single CRUD surface for every module's settings.
- Feeds the public tenant config endpoint used by the portal / widget layer.
- Serves as tier-5 fallback from each module's declared `configSchema` defaults.

## Status Snapshot

| Area | State |
|------|-------|
| Spec doc (`20-module-config.md`) | Complete |
| Package code (`packages/module-config/src/`) | Implemented — schema, 4 handlers, seed, module definition |
| Unit tests | **Missing — sprint-01 target** |
| Dashboard UI components | Missing — sprint-02 target |
| Canonical doc set (`docs/modules/config/`) | Scaffolded in this pass |
| Registration in `apps/dashboard/src/lib/modules.ts` | Pending — sprint-02 target |
| RLS policies | Documented in spec, not yet migrated — sprint-03 target |
| Integration with `module-workflows` (migration away from its `module_configs`) | Pending — sprint-03 target |

## Sprints

| # | File | Status |
|---|------|:------:|
| 00 | [`sprint-00-discovery.md`](./sprint-00-discovery.md) | Done (this pass) |
| 01 | [`sprint-01-foundation-tests.md`](./sprint-01-foundation-tests.md) | In progress |
| 02 | [`sprint-02-dashboard-ui.md`](./sprint-02-dashboard-ui.md) | Ready |
| 03 | [`sprint-03-rls-and-migration.md`](./sprint-03-rls-and-migration.md) | Ready |
| 04 | [`sprint-04-acceptance.md`](./sprint-04-acceptance.md) | Pending |

See [`STATUS.md`](./STATUS.md) for QA outcomes, backup branches, and PR links
once the module enters active development.

# Module Config — Status

> Last updated: 2026-04-12

## Current State

| Field | Value |
|-------|-------|
| Overall progress | 75% |
| Current sprint | `sprint-02-dashboard-ui` -> Done. Next: `sprint-03-rls-and-migration` |
| Tests | **24 passing** (13 resolve + 11 resolve-batch). Run via `pnpm --filter @oven/module-config test`. |
| Lint | Clean |
| Typecheck | Pre-existing baseline (compiles as part of dashboard build) |

## History

| Date | Event |
|------|-------|
| 2026-04-11 | Cycle-3: canonical doc set scaffolded; sprint-01 foundation tests shipped (24 tests). |
| 2026-04-12 | Cycle-15: sprint-02 dashboard UI completed. resolve-batch route shim added; module-configs menu moved to "Platform" section; Create/Edit forms upgraded with JSON validation + monospace editor. |

## Risk Log

1. **RLS policies not yet migrated**: sprint-03 scope.
2. **Workflows owns `moduleConfigs` table today**: sprint-03 migration will transfer ownership.
3. **Module dropdown in Create form**: uses plain TextInput, not a dropdown from `registry.getAll()`. Requires a `/api/registry/modules` endpoint (deferred).
4. **`useTenantContext` not available**: tenant-aware list filtering (Rule 6.3) cannot be implemented until the tenant context provider is built (dashboard-ux-system program).

## Acceptance Gate

Sprint-03 (RLS + migration) and sprint-04 (acceptance) remain.

## Backup Branches

- `bk/claude-stoic-hamilton-8IRlF-20260412` (cycle-15)

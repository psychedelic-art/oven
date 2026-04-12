# Module Auth — STATUS

> Owner: long-running Claude Code auth execution pipeline.
> Updated: 2026-04-12 (cycle-20)

## Active sprint

**`sprint-02-authjs-adapter`** -- Done (adapter + handlers + middleware + 16 new tests).
Next: `sprint-03-dashboard-ui`.

## History

| Date       | Event                                                         | Commit SHA |
|------------|---------------------------------------------------------------|------------|
| 2026-04-11 | Canonical doc set scaffolded under `docs/modules/auth/`       | (in cycle-3) |
| 2026-04-11 | Todo folder scaffolded under `docs/modules/todo/auth/`        | (in cycle-3) |
| 2026-04-12 | Sprint-00 discovery: inventory.md written with 16 hits.       | (cycle-15b) |
| 2026-04-12 | Sprint-01 foundation: vitest infra, 6 adapter-registry tests, 8 module-definition tests. Total: 14 tests. | (cycle-17) |
| 2026-04-12 | Sprint-02 authjs-adapter: 6 middleware tests + 9 handler tests + 1 Argon2id roundtrip. Total: 30 tests (14 + 16). | (cycle-20) |

## Backup branches

- `bk/claude-stoic-hamilton-8IRlF-20260412` (cycle-17 session)

## QA outcomes

Sprint-02: all code already implemented (adapter, handlers, middleware, registration).
Tests added: middleware (6), handlers (9), password roundtrip (1). 30/30 green.
Zero direct imports of JWT/hashing libs in `module-auth/src/`.

## Blockers

None. Ready for sprint-03-dashboard-ui.

## Dependencies watch

- **`module-roles`** -- `getPermissionsForUser(userId, tenantId)` needed for sprint-03.
- **`module-tenants`** -- `getMembershipsForUser(userId)` needed for middleware enrichment.

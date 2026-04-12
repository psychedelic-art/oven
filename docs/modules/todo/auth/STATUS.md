# Module Auth — STATUS

> Owner: long-running Claude Code auth execution pipeline.
> Updated: 2026-04-12 (cycle-17)

## Active sprint

**`sprint-01-foundation`** -- Done (test infra + 14 tests).
Next: `sprint-02-authjs-adapter`.

## History

| Date       | Event                                                         | Commit SHA |
|------------|---------------------------------------------------------------|------------|
| 2026-04-11 | Canonical doc set scaffolded under `docs/modules/auth/`       | (in cycle-3) |
| 2026-04-11 | Todo folder scaffolded under `docs/modules/todo/auth/`        | (in cycle-3) |
| 2026-04-12 | Sprint-00 discovery: inventory.md written with 16 hits.       | (cycle-15b) |
| 2026-04-12 | Sprint-01 foundation: vitest infra, 6 adapter-registry tests, 8 module-definition tests. Total: 14 tests. | (cycle-17) |

## Backup branches

- `bk/claude-stoic-hamilton-8IRlF-20260412` (cycle-17 session)

## QA outcomes

Sprint-01 is test infrastructure only. 14/14 tests green.

## Blockers

None. Ready for sprint-02-authjs-adapter.

## Dependencies watch

- **`module-roles`** -- `getPermissionsForUser(userId, tenantId)` needed for sprint-02.
- **`module-tenants`** -- `getMembershipsForUser(userId)` needed for middleware.

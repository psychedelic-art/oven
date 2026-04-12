# Module Auth — STATUS

> Owner: long-running Claude Code auth execution pipeline.
> Started: 2026-04-11.

## Active sprint

**`sprint-00-discovery`** -- Done (cycle-15 session).
Next: `sprint-01-foundation`.

## History

| Date       | Event                                                         | Commit SHA |
|------------|---------------------------------------------------------------|------------|
| 2026-04-11 | Canonical doc set scaffolded under `docs/modules/auth/`       | (in cycle-3) |
| 2026-04-11 | Todo folder scaffolded under `docs/modules/todo/auth/`        | (in cycle-3) |
| 2026-04-12 | Sprint-00 discovery: inventory.md written with 16 hits, 3 call-site migrations identified for sprint-04. | (cycle-15 session) |

## Backup branches

- `bk/claude-stoic-hamilton-8IRlF-20260412` (cycle-15 session)

## QA outcomes

Sprint-00 is documentation only. No code changes, no tests affected.

## Blockers

None. Ready for sprint-01-foundation.

## Dependencies watch

- **`module-roles`** -- needs `getPermissionsForUser(userId, tenantId)`
  to exist and be stable. If it does not, sprint-01 blocks.
- **`module-tenants`** -- needs `getMembershipsForUser(userId)`. If it
  does not, the middleware's tenant resolution (R3 set) cannot run.
- **`oven-bug-sprint/sprint-05-handler-typesafety`** -- sprint-03 of
  this module depends on `getOrderColumn` having shipped so the API
  key list handler can use the shared allowlist helper.

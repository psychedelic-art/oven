# Module Auth — STATUS

> Owner: long-running Claude Code auth execution pipeline.
> Started: 2026-04-11.

## Active sprint

**`sprint-00-discovery`** — Ready. No commits yet against the package
path because the package does not exist. Discovery output will be a
single commit landing `inventory.md` and an updated STATUS row.

## History

| Date       | Event                                                         | Commit SHA |
|------------|---------------------------------------------------------------|------------|
| 2026-04-11 | Canonical doc set scaffolded under `docs/modules/auth/`       | (pending)  |
| 2026-04-11 | Todo folder scaffolded under `docs/modules/todo/auth/`        | (pending)  |

## Backup branches

None yet — no feature branches have been opened against this module.

## QA outcomes

None yet.

## Blockers

None. The module has a stable spec in `docs/modules/17-auth.md` and
clean ground-truth references. It is ready to enter active development
behind `oven-bug-sprint` (which has higher immediate business value).

## Dependencies watch

- **`module-roles`** — needs `getPermissionsForUser(userId, tenantId)`
  to exist and be stable. If it does not, sprint-01 blocks.
- **`module-tenants`** — needs `getMembershipsForUser(userId)`. If it
  does not, the middleware's tenant resolution (R3 set) cannot run.
- **`oven-bug-sprint/sprint-05-handler-typesafety`** — sprint-03 of
  this module depends on `getOrderColumn` having shipped so the API
  key list handler can use the shared allowlist helper.

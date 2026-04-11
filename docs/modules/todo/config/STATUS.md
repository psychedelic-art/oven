# Module Config — Status

> Last updated: 2026-04-11
> Session branch: `claude/eager-curie-INifN`

## Current State

| Field | Value |
|-------|-------|
| Overall progress | 55% |
| Current sprint | `sprint-01-foundation-tests` → Done. Next: `sprint-02-dashboard-ui` |
| Active feature branch | `claude/eager-curie-INifN` (session branch) |
| Backup branch | n/a — feature work is on the session branch; no separate PR yet |
| Last commit on package | this session's `test(config)` commit (see git log) |
| Tests | **24 passing** (13 `module-configs-resolve.test.ts` + 11 `module-configs-resolve-batch.test.ts`). Run via `pnpm --filter @oven/module-config test`. |
| Lint | Clean (no lint scripts configured for `module-config` yet — enforced at repo level) |
| Typecheck | Clean (compiles as part of dashboard build) |

## Risk Log

1. **RLS policies not yet migrated**: spec section 6 defines policies but the
   migration to enable RLS is scoped to sprint-03. Until then, tenant isolation
   relies on API-level filters; external callers must set `req.tenantId`
   correctly.
2. **Workflows owns `moduleConfigs` table today**: the spec's Phase 2 migration
   removes the table from `module-workflows` and gives it exclusively to
   `module-config`. This is destructive-adjacent and is gated behind
   sprint-03; it must ship before `module-config` can be registered ahead of
   `module-workflows` in `modules.ts`.
3. **No dashboard UI components yet**: the `resources` entry in `index.ts`
   points to `'module-configs'` but has no `list`, `create`, `edit`
   components — the RA resource will throw on mount. Sprint-02 ships the
   minimum components (JSON value editor is the hard part).

## Acceptance Gate

The module graduates from `todo/config/` to `docs/modules/config/` (i.e. the
todo folder is removed) when sprint-04-acceptance's checklist is fully met.
The canonical doc set under `docs/modules/config/` already exists and is the
target location; only the todo folder is removed at graduation.

## QA Outcomes

None yet — no feature branch beyond the session branch has been opened, so no
QA report has been filed. This section will hold the verdict/recommendation for
each QA pass once feature branches start landing.

## Backup Branches

None yet. Backup branches follow the convention
`bk/<feature-branch>-<YYYYMMDD>` and are recorded here as soon as they are
pushed.

## PR Links

None yet — no pull request has been opened against `dev` for this module.

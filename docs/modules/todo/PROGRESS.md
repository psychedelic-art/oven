# Todo Queue Progress

Regenerated fresh on 2026-04-11 after cycle-4 merge of
`claude/inspiring-clarke-M7sl8` (composite session branch containing
all of `claude/inspiring-clarke-0OpL4` and
`claude/inspiring-clarke-GA0Ok`) into the session branch
`claude/inspiring-clarke-JuFO1`.

## Cycle-4 merge audit

| # | Branch | Modules landed | Backup | Unique content | Tests | Verdict |
|---|--------|----------------|--------|----------------|-------|---------|
| 1 | `claude/inspiring-clarke-M7sl8` | `auth`, `tenants`, `subscriptions`, `module-ai` F-05-01 | `bk/claude-inspiring-clarke-M7sl8-20260411` | Canonical 11-file doc shapes for auth + tenants + subscriptions; todo sprint plans for all three; `getOrderColumn` helper + 8 tests; `computeBusinessHours` hardening + 28 tests; pure subscriptions cascade resolver + 52 tests | 190/190 pass (110 module-ai + 52 module-subscriptions + 28 module-tenants) | MERGED to `claude/inspiring-clarke-JuFO1` |
| 2 | `claude/inspiring-clarke-GA0Ok` | (contained in M7sl8) | `bk/claude-inspiring-clarke-GA0Ok-20260411` | — | — | SUPERSEDED |
| 3 | `claude/inspiring-clarke-0OpL4` | (contained in M7sl8) | `bk/claude-inspiring-clarke-0OpL4-20260411` | — | — | SUPERSEDED |
| 4 | `claude/qa-test-todo-module-K2tpT` | — | `bk/claude-qa-test-todo-module-K2tpT-20260411` | Only a regenerated `tsconfig.tsbuildinfo` (build artifact) | — | BLOCKED — build artifacts must not be committed |

## Active queue

| Module / Program | Sprint files | Canonical doc set | Package / tests | Next action |
|---|---|---|---|---|
| `auth` | 5 (sprint-00..04-acceptance) | complete (11/11) | no package yet | Execute `sprint-00-discovery` — inventory existing auth code before writing `sprint-01-foundation` package skeleton. |
| `tenants` | 5 (sprint-00..04-acceptance) | complete (11/11) | 28 tests green | Execute `sprint-03-security-hardening` (R3.5 id leak fix, last-owner guard, MAX_MEMBERS_PER_TENANT enforcement, sort allowlist). |
| `subscriptions` | 6 (sprint-00..05-acceptance) | complete (11/11) | 52 tests green | Execute `sprint-02-usage-metering` (thread pure resolver through every call site and add integration tests). |
| `config` | 4 (sprint-00..04) | complete (11/11) | 24 tests green | Execute `sprint-02-dashboard-ui`. |
| `notifications` | 5 (sprint-00..05) | complete (11/11) | 37 tests green; package NOT registered in `apps/dashboard/src/lib/modules.ts` | Register module in dashboard, then execute `sprint-02` WhatsApp Meta adapter. |
| `module-knowledge-base` | 5 (sprint-00..05) | partial (`Readme.md` only — 10 files missing) | — | Fill missing canonical doc files; execute `sprint-02` embedding pipeline. |
| `ui-flows` | 5 (sprint-00..03, 99-acceptance) | complete (11/11) | — | Execute `sprint-01-foundation`. |
| `oven-bug-sprint` | 7 (sprint-00..06) | N/A (program) | F-05-01 landed (sort allowlist helper in `module-ai`) | Execute `sprint-00` triage outputs; F-05-01 / F-05-02 still open for the remaining handlers. |
| `files` | 6 (sprint-00..05-acceptance) | complete (11/11) — scaffolded cycle-4 Phase 3 | LIVE package, 0 tests | Execute `sprint-01-security-hardening` (F-05-01 sort allowlist on `GET /api/files`). |
| `dashboard-ux-system` | 8 (sprint-00..07) | N/A (program) | — | Execute `sprint-01-foundation`. |
| `psychedelic-claude-code-migration` | 12 (sprint-00..11) | N/A (program) | — | Owned elsewhere — do not touch. |

## Known issues

1. **Pre-existing typecheck baseline of 460 errors on `dev`.** All
   from `packages/workflow-editor/` which lists `react` as a peer dep
   but has no dev dep, so TS can't resolve `react` when dashboard
   compiles through the workspace. Unchanged by cycle-4. Fix is
   independent: add `react`/`react-dom` as dev deps to
   `packages/workflow-editor`.
2. **`@oven/module-notifications` is not registered.** The package
   scaffolded in cycle-3 is not listed in
   `apps/dashboard/src/lib/modules.ts`. Register it before
   `notifications/sprint-02` lands.
3. **`module-knowledge-base` canonical doc shape is incomplete.** Only
   `docs/modules/knowledge-base/Readme.md` exists.
4. **`ui-flows` canonical shape uses `sprint-99-acceptance.md`** while
   every other module uses `sprint-NN-acceptance.md`. Minor naming
   inconsistency.
5. **`oven-bug-sprint/sprint-05-handler-typesafety` F-05-01 is
   partial.** The `module-ai` playground handler is fixed via
   `getOrderColumn`; the same pattern must propagate to every other
   list handler that still uses the unsafe `(table as any)[params.sort]`
   idiom.
6. **Drizzle `getDb()` returns `any`.** Forces casts in seed paths.
   Still unaddressed, tracked as tech debt.

## Backup inventory (current)

All session branches have pushed backups on remote under
`bk/<original>-20260411`:

- `bk/claude-inspiring-clarke-M7sl8-20260411` (cycle-4 composite)
- `bk/claude-inspiring-clarke-GA0Ok-20260411` (cycle-3 predecessor)
- `bk/claude-inspiring-clarke-0OpL4-20260411` (cycle-2 predecessor)
- `bk/claude-qa-test-todo-module-K2tpT-20260411` (blocked)
- `bk/claude-dashboard-ux-system-nESUZ-20260411`
- `bk/claude-eager-curie-TXjZZ-20260411` (ui-flows)
- `bk/claude-eager-curie-LRIhN-20260411` (module-knowledge-base)
- `bk/claude-eager-curie-INifN-20260411` (config)
- `bk/claude-eager-curie-4GaQC-20260411` (notifications)
- `bk/claude-eager-curie-0da9Q-20260411` (oven-bug-sprint)
- `bk/claude-eager-curie-3Wkp7-20260411` (redundant, preserved)

## Merge path to `dev`

This session pushes only to `claude/inspiring-clarke-JuFO1`. Landing
the cycle-4 merge onto `dev` requires explicit user approval (PR
creation or direct merge). No PR is opened automatically per
repository policy.

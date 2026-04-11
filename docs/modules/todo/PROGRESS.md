# Todo Queue Progress

Regenerated fresh on 2026-04-11 after **cycle-8** landing of
`claude/inspiring-clarke-JGiXk` (tenants sprint-03 security hardening
— DRIFT-2/3/4/5 + 50 tests) onto `origin/dev` as merge commit
`1eb20cf` on top of cycle-7 `26d6e1b`. Session branch:
`claude/inspiring-clarke-HBa3u`.

## Cycle-8 merge audit

| # | Branch | Modules landed | Backup | Unique content | Tests | Verdict |
|---|--------|----------------|--------|----------------|-------|---------|
| 1 | `claude/inspiring-clarke-JGiXk` | `module-tenants` sprint-03 | `bk/claude-inspiring-clarke-JGiXk-20260411` | `_utils/sort.ts` (verbatim copy of `module-ai/_utils/sort.ts` per BO rule IP-4); `_utils/member-guards.ts` (`checkLastOwnerRemoval` + `checkMemberLimit`); `_utils/public-response.ts` (`assembleTenantPublicResponse` whose typed return structurally omits `id`/`slug`/`enabled`/`metadata`/timestamps); handler edits in `tenants.handler.ts`, `tenant-members.handler.ts`, `tenant-members-by-id.handler.ts`, `tenants-public.handler.ts`; sprint-03 acceptance checkboxes flipped; tenants STATUS.md updated | **+50 vitest tests** (23 sort-guard + 15 member-guards + 12 public-response). `@oven/module-tenants` 28 → **78** all green. | **MERGED to `origin/dev`** as `1eb20cf` (cycle-8 `--no-ff`) |
| 2 | `claude/qa-test-todo-module-K2tpT` | — | `bk/claude-qa-test-todo-module-K2tpT-20260411` (cycle-2) | Only a regenerated `apps/dashboard/tsconfig.tsbuildinfo` (build artifact). 1 ahead, 40 behind dev. | — | **BLOCKED** — build artifacts must not be committed (unchanged from cycles 2..7) |

### Phase 0 candidate set (cycle-8)

| Branch | Ahead | Behind | Disposition |
|--------|-------|--------|-------------|
| `claude/inspiring-clarke-0OpL4` | 0 | 34 | content already on dev (predecessor cycles) |
| `claude/inspiring-clarke-GA0Ok` | 0 | 27 | content already on dev (predecessor cycles) |
| `claude/inspiring-clarke-JGiXk` | 4 | 0 | **landed cycle-8 → `1eb20cf`** |
| `claude/inspiring-clarke-JuFO1` | 0 | 19 | content already on dev (predecessor cycles) |
| `claude/inspiring-clarke-LSksg` | 0 | 1 | content already on dev (cycle-7) |
| `claude/inspiring-clarke-M7sl8` | 0 | 23 | content already on dev (predecessor cycles) |
| `claude/inspiring-clarke-bYhvx` | 0 | 8 | content already on dev (cycle-7) |
| `claude/inspiring-clarke-e8QUu` | 0 | 12 | content already on dev (cycle-6) |
| `claude/qa-test-todo-module-K2tpT` | 1 | 40 | **BLOCKED** (tsbuildinfo only) |

### Shared unmerged ancestors

`git log --format=%H` over `dev..JGiXk` and `dev..K2tpT` produces five
distinct SHAs (`a296c0a`, `d16bb36`, `68bb0c5`, `0da8047`, `1ffa9c1`)
with **zero overlap**. No shared unmerged ancestor required pre-landing
this cycle.

### Typecheck delta (cycle-8)

| Package | dev (`26d6e1b`) | dev (`1eb20cf`, after cycle-8) | delta |
|---|---|---|---|
| `@oven/dashboard` | 460 | 460 | 0 |
| `@oven/module-ai` | 0 | 0 | 0 |
| `@oven/module-files` | 0 | 0 | 0 |
| `@oven/module-subscriptions` | 40 | 40 | 0 |
| `@oven/module-tenants` | 18 | 18 | 0 |

No regression. Pre-existing 460 dashboard errors continue to come from
`packages/workflow-editor/` peer-dep React typing and `RouteHandler`
context-param patterns in `module-subscriptions` / `module-tenants`;
none are touched by this cycle.

## Active queue (post cycle-8)

| Module / Program | Sprint files | Canonical doc set | Package / tests | Next action |
|---|---|---|---|---|
| `auth` | 5 (sprint-00..04-acceptance) | complete (11/11) | no package yet | Execute `sprint-00-discovery` — inventory existing auth code before writing `sprint-01-foundation` package skeleton. |
| `files` | 6 (sprint-00..05-acceptance) | complete (11/11) | LIVE package, **10 tests** (sort-guard) | F-05-01 already landed. Execute `sprint-02-upload-validation`. |
| `subscriptions` | 6 (sprint-00..05-acceptance) | complete (11/11) | **52 tests** green | Execute `sprint-02-usage-metering` (thread pure resolver through every call site + integration tests). |
| `tenants` | 5 (sprint-00..04-acceptance) | complete (11/11) | **78 tests** green (cycle-8) | sprint-03 LANDED cycle-8 (`1eb20cf`). Next: `sprint-04-acceptance` (integration tests once DB-mock infra is available); DRIFT-6 seed-idempotency lock waits on the same DB-mock harness. |
| `config` | 4 (sprint-00..04) | complete (11/11) | 24 tests green | Execute `sprint-02-dashboard-ui`. |
| `notifications` | 5 (sprint-00..05) | complete (11/11) | 37 tests green; package NOT registered in `apps/dashboard/src/lib/modules.ts` | Register module in dashboard, then execute `sprint-02` WhatsApp Meta adapter. |
| `module-knowledge-base` | 6 (sprint-00..05-acceptance) | complete (11/11) — cycle-7 audit re-verified | — | Execute `sprint-02` embedding pipeline. |
| `ui-flows` | 5 (sprint-00..03, 99-acceptance) | complete (11/11) | — | Execute `sprint-01-foundation`. |
| `oven-bug-sprint` | 7 (sprint-00..06) | N/A (program) | F-05-01 + F-05-02 + F-05-03 + F-05-04 done in `module-ai` (**173/173** green) | Cycle-8 also exercised the F-05-01 IP-4 verbatim-copy pattern in `module-tenants/_utils/sort.ts`. Remaining open: **F-05-05** (`ai-generate-object.handler.ts:26` zod validation of the tool schema before passing to `ai.generateObject`). |
| `agent-ui` | 6 (sprint-00..05-acceptance) | complete (11/11) | LIVE package, vitest suite | Execute `sprint-00-discovery` drift audit, then `sprint-01-foundation` (type tighten + MUI-ban lint). |
| `dashboard-ux-system` | 8 (sprint-00..07) | N/A (program) | — | Execute `sprint-01-foundation`. |
| `psychedelic-claude-code-migration` | 12 (sprint-00..11) | N/A (program) | — | Owned elsewhere — do not touch. |

## Known issues

1. **Pre-existing typecheck baseline on `dev` (460 errors).** All from
   `packages/workflow-editor/` (peer-dep `react` resolution) and
   `RouteHandler` / `"json"` field types in
   `module-subscriptions` / `module-tenants`. Unchanged by cycle-8.
   Fix: add `react` / `react-dom` as dev deps to
   `packages/workflow-editor`; widen `RouteHandler` context typings;
   replace `"json"` field types with the `jsonb` drizzle column helper.
2. **`@oven/module-notifications` is not registered.** The package
   scaffolded in cycle-3 is not listed in
   `apps/dashboard/src/lib/modules.ts`. Register before
   `notifications/sprint-02` lands.
3. **`module-knowledge-base` canonical doc shape — VERIFIED cycle-7.**
   All 11 canonical files present with real content; the next action
   is `sprint-02` embedding pipeline execution.
4. **`ui-flows` canonical shape uses `sprint-99-acceptance.md`** while
   every other module uses `sprint-NN-acceptance.md`. Minor naming
   inconsistency.
5. **`oven-bug-sprint/sprint-05-handler-typesafety`.**
   F-05-01..F-05-04 done. `packages/module-ai/src/api/` has zero
   `as any` on sdkProvider / sub-client resolution in every handler
   except `ai-generate-object.handler.ts:26` (F-05-05 — last open
   finding). Cycle-8 added a second IP-4 callsite for the same helper
   pattern in `module-tenants`.
6. **`module-tenants` DRIFT-6 deferred.** Seed idempotency lock is
   tracked but cannot be unit-tested without DB-mock infra. The seed
   already uses `onConflictDoNothing()`. Re-open once a DB-mock harness
   is available (sprint-04 dependency).
7. **Drizzle `getDb()` returns `any`.** Forces casts in seed paths.
   Still unaddressed, tracked as tech debt.
8. **Rebase + commit-signing incompatibility.** The code-sign server
   returns `400 { "error": "missing source" }` when `git rebase`
   replays commits. Direct merge commits (`--no-ff`) sign cleanly.
   Operational guidance: do NOT rebase session branches — always
   merge `dev` in, never rebase onto it.

## Backup inventory (current)

Cumulative backups pushed under `bk/<original>-20260411`:

- `bk/claude-inspiring-clarke-JGiXk-20260411` (cycle-8 — **new**)
- `bk/claude-inspiring-clarke-bYhvx-20260411` (cycle-7)
- `bk/claude-inspiring-clarke-LSksg-20260411` (cycle-7 session)
- `bk/claude-inspiring-clarke-e8QUu-20260411` (cycle-6 composite)
- `bk/claude-inspiring-clarke-JuFO1-20260411` (cycle-5 composite)
- `bk/claude-inspiring-clarke-M7sl8-20260411` (cycle-4 predecessor)
- `bk/claude-inspiring-clarke-GA0Ok-20260411` (cycle-3 predecessor)
- `bk/claude-inspiring-clarke-0OpL4-20260411` (cycle-2 predecessor)
- `bk/claude-qa-test-todo-module-K2tpT-20260411` (blocked, cycle-2)
- `bk/claude-dashboard-ux-system-nESUZ-20260411`

## Merge path to `dev` (post cycle-8)

`origin/dev` HEAD is now `1eb20cf merge(cycle-8): land tenants
sprint-03 security hardening (+50 tests)`. The cycle-8 work is live.
The session branch for the next pipeline cycle is
`claude/inspiring-clarke-HBa3u`, resynced via
`merge(session): sync HBa3u with dev after cycle-8 landing`. All
subsequent Phase 3/4 work in this run sits on top of `1eb20cf`.

QA evidence:
- Cycle-8: `qa-reports/claude-inspiring-clarke-JGiXk-QA-REPORT.md`
- Cycle-7: `qa-reports/claude-inspiring-clarke-LSksg-QA-REPORT.md`
- Cycle-7: `qa-reports/claude-inspiring-clarke-bYhvx-QA-REPORT.md`

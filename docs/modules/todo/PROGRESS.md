# Todo Queue Progress

Regenerated fresh on 2026-04-12 after **cycle-18** session start on
`claude/stoic-hamilton-2ylh0`. Previous session branch
`claude/stoic-hamilton-8IRlF` has 1 unmerged commit (PROGRESS.md
cycle-17b update, docs-only). dev HEAD is `ef8da48`.

## Branch discovery (cycle-18)

| Branch | Module | Ahead | Behind | Content | Action |
|--------|--------|-------|--------|---------|--------|
| `claude/stoic-hamilton-8IRlF` | tracking | 1 | 0 | PROGRESS.md cycle-17b agent-ui update | Land as cycle-18a |
| `claude/qa-test-todo-module-K2tpT` | stale | 1 | 116 | tsbuildinfo refresh only | Skip (stale, superseded) |

No shared unmerged ancestors between candidates.

## Cycle-17b merge audit (previous session)

| # | Branch | Modules landed | Backup | Tests | Verdict |
|---|--------|----------------|--------|-------|---------|
| 1 | `claude/stoic-hamilton-8IRlF` | agent-ui sprint-00 discovery (40 files, 50 R-IDs) | `bk/claude-stoic-hamilton-8IRlF-20260412` | Docs only | **MERGED to `origin/dev`** as `ef8da48` |

## Active queue (post cycle-17b, audited cycle-18)

| Module / Program | Sprint files | Canonical doc set | Package / tests | Current sprint | Next action |
|---|---|---|---|---|---|
| `auth` | 5 (sprint-00..04) | 11/11 | `@oven/module-auth`, 14 tests (2 files) | **sprint-01 done (cycle-17)** | Execute sprint-02-authjs-adapter. |
| `files` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/module-files`, 29 tests | sprint-02 done | Execute sprint-03-tenant-scoping. |
| `subscriptions` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/module-subscriptions`, 80 tests | sprint-02 done (cycle-14) | Execute sprint-03-public-pricing. |
| `tenants` | 5 (sprint-00..04) | 11/11 | LIVE `@oven/module-tenants`, 78 tests | sprint-03 done | Execute sprint-04-acceptance (BLOCKED on DB-mock harness). |
| `config` | 5 (sprint-00..04) | 11/11 | LIVE `@oven/module-config`, 24 tests | **sprint-02 done (cycle-15)** | Execute sprint-03-rls-and-migration. |
| `notifications` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/module-notifications` 48 tests + `@oven/notifications-meta` 21 tests; REGISTERED | sprint-02 done | Execute sprint-03-usage-metering. |
| `module-knowledge-base` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/module-knowledge-base`, 21 tests | **sprint-02 done (cycle-16)** | Execute sprint-03-search-engine. |
| `ui-flows` | 5 (sprint-00..03, 99) | 11/11 | LIVE `@oven/module-ui-flows`, 41 tests (2 test files: slug-utils, module-definition) | **sprint-01 partial (cycle-16b)** | Continue sprint-01 (API handler tests needed). |
| `agent-ui` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/agent-ui`, 67 tests (9 test files) | **sprint-00 done (cycle-17b)** | Execute sprint-01-foundation. |
| `dashboard-ux-system` | 8 (sprint-00..07) | N/A (program) | N/A | sprint-00 not started | Execute sprint-01-foundation. |
| `oven-bug-sprint` | 7 (sprint-00..06) | N/A (program) | 291 tests (`module-ai`) | sprint-01 CLOSED (cycle-14), sprint-06 CLOSED (cycle-11) | Next: sprint-03 (Workflow engine, 4 findings). Sprints 02/04 BLOCKED. |
| `psychedelic-claude-code-migration` | 12 (sprint-00..11) | N/A (program) | N/A | -- | Owned elsewhere -- do not touch. |

## Priority order (cycle-18)

P0: oven-bug-sprint sprint-03 (workflow engine, 4 findings -- all target files verified present)
P1: ui-flows sprint-01 continuation (API handler tests -- 2 of 14 test files done)
P2: auth sprint-02 (authjs adapter -- package + handlers + middleware)
P3: agent-ui sprint-01 (foundation)
P4: files sprint-03 (tenant scoping)
P5: subscriptions sprint-03 (public pricing)
P6: config sprint-03 (RLS + migration)
P7: notifications sprint-03 (usage metering)
P8: knowledge-base sprint-03 (search engine)
P9: dashboard-ux-system sprint-01 (foundation)
SKIP: tenants sprint-04 (blocked on DB-mock harness)
SKIP: oven-bug-sprint sprint-02/04 (blocked on module-chat/agent-core)
SKIP: psychedelic-claude-code-migration (external ownership)

## Known issues

1. **Pre-existing typecheck baseline on `dev` (465+ errors).** All from
   `packages/workflow-editor/` (peer-dep `react` resolution),
   `RouteHandler` / `"json"` field types in modules, and `@oven/module-ai/*`
   subpath TS2307 errors. Unchanged category across cycles 2-17.
2. **`useTenantContext` not available.** Tenant-aware list filtering (Rule
   6.3) cannot be implemented until the tenant context provider is built
   (dashboard-ux-system program). Config sprint-02 defers this.
3. **`ui-flows` canonical shape uses `sprint-99-acceptance.md`** while
   every other module uses `sprint-NN-acceptance.md`. Minor naming
   inconsistency, not fixing.
4. **`oven-bug-sprint/sprint-05-handler-typesafety` -- CLOSED cycle-9.**
5. **`oven-bug-sprint/sprint-06-rule-compliance` -- CLOSED cycle-11.**
6. **`oven-bug-sprint/sprint-01-ai-playground-ux` -- CLOSED cycle-14.**
7. **`module-tenants` DRIFT-6 deferred.** Seed idempotency lock
   cannot be unit-tested without DB-mock infra. Re-open with sprint-04.
8. **Drizzle `getDb()` returns `any`.** Forces casts in seed paths.
9. **Rebase + commit-signing incompatibility.** Do NOT rebase session
   branches -- always merge `dev` in.
10. **Config module registration order.** Currently registered after
    `workflowsModule`. Should be before, but deferred to sprint-03 when
    the `moduleConfigs` table ownership transfers from workflows to config.
11. **`module-workflows` has 0 test files.** Sprint-03 will add first tests.

## Backup inventory (current)

- `bk/claude-stoic-hamilton-bVxUR-20260412` (cycle-17b)
- `bk/claude-stoic-hamilton-8IRlF-20260412` (cycle-15)
- `bk/claude-stoic-hamilton-iouNt-20260412` (cycle-12)
- `bk/claude-inspiring-clarke-IODSY-20260412` (cycle-10)
- `bk/claude-inspiring-clarke-HBa3u-20260412` (cycle-9)
- `bk/claude-inspiring-clarke-JGiXk-20260411` (cycle-8)
- `bk/claude-inspiring-clarke-bYhvx-20260411` (cycle-7)
- `bk/claude-inspiring-clarke-LSksg-20260411` (cycle-7 session)
- `bk/claude-inspiring-clarke-e8QUu-20260411` (cycle-6 composite)
- `bk/claude-inspiring-clarke-JuFO1-20260411` (cycle-5 composite)
- `bk/claude-inspiring-clarke-M7sl8-20260411` (cycle-4 predecessor)
- `bk/claude-inspiring-clarke-GA0Ok-20260411` (cycle-3 predecessor)
- `bk/claude-inspiring-clarke-0OpL4-20260411` (cycle-2 predecessor)
- `bk/claude-qa-test-todo-module-K2tpT-20260411` (blocked, cycle-2)
- `bk/claude-dashboard-ux-system-nESUZ-20260411`

## Merge path to `dev` (post cycle-17b)

`origin/dev` HEAD is now `ef8da48 merge(cycle-17b): land agent-ui
sprint-00 discovery inventory`.

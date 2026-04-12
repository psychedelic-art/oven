# Todo Queue Progress

Regenerated fresh on 2026-04-12 after **cycle-19** merge of
`claude/stoic-hamilton-2ylh0` (ui-flows sprint-01 foundation tests,
89 total across 13 files) onto `origin/dev` as merge commit `59101dc`.
Session branch: `claude/stoic-hamilton-JTmbo`.

## Phase 0 — Branch discovery (cycle-20)

| Branch | Module | Ahead | Behind | Contents |
|--------|--------|-------|--------|----------|
| `claude/qa-test-todo-module-K2tpT` | (stale) | 1 | 129 | tsbuildinfo artifact only — no feature work |
| `claude/stoic-hamilton-2ylh0` | (tracking) | 2 | 0 | PROGRESS.md + pnpm-lock.yaml update from cycle-19 |
| `claude/stoic-hamilton-8IRlF` | (tracking) | 1 | 13 | PROGRESS.md update from cycle-17b |

No feature branches with unmerged work exist. All inspiring-clarke-*
branches are fully merged (ahead=0). The 3 branches above contain
only tracking files or build artifacts — no actionable feature work.

No shared unmerged ancestors detected across candidates.

## Active queue (post cycle-19)

| Module / Program | Sprint files | Canonical doc set | Package / tests | Current sprint | Next action |
|---|---|---|---|---|---|
| `auth` | 5 (sprint-00..04) | 11/11 | `@oven/module-auth` 14 tests (2 files), `@oven/auth-authjs` 0 tests | **sprint-01 done (cycle-17)** | Execute sprint-02-authjs-adapter (tests for middleware + handlers + password roundtrip). |
| `files` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/module-files`, 29 tests (3 files) | sprint-02 done (cycle-13) | Execute sprint-03-tenant-scoping. |
| `subscriptions` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/module-subscriptions`, 80 tests (5 files) | sprint-02 done | Execute sprint-03-public-pricing. |
| `tenants` | 5 (sprint-00..04) | 11/11 | LIVE `@oven/module-tenants`, 78 tests (4 files) | sprint-03 done (cycle-8) | Execute sprint-04-acceptance (BLOCKED on DB-mock harness). |
| `config` | 5 (sprint-00..04) | 11/11 | LIVE `@oven/module-config`, 24 tests (2 files) | **sprint-02 done (cycle-15)** | Execute sprint-03-rls-and-migration. |
| `notifications` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/module-notifications` 48 tests + `@oven/notifications-meta` 21 tests; REGISTERED | sprint-02 done (cycle-12) | Execute sprint-03-usage-metering. |
| `module-knowledge-base` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/module-knowledge-base`, 21 tests (2 files) | **sprint-02 done (cycle-16)** | Execute sprint-03-search-engine. |
| `ui-flows` | 5 (sprint-00..03, 99) | 11/11 | LIVE `@oven/module-ui-flows`, 89 tests (13 files) | **sprint-01 done (cycle-19)** | Execute sprint-02-portal-app. |
| `agent-ui` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/agent-ui`, 67 tests (9 files) | **sprint-00 done (cycle-17b)** | Execute sprint-01-foundation. |
| `dashboard-ux-system` | 8 (sprint-00..07) | N/A (program) | N/A | sprint-00 not started | Execute sprint-01-foundation. |
| `oven-bug-sprint` | 7 (sprint-00..06) | N/A (program) | 310 tests (`module-ai` + `module-workflows`) | sprint-01 CLOSED (cycle-14), sprint-03 CLOSED (cycle-18), sprint-05 CLOSED (cycle-9), sprint-06 CLOSED (cycle-11) | No unblocked sprints remain. sprint-02/04 BLOCKED on module-chat/agent-core. |
| `psychedelic-claude-code-migration` | 12 (sprint-00..11) | N/A (program) | N/A | -- | Owned elsewhere -- do not touch. |

## Priority order (post cycle-19)

P0: auth sprint-02 (authjs adapter tests -- code exists, tests needed)
P1: agent-ui sprint-01 (foundation: type tighten + MUI ban)
P2: files sprint-03 (tenant scoping)
P3: subscriptions sprint-03 (public pricing)
P4: config sprint-03 (RLS + migration)
P5: notifications sprint-03 (usage metering)
P6: knowledge-base sprint-03 (search engine)
P7: ui-flows sprint-02 (portal app)
P8: dashboard-ux-system sprint-01 (foundation)
SKIP: tenants sprint-04 (blocked on DB-mock harness)
SKIP: oven-bug-sprint sprint-02/04 (blocked on module-chat/agent-core)
SKIP: psychedelic-claude-code-migration (external ownership)

## Known issues

1. **Pre-existing typecheck baseline on `dev` (465+ errors).** All from
   `packages/workflow-editor/` (peer-dep `react` resolution),
   `RouteHandler` / `"json"` field types in modules, and `@oven/module-ai/*`
   subpath TS2307 errors. Unchanged category across cycles 2-19.
2. **`useTenantContext` not available.** Tenant-aware list filtering (Rule
   6.3) cannot be implemented until the tenant context provider is built
   (dashboard-ux-system program). Config sprint-02 defers this.
3. **`ui-flows` canonical shape uses `sprint-99-acceptance.md`** while
   every other module uses `sprint-NN-acceptance.md`. Minor naming
   inconsistency, not fixing.
4. **`oven-bug-sprint/sprint-05-handler-typesafety` -- CLOSED cycle-9.**
5. **`oven-bug-sprint/sprint-06-rule-compliance` -- CLOSED cycle-11.**
6. **`oven-bug-sprint/sprint-01-ai-playground-ux` -- CLOSED cycle-14.**
7. **`oven-bug-sprint/sprint-03-workflow-engine` -- CLOSED cycle-18.**
8. **`module-tenants` DRIFT-6 deferred.** Seed idempotency lock
   cannot be unit-tested without DB-mock infra. Re-open with sprint-04.
9. **Drizzle `getDb()` returns `any`.** Forces casts in seed paths.
10. **Rebase + commit-signing incompatibility.** Do NOT rebase session
    branches -- always merge `dev` in.
11. **Config module registration order.** Currently registered after
    `workflowsModule`. Should be before, but deferred to sprint-03 when
    the `moduleConfigs` table ownership transfers from workflows to config.

## Backup inventory (current)

- `bk/claude-stoic-hamilton-2ylh0-20260412` (cycle-18)
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

## Merge path to `dev` (post cycle-19)

`origin/dev` HEAD is now `59101dc merge(cycle-19): land ui-flows
sprint-01 foundation tests (89 total)`.

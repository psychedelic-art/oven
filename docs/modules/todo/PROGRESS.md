# Todo Queue Progress

Regenerated fresh on 2026-04-12 after **cycle-15b** landing of
`claude/stoic-hamilton-8IRlF` (auth sprint-00 discovery inventory)
onto `origin/dev` as merge commit `0073243`.
Session branch: `claude/stoic-hamilton-8IRlF`.

## Cycle-15b merge audit

| # | Branch | Modules landed | Backup | Tests | Verdict |
|---|--------|----------------|--------|-------|---------|
| 1 | `claude/stoic-hamilton-8IRlF` | auth sprint-00 discovery (inventory.md — 16 hits, 3 call-site migrations) | `bk/claude-stoic-hamilton-8IRlF-20260412` | Docs only — no tests affected. | **MERGED to `origin/dev`** as `0073243` (cycle-15b merge) |

## Cycle-15 merge audit

| # | Branch | Modules landed | Backup | Tests | Verdict |
|---|--------|----------------|--------|-------|---------|
| 1 | `claude/stoic-hamilton-8IRlF` | config sprint-02 (resolve-batch shim, Platform menu, JSON validation in Create/Edit) | `bk/claude-stoic-hamilton-8IRlF-20260412` | `@oven/module-config` 24 (unchanged). | **MERGED to `origin/dev`** as `a65a4dc` (cycle-15 merge) |

## Cycle-14 merge audit (parallel session)

| # | Branch | Modules landed | Backup | Tests | Verdict |
|---|--------|----------------|--------|-------|---------|
| 1 | (parallel) | subscriptions sprint-02 (idempotency key + slug validation, +28 tests) | — | `@oven/module-subscriptions` 52 -> **80** | **MERGED to `origin/dev`** as `c043b36` |
| 2 | (parallel) | oven-bug-sprint sprint-01 (AI Playground UX, 7 findings) | — | — | **MERGED to `origin/dev`** as `aaead06` |

## Active queue (post cycle-15)

| Module / Program | Sprint files | Canonical doc set | Package / tests | Current sprint | Next action |
|---|---|---|---|---|---|
| `auth` | 5 (sprint-00..04) | 11/11 | `@oven/module-auth` exists, 0 tests | **sprint-00 done (cycle-15b)** | Execute sprint-01-foundation. |
| `files` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/module-files`, 29 tests | sprint-02 done | Execute sprint-03-tenant-scoping. |
| `subscriptions` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/module-subscriptions`, 80 tests | sprint-02 done | Execute sprint-03-public-pricing. |
| `tenants` | 5 (sprint-00..04) | 11/11 | LIVE `@oven/module-tenants`, 78 tests | sprint-03 done | Execute sprint-04-acceptance (BLOCKED on DB-mock harness). |
| `config` | 5 (sprint-00..04) | 11/11 | LIVE `@oven/module-config`, 24 tests | **sprint-02 done (cycle-15)** | Execute sprint-03-rls-and-migration. |
| `notifications` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/module-notifications` 48 tests + `@oven/notifications-meta` 21 tests; REGISTERED | sprint-02 done | Execute sprint-03-usage-metering. |
| `module-knowledge-base` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/module-knowledge-base`, 19 tests | sprint-01 done | Execute sprint-02-embedding-pipeline. |
| `ui-flows` | 5 (sprint-00..03, 99) | 11/11 | LIVE `@oven/module-ui-flows` | sprint-00 done | Execute sprint-01-foundation. |
| `agent-ui` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/agent-ui`, 67 tests | sprint-00 not started | Execute sprint-00-discovery drift audit. |
| `dashboard-ux-system` | 8 (sprint-00..07) | N/A (program) | N/A | sprint-00 not started | Execute sprint-01-foundation. |
| `oven-bug-sprint` | 7 (sprint-00..06) | N/A (program) | 291 tests (`module-ai`) | **sprint-01 CLOSED** (cycle-14), sprint-06 CLOSED (cycle-11) | Next: sprint-03 (Workflow engine, 4 findings). Sprints 02/04 remain BLOCKED (module-chat/agent-core absent). |
| `psychedelic-claude-code-migration` | 12 (sprint-00..11) | N/A (program) | N/A | — | Owned elsewhere -- do not touch. |

## Priority order (post cycle-15)

P0: auth sprint-01 (foundation — package skeleton, middleware hardening)
P1: module-knowledge-base sprint-02 (embedding pipeline)
P2: ui-flows sprint-01 (foundation)
P3: agent-ui sprint-00 (discovery)
P4: oven-bug-sprint sprint-03 (workflow engine, 4 findings)
P5: files sprint-03 (tenant scoping)
P6: subscriptions sprint-03 (public pricing)
P7: config sprint-03 (RLS + migration)
P8: notifications sprint-03 (usage metering)
P9: dashboard-ux-system sprint-01 (foundation)
SKIP: tenants sprint-04 (blocked on DB-mock harness)
SKIP: oven-bug-sprint sprint-02/04 (blocked on module-chat/agent-core)
SKIP: psychedelic-claude-code-migration (external ownership)

## Known issues

1. **Pre-existing typecheck baseline on `dev` (465+ errors).** All from
   `packages/workflow-editor/` (peer-dep `react` resolution),
   `RouteHandler` / `"json"` field types in modules, and `@oven/module-ai/*`
   subpath TS2307 errors. Unchanged category across cycles 2-15.
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

## Backup inventory (current)

- `bk/claude-stoic-hamilton-8IRlF-20260412` (cycle-15 -- **new**)
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

## Merge path to `dev` (post cycle-15)

`origin/dev` HEAD is now `a65a4dc merge(cycle-15): land config
sprint-02 dashboard UI`.

QA evidence:
- Cycle-15: inline (24 green, no new test files for this UI sprint)
- Cycle-14 (parallel): inline (subscriptions 80, oven-bug-sprint UX fixes)
- Cycle-13: `docs/modules/todo/qa-reports/` (files sprint-02)
- Cycle-12: inline (notifications 48+21)
- Cycle-11: `docs/modules/todo/oven-bug-sprint/QA-REPORT.md`
- Cycle-10: `docs/modules/todo/qa-reports/claude-inspiring-clarke-IODSY-QA-REPORT.md`

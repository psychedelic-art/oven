# Todo Queue Progress

Regenerated fresh on 2026-04-12 after **cycle-11** landing of
`claude/stoic-hamilton-iouNt` (oven-bug-sprint sprint-06 F-06-02..07 --
VectorStoreRecord + PlaygroundExecutionRecord typed helpers,
TypedFunctionField extraction, render-function lift, import-type sweep,
+47 regression tests) onto `origin/dev` as merge commit `63d5601`.
Session branch: `claude/stoic-hamilton-iouNt`.

## Cycle-11 merge audit

| # | Branch | Modules landed | Backup | Unique content | Tests | Verdict |
|---|--------|----------------|--------|----------------|-------|---------|
| 1 | `claude/stoic-hamilton-iouNt` | `module-ai` F-06-02..07, TypedFunctionField, F-06-04, F-06-05 (closes oven-bug-sprint sprint-06) | `bk/claude-stoic-hamilton-iouNt-20260412` | New `packages/module-ai/src/view/vector-store-record.ts` (VectorStoreRecord + VECTOR_STORE_ADAPTER_COLORS + resolveAdapterColor), new `packages/module-ai/src/view/playground-execution-record.ts` (PlaygroundExecutionRecord + EXECUTION_STATUS_COLORS + EXECUTION_TYPE_COLORS + resolveExecutionStatusColor + resolveExecutionTypeColor + formatCostCents), new `apps/dashboard/src/components/ai/_fields/TypedFunctionField.tsx`, 23 handler files converted to `import type { NextRequest }`. | **+47 vitest tests** (13 vector-store-record + 34 playground-execution-record). `@oven/module-ai` 244 -> **291** all green. | **MERGED to `origin/dev`** as `63d5601` (cycle-11 merge) |

### Phase 0 candidate set (cycle-11)

| Branch | Ahead | Behind | Disposition |
|--------|-------|--------|-------------|
| `claude/inspiring-clarke-0OpL4` | 0 | 51 | content already on dev |
| `claude/inspiring-clarke-GA0Ok` | 0 | 44 | content already on dev |
| `claude/inspiring-clarke-HBa3u` | 0 | 7 | content already on dev (cycle-9) |
| `claude/inspiring-clarke-JGiXk` | 0 | 13 | content already on dev (cycle-8) |
| `claude/inspiring-clarke-JuFO1` | 0 | 36 | content already on dev |
| `claude/inspiring-clarke-LSksg` | 0 | 18 | content already on dev (cycle-7) |
| `claude/inspiring-clarke-M7sl8` | 0 | 40 | content already on dev |
| `claude/inspiring-clarke-bYhvx` | 0 | 25 | content already on dev |
| `claude/inspiring-clarke-e8QUu` | 0 | 29 | content already on dev (cycle-6) |
| `claude/qa-test-todo-module-K2tpT` | 1 | 57 | **BLOCKED** (tsbuildinfo only) |

No unmerged work branches with meaningful content remain.

### Typecheck delta (cycle-11)

| Package | dev (pre cycle-11) | dev (post cycle-11) | delta |
|---|---|---|---|
| `@oven/dashboard` | 461 | 465 | +4 (new subpath TS2307, same category) |
| `@oven/module-ai` | 0 | 0 | 0 |

The +4 delta is from 2 new subpath import modules (`vector-store-record`
x2, `playground-execution-record` x2) in the same TS2307 category as
the existing 28+ `@oven/module-ai/*` subpath errors. Next.js resolves
them correctly at runtime via the package `exports` map.

## Active queue (post cycle-11)

| Module / Program | Sprint files | Canonical doc set | Package / tests | Current sprint | Next action |
|---|---|---|---|---|---|
| `auth` | 5 (sprint-00..04) | 11/11 | `@oven/module-auth` exists, 0 tests | sprint-00-discovery | Execute sprint-00: inventory existing auth code, then sprint-01 foundation. |
| `files` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/module-files`, 10 tests | sprint-01 done | Execute sprint-02-upload-validation. |
| `subscriptions` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/module-subscriptions`, 52 tests | sprint-01 done | Execute sprint-02-usage-metering. |
| `tenants` | 5 (sprint-00..04) | 11/11 | LIVE `@oven/module-tenants`, 78 tests | sprint-03 done | Execute sprint-04-acceptance (BLOCKED on DB-mock harness). |
| `config` | 4 (sprint-00..04) | 11/11 | LIVE `@oven/module-config`, 24 tests | sprint-01 done | Execute sprint-02-dashboard-ui. |
| `notifications` | 5 (sprint-00..05) | 11/11 | LIVE `@oven/module-notifications`, 37 tests; **NOT REGISTERED** | sprint-01 done | **Register in modules.ts**, then execute sprint-02 WhatsApp Meta adapter. |
| `module-knowledge-base` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/module-knowledge-base` | sprint-01 done | Execute sprint-02-embedding-pipeline. |
| `ui-flows` | 5 (sprint-00..03, 99) | 11/11 | LIVE `@oven/module-ui-flows` | sprint-00 done | Execute sprint-01-foundation. |
| `agent-ui` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/agent-ui`, vitest suite | sprint-00 not started | Execute sprint-00-discovery drift audit. |
| `dashboard-ux-system` | 8 (sprint-00..07) | N/A (program) | N/A | sprint-00 not started | Execute sprint-01-foundation. |
| `oven-bug-sprint` | 7 (sprint-00..06) | N/A (program) | 291 tests (`module-ai`) | **sprint-06 CLOSED** (cycle-11) | Next: sprint-01 (AI Playground UX, 8 findings), then sprint-03 (Workflow engine, 4 findings). Sprints 02/04 remain BLOCKED (module-chat/agent-core absent). |
| `psychedelic-claude-code-migration` | 12 (sprint-00..11) | N/A (program) | N/A | — | Owned elsewhere -- do not touch. |

## Priority order (post cycle-11)

Sprint-06 is closed. Updated priorities:

P0: oven-bug-sprint sprint-01 (AI Playground UX, 8 findings)
P1: notifications sprint-02 (register module first, then adapter)
P2: files sprint-02 (upload validation)
P3: subscriptions sprint-02 (usage metering)
P4: config sprint-02 (dashboard UI)
P5: auth sprint-00 (discovery, then sprint-01 foundation)
P6: module-knowledge-base sprint-02 (embedding pipeline)
P7: ui-flows sprint-01 (foundation)
P8: agent-ui sprint-00 (discovery)
P9: dashboard-ux-system sprint-01 (foundation)
P10: oven-bug-sprint sprint-03 (workflow engine, 4 findings)
SKIP: tenants sprint-04 (blocked on DB-mock harness)
SKIP: oven-bug-sprint sprint-02/04 (blocked on module-chat/agent-core)
SKIP: psychedelic-claude-code-migration (external ownership)

## Known issues

1. **Pre-existing typecheck baseline on `dev` (465 errors).** All from
   `packages/workflow-editor/` (peer-dep `react` resolution),
   `RouteHandler` / `"json"` field types in `module-subscriptions` /
   `module-tenants`, and `@oven/module-ai/*` subpath TS2307 errors (32
   total). Unchanged category across cycles 2-11.
2. **`@oven/module-notifications` is not registered.** The package
   scaffolded in cycle-3 is not listed in
   `apps/dashboard/src/lib/modules.ts`. Register before
   `notifications/sprint-02` lands.
3. **`ui-flows` canonical shape uses `sprint-99-acceptance.md`** while
   every other module uses `sprint-NN-acceptance.md`. Minor naming
   inconsistency, not fixing.
4. **`oven-bug-sprint/sprint-05-handler-typesafety` -- CLOSED cycle-9.**
   F-05-01..F-05-05 all done.
5. **`oven-bug-sprint/sprint-06-rule-compliance` -- CLOSED cycle-11.**
   F-06-01..F-06-07 all done. +73 tests across the sprint (218 -> 291).
   4 BO Integration Proposals authored.
6. **`module-tenants` DRIFT-6 deferred.** Seed idempotency lock
   cannot be unit-tested without DB-mock infra. Re-open with sprint-04.
7. **Drizzle `getDb()` returns `any`.** Forces casts in seed paths.
   Still unaddressed, tracked as tech debt.
8. **Rebase + commit-signing incompatibility.** Do NOT rebase session
   branches -- always merge `dev` in.

## Backup inventory (current)

- `bk/claude-stoic-hamilton-iouNt-20260412` (cycle-11 -- **new**)
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

## Merge path to `dev` (post cycle-11)

`origin/dev` HEAD is now `63d5601 merge(cycle-11): land oven-bug-sprint
sprint-06 F-06-02..07`. All sprint-06 work is live.

QA evidence:
- Cycle-11: `docs/modules/todo/oven-bug-sprint/QA-REPORT.md`
- Cycle-10: `docs/modules/todo/qa-reports/claude-inspiring-clarke-IODSY-QA-REPORT.md`
- Cycle-9: `docs/modules/todo/qa-reports/claude-inspiring-clarke-HBa3u-QA-REPORT.md`
- Cycle-8: `docs/modules/todo/qa-reports/claude-inspiring-clarke-JGiXk-QA-REPORT.md`
- Cycle-7: `docs/modules/todo/qa-reports/claude-inspiring-clarke-LSksg-QA-REPORT.md`

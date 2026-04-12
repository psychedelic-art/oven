# Todo Queue Progress

Regenerated fresh on 2026-04-12 after **cycle-24** merge of
`claude/stoic-hamilton-Ucqlg` (notifications sprint-03 usage metering,
87 tests green, +39 new) onto `origin/dev` as merge commit `8f71a06`.
Session branch: `claude/stoic-hamilton-Ucqlg`.

## Phase 0 — Branch discovery (cycle-24)

| Branch | Module | Ahead | Behind | Contents |
|--------|--------|-------|--------|----------|
| `claude/qa-test-todo-module-K2tpT` | (stale) | 1 | 147 | tsbuildinfo artifact only — no feature work |
| `claude/stoic-hamilton-2ylh0` | (tracking) | 2 | 18 | PROGRESS.md + pnpm-lock.yaml update from cycle-19 — superseded |
| `claude/stoic-hamilton-8IRlF` | (tracking) | 1 | 31 | PROGRESS.md update from cycle-17b — superseded |
| `claude/stoic-hamilton-JTmbo` | (tracking) | 1 | 0 | PROGRESS.md update from cycle-23 — superseded by this regen |

No feature branches with unmerged work exist. All inspiring-clarke-*
branches are fully merged (ahead=0). The 4 branches above contain
only tracking files or build artifacts — no actionable feature work.

No shared unmerged ancestors detected across candidates.

## Cycle merge history (complete)

| Cycle | Module | Sprint | Merge SHA | Test delta |
|-------|--------|--------|-----------|------------|
| 4 | auth/tenants/subscriptions | scaffold + tests | `b235741` | +98 |
| 5 | auth/tenants/files/subscriptions | canonical docs + tests | `2c0086c` | +98 |
| 6 | composite | canonical docs + module-ai F-05-01/02 rollout | `80a58ac` | +138 |
| 7 | module-ai | F-05-03 + F-05-04 typed SDK guards | `26d6e1b` | +23 |
| 8 | tenants | sprint-03 security hardening | `1eb20cf` | +50 |
| 9 | module-ai | F-05-05 zod boundary validator | `054ad8c` | +45 |
| 10 | oven-bug-sprint | F-06-01 typed GuardrailRecord | `fa32639` | — |
| 11 | oven-bug-sprint | sprint-06 F-06-02..07 | `63d5601` | — |
| 12 | notifications | sprint-02 meta adapter | `0b710fd` | +21 |
| 13 | files | sprint-02 upload validation | `7f998b5` | — |
| 14 | subscriptions / oven-bug-sprint | sprint-02 + sprint-01 | `c043b36` / `aaead06` | +28 |
| 15 | config / auth | sprint-02 + sprint-00 | `a65a4dc` / `0073243` | — |
| 16 | knowledge-base / ui-flows | sprint-02 + sprint-01 | `948196a` / `2bd0550` | +41 |
| 17 | auth / agent-ui | sprint-01 + sprint-00 | `8e25df9` / `ef8da48` | +14 |
| 18 | oven-bug-sprint | sprint-03 workflow engine | `63b7294` | — |
| 19 | ui-flows | sprint-01 foundation tests | `59101dc` | +89 |
| 20 | auth | sprint-02 authjs adapter tests | `6b8b4d0` | +16 |
| 21 | agent-ui | sprint-01 foundation | `15ffa1b` | — |
| 22 | files | sprint-03 tenant scoping | `f8dc9a9` | — |
| 23 | subscriptions | sprint-03 public pricing | `ff4e60a` | +3 |
| 24 | notifications | sprint-03 usage metering | `8f71a06` | +39 |

## Active queue (post cycle-23)

| Module / Program | Sprint files | Canonical doc set | Package / tests | Current sprint | Next action |
|---|---|---|---|---|---|
| `auth` | 5 (sprint-00..04) | 11/11 | `@oven/module-auth` 30 tests (4 files) | **sprint-02 done (cycle-20)** | Execute sprint-03-dashboard-ui. |
| `files` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/module-files`, 41 tests (6 files) | **sprint-03 done (cycle-22)** | Execute sprint-04-dashboard-ui (BLOCKED on module-auth/ssr F-05). |
| `subscriptions` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/module-subscriptions`, 83 tests (6 files) | **sprint-03 done (cycle-23)** | Execute sprint-04-dashboard-ui. |
| `tenants` | 5 (sprint-00..04) | 11/11 | LIVE `@oven/module-tenants`, 78 tests (4 files) | sprint-03 done (cycle-8) | Execute sprint-04-acceptance (BLOCKED on DB-mock harness). |
| `config` | 5 (sprint-00..04) | 11/11 | LIVE `@oven/module-config`, 24 tests (2 files) | **sprint-02 done (cycle-15)** | Execute sprint-03-rls-and-migration (SEMI-BLOCKED: needs Neon preview branch). |
| `notifications` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/module-notifications` 87 tests + `@oven/notifications-meta` 21 tests; REGISTERED | **sprint-03 done (cycle-24)** | Execute sprint-04-dashboard-ui. |
| `module-knowledge-base` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/module-knowledge-base`, 21 tests (2 files) | **sprint-02 done (cycle-16)** | Execute sprint-03-search-engine (pgvector required). |
| `ui-flows` | 5 (sprint-00..03, 99) | 11/11 | LIVE `@oven/module-ui-flows`, 89 tests (13 files) | **sprint-01 done (cycle-19)** | Execute sprint-02-portal-app. |
| `agent-ui` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/agent-ui`, 71 tests (10 files) | **sprint-01 done (cycle-21)** | Execute sprint-02-session-sidebar (needs module-chat endpoints). |
| `dashboard-ux-system` | 8 (sprint-00..07) | N/A (program) | N/A | sprint-00 not started | Execute sprint-01-foundation. |
| `oven-bug-sprint` | 7 (sprint-00..06) | N/A (program) | 310+ tests (`module-ai` + `module-workflows`) | sprint-01 CLOSED (cycle-14), sprint-03 CLOSED (cycle-18), sprint-05 CLOSED (cycle-9), sprint-06 CLOSED (cycle-11) | No unblocked sprints remain. sprint-02/04 BLOCKED on module-chat/agent-core. |
| `psychedelic-claude-code-migration` | 12 (sprint-00..11) | N/A (program) | N/A | -- | Owned elsewhere -- do not touch. |

## Priority order (post cycle-24)

P0: subscriptions sprint-04 (dashboard UI — dependencies met)
P1: auth sprint-03 (dashboard UI + API keys — large scope)
P2: ui-flows sprint-02 (portal app — large scope, new app)
P3: agent-ui sprint-02 (session sidebar — needs module-chat endpoints)
P4: notifications sprint-04 (dashboard UI — after sprint-03)
P5: dashboard-ux-system sprint-01 (foundation — docs-only bootstrap)
P6: config sprint-03 (RLS + migration — needs Neon preview branch)
P7: knowledge-base sprint-03 (search engine — needs pgvector)
SKIP: files sprint-04 (blocked on auth/ssr F-05)
SKIP: tenants sprint-04 (blocked on DB-mock harness)
SKIP: oven-bug-sprint sprint-02/04 (blocked on module-chat/agent-core)
SKIP: psychedelic-claude-code-migration (external ownership)

## Known issues

1. **Pre-existing typecheck baseline on `dev` (465+ errors).** All from
   `packages/workflow-editor/` (peer-dep `react` resolution),
   `RouteHandler` / `"json"` field types in modules, and `@oven/module-ai/*`
   subpath TS2307 errors. Unchanged category across cycles 2-23.
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

- `bk/claude-stoic-hamilton-Ucqlg-20260412` (cycle-24)
- `bk/claude-stoic-hamilton-JTmbo-20260412` (cycle-23)
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

## Merge path to `dev` (post cycle-23)

`origin/dev` HEAD is now `8f71a06 merge(cycle-24): land notifications
sprint-03 usage metering`.

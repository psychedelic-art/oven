# Todo Queue Progress

Regenerated fresh on 2026-04-13 after **cycle-32** merge of
dashboard-ux-system sprint-03 tenant context onto `origin/dev` as merge
commit `136a1e5`.
Session branch: `claude/stoic-hamilton-tOJfY`.

## Phase 0 -- Branch discovery (cycle-32)

No feature branches with unmerged work exist. 6 stale tracking branches
remain (superseded PROGRESS.md / build artifact updates). All
inspiring-clarke-* branches fully merged.

## Cycle merge history (complete)

| Cycle | Module | Sprint | Merge SHA | Test delta |
|-------|--------|--------|-----------|------------|
| 4 | auth/tenants/subscriptions | scaffold + tests | `b235741` | +98 |
| 5 | auth/tenants/files/subscriptions | canonical docs + tests | `2c0086c` | +98 |
| 6 | composite | canonical docs + module-ai F-05-01/02 rollout | `80a58ac` | +138 |
| 7 | module-ai | F-05-03 + F-05-04 typed SDK guards | `26d6e1b` | +23 |
| 8 | tenants | sprint-03 security hardening | `1eb20cf` | +50 |
| 9 | module-ai | F-05-05 zod boundary validator | `054ad8c` | +45 |
| 10 | oven-bug-sprint | F-06-01 typed GuardrailRecord | `fa32639` | -- |
| 11 | oven-bug-sprint | sprint-06 F-06-02..07 | `63d5601` | -- |
| 12 | notifications | sprint-02 meta adapter | `0b710fd` | +21 |
| 13 | files | sprint-02 upload validation | `7f998b5` | -- |
| 14 | subscriptions / oven-bug-sprint | sprint-02 + sprint-01 | `c043b36` / `aaead06` | +28 |
| 15 | config / auth | sprint-02 + sprint-00 | `a65a4dc` / `0073243` | -- |
| 16 | knowledge-base / ui-flows | sprint-02 + sprint-01 | `948196a` / `2bd0550` | +41 |
| 17 | auth / agent-ui | sprint-01 + sprint-00 | `8e25df9` / `ef8da48` | +14 |
| 18 | oven-bug-sprint | sprint-03 workflow engine | `63b7294` | -- |
| 19 | ui-flows | sprint-01 foundation tests | `59101dc` | +89 |
| 20 | auth | sprint-02 authjs adapter tests | `6b8b4d0` | +16 |
| 21 | agent-ui | sprint-01 foundation | `15ffa1b` | -- |
| 22 | files | sprint-03 tenant scoping | `f8dc9a9` | -- |
| 23 | subscriptions | sprint-03 public pricing | `ff4e60a` | +3 |
| 24 | notifications | sprint-03 usage metering | `8f71a06` | +39 |
| 25 | subscriptions | sprint-04 dashboard UI | `e74fa08` | +5 |
| 26 | auth | sprint-03 dashboard UI | `3cd86b0` | +15 |
| 27 | notifications | sprint-04 dashboard UI | `6168bab` | -- |
| 28 | ui-flows | sprint-02 portal app | `a93d13e` | +26 |
| 29 | dashboard-ux-system | sprint-01 foundation | `e0c2d71` | +26 |
| 30 | ui-flows | sprint-03 editor hardening | `fb8b520` | +39 |
| 31 | dashboard-ux-system | sprint-02 UX audit | `02fc5f9` | -- |
| 32 | dashboard-ux-system | sprint-03 tenant context | `136a1e5` | +3 |

## Active queue (post cycle-32)

| Module / Program | Sprint files | Canonical doc set | Package / tests | Current sprint | Next action |
|---|---|---|---|---|---|
| `auth` | 5 (sprint-00..04) | 11/11 | `@oven/module-auth` 45 tests | **sprint-03 done (cycle-26)** | sprint-04-acceptance (BLOCKED: needs Neon). |
| `files` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/module-files`, 41 tests | **sprint-03 done (cycle-22)** | sprint-04-dashboard-ui (BLOCKED on auth/ssr). |
| `subscriptions` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/module-subscriptions`, 88 tests | **sprint-04 done (cycle-25)** | sprint-05-acceptance (automated pass, manual UI pending). |
| `tenants` | 5 (sprint-00..04) | 11/11 | LIVE `@oven/module-tenants`, 78 tests | sprint-03 done (cycle-8) | sprint-04-acceptance (BLOCKED on DB-mock). |
| `config` | 5 (sprint-00..04) | 11/11 | LIVE `@oven/module-config`, 24 tests | **sprint-02 done (cycle-15)** | sprint-03-rls (BLOCKED: Neon preview). |
| `notifications` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/module-notifications` 87+21 tests; REGISTERED | **sprint-04 done (cycle-27)** | sprint-05-acceptance (depends on KB + agent-core). |
| `module-knowledge-base` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/module-knowledge-base`, 21 tests | **sprint-02 done (cycle-16)** | sprint-03-search (BLOCKED: pgvector). |
| `ui-flows` | 5 (sprint-00..03, 99) | 11/11 | LIVE 89+39+26 tests | **sprint-03 done (cycle-30)** | sprint-99-acceptance (automated pass, manual portal pending). |
| `agent-ui` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/agent-ui`, 71 tests | **sprint-01 done (cycle-21)** | sprint-02 (BLOCKED: needs module-chat). |
| `dashboard-ux-system` | 8 (sprint-00..07) | N/A (program) | LIVE `@oven/dashboard-ui`, 29 tests | **sprint-03 done (cycle-32)** | sprint-04-filter-system. |
| `oven-bug-sprint` | 7 (sprint-00..06) | N/A (program) | 310+ tests | all unblocked sprints CLOSED | sprint-02/04 BLOCKED (module-chat/agent-core). |
| `psychedelic-claude-code-migration` | 12 | N/A | N/A | -- | Owned elsewhere. |

## Priority order (post cycle-32)

P0: dashboard-ux-system sprint-04 (filter system)
P1: ui-flows sprint-99 (acceptance — automated pass, manual portal pending)
P2: subscriptions sprint-05 (acceptance — automated pass, manual UI pending)
SKIP: config sprint-03 (BLOCKED: Neon preview)
SKIP: knowledge-base sprint-03 (BLOCKED: pgvector)
SKIP: auth sprint-04 (BLOCKED: Neon)
SKIP: files sprint-04 (BLOCKED: auth/ssr)
SKIP: tenants sprint-04 (BLOCKED: DB-mock)
SKIP: agent-ui sprint-02 (BLOCKED: module-chat)
SKIP: oven-bug-sprint sprint-02/04 (BLOCKED: module-chat/agent-core)
SKIP: psychedelic-claude-code-migration (external)

## Known issues

1. **Pre-existing typecheck baseline (465+ errors).** Unchanged across cycles.
2. **`useTenantContext` now wired.** DRIFT-1 CLOSED in cycle-32. 19 lists + 16 creates migrated. rule-6-enforcement.test.ts guards against regression.
3. **Permissions default to admin mode.** No authProvider is configured. When one is added, update TenantAwareLayout in AdminApp.tsx.
4. **`ui-flows` sprint-99-acceptance naming.** Minor inconsistency, not fixing.
5-11. (unchanged from prior cycles)

## Backup inventory (current)

- `bk/claude-stoic-hamilton-tOJfY-20260413` (cycle-29)
- (20 additional backup branches from prior cycles)

## Merge path to `dev` (post cycle-32)

`origin/dev` HEAD is now `136a1e5 merge(cycle-32): land dashboard-ux-system
sprint-03 tenant context`.

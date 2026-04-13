# Todo Queue Progress

Regenerated fresh on 2026-04-13 after **cycle-33** merge of
dashboard-ux-system graduation + post-graduation work + @ai-sdk/react
migration + module-chat Sprint 4A.4 closure onto `origin/dev` as merge
commit `<TO_FILL_AFTER_MERGE>`.
Session branch: `claude/dashboard-ux-system-nESUZ`.

## Phase 0 -- Branch discovery (cycle-33)

No feature branches with unmerged work exist after this landing.
All prior `claude/stoic-hamilton-*` and `inspiring-clarke-*` branches
fully merged. The session branch adds 19 commits spanning sprints 04-07
plus post-graduation work.

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
| **33** | **dashboard-ux-system + module-chat + agent-ui** | **graduation + post-grad + AI SDK migration + Sprint 4A.4** | **TBD** | **+82** |

### Cycle-33 contents (19 commits)

- Sprint 04: FilterToolbar + 4 filter primitives + 3 reference list migrations (+34 tests)
- Sprint 05a: useSessionManager + SessionSidebar + stop button + loading indicators (+10 tests)
- Sprint 05b: theme toggle (10 presets) + connection status + layout modes + multi-run execution history
- Sprint 05c: DashboardPlaygroundShell + AIPlaygroundPage rewrite (+9 tests)
- Sprint 06: 5 chrome primitives (PageHeader, EmptyState, LoadingSkeleton, ErrorBoundary, MenuSectionLabel) + 20 tests; CustomMenu migration; KBPlayground rewrite (legacy preserved)
- Sprint 07: acceptance + graduation
- Post-grad: PlaygroundConfigPage admin settings page at /ai/playground-config
- Post-grad: all 49 remaining filter lists migrated (zero inline `const filters = [` remaining)
- Post-grad: AgentPlaygroundPanel rewritten (146 -> 72 lines; legacy preserved)
- Post-grad: @ai-sdk/react migration -- useChatAI + OvenChatTransport + feature-flagged useChat (legacy fallback preserved)
- Post-grad: module-chat Sprint 4A.4 -- processMessageStreaming + bridgeAIStreamToEvents + SSE POST handler

## Active queue (post cycle-33)

| Module / Program | Sprint files | Canonical doc set | Package / tests | Current sprint | Next action |
|---|---|---|---|---|---|
| `auth` | 5 (sprint-00..04) | 11/11 | `@oven/module-auth` 45 tests | **sprint-03 done (cycle-26)** | sprint-04-acceptance (BLOCKED: needs Neon). |
| `files` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/module-files`, 41 tests | **sprint-03 done (cycle-22)** | sprint-04-dashboard-ui (BLOCKED on auth/ssr). |
| `subscriptions` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/module-subscriptions`, 88 tests | **sprint-04 done (cycle-25)** | sprint-05-acceptance (automated pass, manual UI pending). |
| `tenants` | 5 (sprint-00..04) | 11/11 | LIVE `@oven/module-tenants`, 78 tests | sprint-03 done (cycle-8) | sprint-04-acceptance (BLOCKED on DB-mock). |
| `config` | 5 (sprint-00..04) | 11/11 | LIVE `@oven/module-config`, 24 tests | **sprint-02 done (cycle-15)** | sprint-03-rls (BLOCKED: Neon preview). |
| `notifications` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/module-notifications` 87+21 tests; REGISTERED | **sprint-04 done (cycle-27)** | **sprint-05-acceptance UNBLOCKED** (module-chat streaming now live via cycle-33). |
| `module-knowledge-base` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/module-knowledge-base`, 21 tests | **sprint-02 done (cycle-16)** | sprint-03-search (BLOCKED: pgvector). |
| `ui-flows` | 5 (sprint-00..03, 99) | 11/11 | LIVE 89+39+26 tests | **sprint-03 done (cycle-30)** | sprint-99-acceptance (automated pass, manual portal pending). |
| `agent-ui` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/agent-ui`, 81 tests (+10 from cycle-33) | **sprint-01 done (cycle-21)** | **sprint-02 UNBLOCKED** (module-chat streaming + @ai-sdk/react both live via cycle-33). |
| `dashboard-ux-system` | 8 (sprint-00..07) + post-grad | N/A (program) | LIVE `@oven/dashboard-ui` 92 tests + `@oven/agent-ui` 81 tests | **GRADUATED (cycle-33)** | All sprints closed. All deferred items closed. |
| `oven-bug-sprint` | 7 (sprint-00..06) | N/A (program) | 310+ tests | all unblocked sprints CLOSED | **sprint-02/04 UNBLOCKED** (module-chat streaming + agent-core ready via cycle-33). |
| `psychedelic-claude-code-migration` | 12 | N/A | N/A | -- | Owned elsewhere. |

## Priority order (post cycle-33)

P0: `ui-flows` sprint-99-acceptance (fully automated pass, manual portal pending)
P1: `subscriptions` sprint-05-acceptance (automated pass, manual UI pending)
P2: `agent-ui` sprint-02 (NEWLY UNBLOCKED -- chat integration via @ai-sdk/react + backend streaming)
P3: `notifications` sprint-05-acceptance (NEWLY UNBLOCKED -- streaming dependencies resolved)
P4: `oven-bug-sprint` sprint-02 / sprint-04 (NEWLY UNBLOCKED -- module-chat streaming live)
SKIP: `config` sprint-03 (BLOCKED: Neon preview)
SKIP: `knowledge-base` sprint-03 (BLOCKED: pgvector)
SKIP: `auth` sprint-04 (BLOCKED: Neon)
SKIP: `files` sprint-04 (BLOCKED: auth/ssr)
SKIP: `tenants` sprint-04 (BLOCKED: DB-mock)
SKIP: `psychedelic-claude-code-migration` (external)

## Known issues

1. **Pre-existing typecheck baseline (465+ errors).** Unchanged across cycles.
2. ~~**`useTenantContext` now wired.**~~ CLOSED in cycle-32.
3. ~~**Module-chat Sprint 4A.4 (agent invocation pipeline).**~~ CLOSED in cycle-33.
4. **Permissions default to admin mode.** No authProvider is configured. When one is added, update TenantAwareLayout in AdminApp.tsx.
5. **`ui-flows` sprint-99-acceptance naming.** Minor inconsistency, not fixing.
6. **KBPlayground legacy features** -- confidence scores, embedding badges, re-embed triggers preserved in KBPlayground.legacy.tsx for future port if needed.
7. **AgentPlaygroundPanel legacy** -- original hand-rolled inline chat preserved in AgentPlaygroundPanel.legacy.tsx for reference.
8. **useChatLegacy** -- hand-rolled SSE parser preserved as fallback; can be removed after @ai-sdk/react verified in production.

## Backup inventory (current)

- `bk/claude-stoic-hamilton-tOJfY-20260413` (cycle-29)
- `bk/claude-dashboard-ux-system-nESUZ-20260413` (cycle-33, this landing)
- (prior backup branches from cycles 4-28)

## Merge path to `dev` (post cycle-33)

`origin/dev` HEAD will be `<merge-commit> merge(cycle-33): land dashboard-ux-system graduation + @ai-sdk/react migration + module-chat Sprint 4A.4`.

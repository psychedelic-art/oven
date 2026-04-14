# Todo Queue Progress

Regenerated fresh on 2026-04-14 after **cycle-38** merge of notifications
graduation (P5) + oven-bug-sprint sprints 02 & 04 (P6) onto `origin/dev`.
Session branch: `claude/cycle-38-p5-p6-notifications-bugsprint`.

Prior cycles:
- cycle-37 (`00df65b`) — agent-ui sprint-03 widget bundle guardrails
- cycle-36 (`61fc954`) — ui-flows graduation + agent-ui integration polish
- cycle-35 (`9739231`) — agent-ui sprint-02 session sidebar completion
- cycle-34 (`84d0455`) — subscriptions graduation
- cycle-33 (`43f5f14`) — dashboard-ux-system graduation + @ai-sdk/react + module-chat Sprint 4A.4

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
| **33** | **dashboard-ux-system + module-chat + agent-ui** | **graduation + post-grad + AI SDK migration + Sprint 4A.4** | **`43f5f14`** | **+82** |
| **34** | **subscriptions** | **sprint-05 acceptance + graduation** | **`84d0455`** | **0** |
| **35** | **agent-ui + module-chat** | **sprint-02 session sidebar (pin/rename/delete/export)** | **`9739231`** | **+33** |
| **36** | **ui-flows graduation + agent-ui integration polish** | **ui-flows LIVE + useChatAI/OvenChatTransport typecheck fix + barrel exports** | **`61fc954`** | **0** |
| **37** | **agent-ui** | **sprint-03 widget bundle guardrails (size budget + check:size + BROWSER-MATRIX + content hash)** | **`00df65b`** | **+5** |
| **38** | **notifications + oven-bug-sprint** | **P5 graduation + P6 sprints 02/04 close (9 findings, F-02-01 deferred)** | **TBD** | **+12** |

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
| `subscriptions` | **GRADUATED cycle-34** | 11/11 | LIVE `@oven/module-subscriptions`, 88 tests | **all sprints closed** | Graduated out of queue. See IMPLEMENTATION-STATUS.md. |
| `tenants` | 5 (sprint-00..04) | 11/11 | LIVE `@oven/module-tenants`, 78 tests | sprint-03 done (cycle-8) | sprint-04-acceptance (BLOCKED on DB-mock). |
| `config` | 5 (sprint-00..04) | 11/11 | LIVE `@oven/module-config`, 24 tests | **sprint-02 done (cycle-15)** | sprint-03-rls (BLOCKED: Neon preview). |
| `notifications` | **GRADUATED cycle-38** | 11/11 | LIVE `@oven/module-notifications` 87 tests + `@oven/notifications-meta` 21 tests; REGISTERED | all sprints closed | Graduated out of queue. See IMPLEMENTATION-STATUS.md. |
| `module-knowledge-base` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/module-knowledge-base`, 21 tests | **sprint-02 done (cycle-16)** | sprint-03-search (BLOCKED: pgvector). |
| `ui-flows` | **GRADUATED cycle-36** | 11/11 | LIVE 89+39+26 tests | all sprints closed | Graduated out of queue. See IMPLEMENTATION-STATUS.md. |
| `agent-ui` | 6 (sprint-00..05) | 11/11 | LIVE `@oven/agent-ui`, 115 tests + widget bundle 74 kB gzipped | **sprint-03 done (cycle-37)** | sprint-04 accessibility hardening (R11.1..R11.4 + axe). |
| `dashboard-ux-system` | 8 (sprint-00..07) + post-grad | N/A (program) | LIVE `@oven/dashboard-ui` 92 tests + `@oven/agent-ui` 81 tests | **GRADUATED (cycle-33)** | All sprints closed. All deferred items closed. |
| `oven-bug-sprint` | 7 (sprint-00..06) | N/A (program) | 310+ tests | **sprint-02/04 closed (cycle-38) except F-02-01 (schema-adjacent, deferred to BO)** | Only F-02-01 remains (BO IP-2 pending). All other findings (F-02-02..04, F-04-01..05) landed. |
| `psychedelic-claude-code-migration` | 12 | N/A | N/A | -- | Owned elsewhere. |

## Priority order (post cycle-33)

P0: ~~`ui-flows` sprint-99-acceptance~~ GRADUATED in cycle-36
P1: ~~`subscriptions` sprint-05-acceptance~~ GRADUATED in cycle-34
P2: ~~`agent-ui` sprint-02~~ DONE in cycle-35
P3: ~~`agent-ui` sprint-03~~ DONE in cycle-37
P4: ~~`notifications` sprint-05-acceptance~~ GRADUATED in cycle-38
P5: ~~`oven-bug-sprint` sprints 02/04~~ 9/10 findings CLOSED in cycle-38 (F-02-01 deferred to BO)
P6: `agent-ui` sprint-04 (accessibility hardening: R11.1..R11.4 + vitest-axe)
P7: `agent-ui` sprint-05 (graduation)
SKIP: F-02-01 (BO IP-2: archived-session TTL schema proposal pending approval)
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

`origin/dev` HEAD is now `00df65b merge(cycle-37): land agent-ui sprint-03 widget bundle guardrails`.

# Todo Queue Progress

Regenerated fresh on 2026-04-12 after **cycle-10** landing of
`claude/inspiring-clarke-IODSY` (`module-ai` F-06-01 — typed
`GuardrailRecord` view helpers + 26 vitest regression tests) onto
`origin/dev` as merge commit `fa32639` (PR #27). Dev HEAD is now
`35b3ca9` (cycle-10 QA report PR #28). Session branch for cycle-11:
`claude/stoic-hamilton-bVxUR`.

## Cycle-10 merge audit

| # | Branch | Modules landed | Backup | Unique content | Tests | Verdict |
|---|--------|----------------|--------|----------------|-------|---------|
| 1 | `claude/inspiring-clarke-IODSY` | `module-ai` F-06-01 (oven-bug-sprint sprint-06) | `bk/claude-inspiring-clarke-IODSY-20260412` | New `packages/module-ai/src/view/guardrail-record.ts` (`GuardrailRecord` interface + `GUARDRAIL_ACTION_COLORS` + `resolveGuardrailActionColor` + `truncateGuardrailPattern` pure helpers); updated 4 `FunctionField` call sites in `GuardrailList.tsx` from `record: any` to `<FunctionField<GuardrailRecord>>`; +26 vitest regression tests. | `@oven/module-ai` 218 → **244** all green. | **MERGED to `origin/dev`** as `fa32639` (PR #27) |
| 2 | `claude/qa-test-todo-module-K2tpT` | — | `bk/claude-qa-test-todo-module-K2tpT-20260411` (cycle-2) | Only a regenerated `apps/dashboard/tsconfig.tsbuildinfo` (build artifact). 1 ahead, 57 behind dev. | — | **BLOCKED** — build artifacts must not be committed (unchanged verdict across cycles 2..10) |

### Phase 0 candidate set (cycle-11)

| Branch | Ahead | Behind | Disposition |
|--------|-------|--------|-------------|
| `claude/inspiring-clarke-0OpL4` | 0 | 51 | content already on dev (predecessor cycles) |
| `claude/inspiring-clarke-GA0Ok` | 0 | 44 | content already on dev (predecessor cycles) |
| `claude/inspiring-clarke-HBa3u` | 0 | 7 | content already on dev (cycle-9) |
| `claude/inspiring-clarke-JGiXk` | 0 | 13 | content already on dev (cycle-8) |
| `claude/inspiring-clarke-JuFO1` | 0 | 36 | content already on dev (predecessor cycles) |
| `claude/inspiring-clarke-LSksg` | 0 | 18 | content already on dev (cycle-7) |
| `claude/inspiring-clarke-M7sl8` | 0 | 40 | content already on dev (predecessor cycles) |
| `claude/inspiring-clarke-bYhvx` | 0 | 25 | content already on dev (cycle-7) |
| `claude/inspiring-clarke-e8QUu` | 0 | 29 | content already on dev (cycle-6) |
| `claude/qa-test-todo-module-K2tpT` | 1 | 57 | **BLOCKED** (tsbuildinfo only) |
| `claude/stoic-hamilton-iouNt` | 0 | 0 | at parity with dev |

### Shared unmerged ancestors

Only `claude/qa-test-todo-module-K2tpT` has unique content (1 commit —
`apps/dashboard/tsconfig.tsbuildinfo` build artifact). No shared
unmerged ancestors across candidates.

### Typecheck delta (cycle-10)

| Package | dev (`054ad8c`, pre cycle-10) | dev (`35b3ca9`, post cycle-10) | delta |
|---|---|---|---|
| `@oven/dashboard` | 460 | 460 | 0 |
| `@oven/module-ai` | 0 | 0 | 0 |

No regression. The 460 dashboard errors remain from
`packages/workflow-editor/` peer-dep React typing and `RouteHandler`
context-param patterns in `module-subscriptions` / `module-tenants`;
none are touched by cycle-10.

## Active queue (post cycle-10)

| Module / Program | Sprint files | Canonical doc set | Package / tests | Next action |
|---|---|---|---|---|
| `auth` | 5 (sprint-00..04-acceptance) | complete (11/11) | no package yet | Execute `sprint-00-discovery`. |
| `files` | 6 (sprint-00..05-acceptance) | complete (11/11) | LIVE package, **10 tests** | Execute `sprint-02-upload-validation`. |
| `subscriptions` | 6 (sprint-00..05-acceptance) | complete (11/11) | **52 tests** green | Execute `sprint-02-usage-metering`. |
| `tenants` | 5 (sprint-00..04-acceptance) | complete (11/11) | **78 tests** green | sprint-04-acceptance (blocked on DB-mock harness). |
| `config` | 4 (sprint-00..04) | complete (11/11) | 24 tests green | Execute `sprint-02-dashboard-ui`. |
| `notifications` | 5 (sprint-00..05) | complete (11/11) | 37 tests green; NOT registered in dashboard | Register module, then `sprint-02` WhatsApp Meta adapter. |
| `module-knowledge-base` | 6 (sprint-00..05-acceptance) | complete (11/11) | 2 test files | Execute `sprint-02` embedding pipeline. |
| `ui-flows` | 5 (sprint-00..03, 99-acceptance) | complete (11/11) | 0 tests | Execute `sprint-01-foundation`. |
| `oven-bug-sprint` | 7 (sprint-00..06) | N/A (program) | **244** module-ai tests; sprint-05 CLOSED; sprint-06 F-06-01 done (cycle-10) | **Execute F-06-02..07** (cycle-11 P0). |
| `agent-ui` | 6 (sprint-00..05-acceptance) | complete (11/11) | LIVE package, 7 test files | Execute `sprint-00-discovery` drift audit. |
| `dashboard-ux-system` | 8 (sprint-00..07) | N/A (program) | — | Execute `sprint-01-foundation`. |
| `psychedelic-claude-code-migration` | 12 (sprint-00..11) | N/A (program) | — | Owned elsewhere — do not touch. |

## Known issues

1. **Pre-existing typecheck baseline on `dev` (460 errors).** All from
   `packages/workflow-editor/` (peer-dep `react` resolution) and
   `RouteHandler` / `"json"` field types in `module-subscriptions` /
   `module-tenants`. Unchanged by cycle-9. Fix: add `react` / `react-dom`
   as dev deps to `packages/workflow-editor`; widen `RouteHandler`
   context typings; replace `"json"` field types with the `jsonb`
   drizzle column helper.
2. **`@oven/module-notifications` is not registered.** Register before
   `notifications/sprint-02` lands.
3. **`ui-flows` canonical shape uses `sprint-99-acceptance.md`** —
   minor naming inconsistency.
4. **`oven-bug-sprint/sprint-06` F-06-01 landed cycle-10.** F-06-02..07
   are cycle-11 P0 work.
5. **`module-tenants` sprint-04 blocked on DB-mock harness.**
6. **Drizzle `getDb()` returns `any`.** Tech debt, tracked.
7. **Rebase + commit-signing incompatibility.** Never rebase — always
   merge dev in.

## Backup inventory (current)

Cumulative backups pushed under `bk/<original>-<YYYYMMDD>`:

- `bk/claude-inspiring-clarke-IODSY-20260412` (cycle-10 — **new**)
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

## Merge path to `dev` (post cycle-10)

`origin/dev` HEAD is now `35b3ca9 docs(qa): cycle-10 QA report for IODSY
(#28)`. Cycle-10 F-06-01 is live. Session branch for cycle-11:
`claude/stoic-hamilton-bVxUR`.

QA evidence:
- Cycle-10: `docs/modules/todo/oven-bug-sprint/QA-REPORT.md` (IODSY)
- Cycle-9: `qa-reports/claude-inspiring-clarke-HBa3u-QA-REPORT.md`
- Cycle-8: `qa-reports/claude-inspiring-clarke-JGiXk-QA-REPORT.md`
- Cycle-7: `qa-reports/claude-inspiring-clarke-LSksg-QA-REPORT.md`

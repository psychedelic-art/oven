# Todo Queue Progress

Regenerated fresh on 2026-04-11 after cycle-5 merge of
`claude/inspiring-clarke-JuFO1` (strict linear superset of
`inspiring-clarke-0OpL4`, `inspiring-clarke-GA0Ok`, and
`inspiring-clarke-M7sl8`) into the session branch
`claude/inspiring-clarke-e8QUu`.

## Cycle-5 merge audit

| # | Branch | Modules landed | Backup | Unique content | Tests | Verdict |
|---|--------|----------------|--------|----------------|-------|---------|
| 1 | `claude/inspiring-clarke-JuFO1` | `auth`, `files`, `subscriptions`, `tenants`, `module-ai`/`module-files` F-05-01 | `bk/claude-inspiring-clarke-JuFO1-20260411` | Canonical 11-file doc shape for **auth + files + subscriptions + tenants**; todo sprint plans for all four; `getOrderColumn` helper duplicated per BO-IP-4 into `module-ai` (+8 tests) and `module-files` (+10 tests); `GET /api/files` sort hardening; pure `computeBillingCycle` + `resolveEffectiveLimit` + `computeRemaining` + `isAllowed` helpers (+52 tests); `usage-metering` refactored to delegate to pure helpers; `computeBusinessHours` hardening (+28 tests); 4 archived QA reports | **98/98 new tests green** (8 module-ai sort-guard, 10 module-files sort-guard, 52 module-subscriptions, 28 module-tenants) | **MERGED** to session branch `claude/inspiring-clarke-e8QUu` via `--no-ff` merge commit `2c0086c` |
| 2 | `claude/inspiring-clarke-M7sl8` | (contained in JuFO1) | `bk/claude-inspiring-clarke-M7sl8-20260411` | — | — | SUPERSEDED by JuFO1 |
| 3 | `claude/inspiring-clarke-GA0Ok` | (contained in JuFO1) | `bk/claude-inspiring-clarke-GA0Ok-20260411` | — | — | SUPERSEDED by JuFO1 |
| 4 | `claude/inspiring-clarke-0OpL4` | (contained in JuFO1) | `bk/claude-inspiring-clarke-0OpL4-20260411` | — | — | SUPERSEDED by JuFO1 |
| 5 | `claude/qa-test-todo-module-K2tpT` | — | `bk/claude-qa-test-todo-module-K2tpT-20260411` | Only a regenerated `apps/dashboard/tsconfig.tsbuildinfo` (build artifact) | — | **BLOCKED** — build artifacts must not be committed (unchanged from prior cycle) |

### Typecheck delta (cycle-5)

Compared before/after `2c0086c` against `origin/dev`:

| Package | dev baseline | after cycle-5 | delta |
|---|---|---|---|
| `@oven/module-ai` | 0 | 0 | 0 |
| `@oven/module-files` | 0 | 0 | 0 |
| `@oven/module-subscriptions` | 40 | 40 | 0 |
| `@oven/module-tenants` | 18 | 18 | 0 |

No regression. The 40-error `module-subscriptions` baseline is
pre-existing `RouteHandler` context-param typings + a handful of
`"json"` field-type values in `src/index.ts`. The 18-error
`module-tenants` baseline is the same `RouteHandler` pattern.
Neither is introduced by this branch.

## Active queue (post cycle-5)

| Module / Program | Sprint files | Canonical doc set | Package / tests | Next action |
|---|---|---|---|---|
| `auth` | 5 (sprint-00..04-acceptance) | complete (11/11) | no package yet | Execute `sprint-00-discovery` — inventory existing auth code before writing `sprint-01-foundation` package skeleton. |
| `files` | 6 (sprint-00..05-acceptance) | complete (11/11) | LIVE package, **10 tests** (sort-guard) | F-05-01 already landed. Execute `sprint-02-upload-validation`. |
| `subscriptions` | 6 (sprint-00..05-acceptance) | complete (11/11) | **52 tests** green | Execute `sprint-02-usage-metering` (thread pure resolver through every call site + integration tests). |
| `tenants` | 5 (sprint-00..04-acceptance) | complete (11/11) | **28 tests** green | Execute `sprint-03-security-hardening` (R3.5 id leak fix, last-owner guard, `MAX_MEMBERS_PER_TENANT`, sort allowlist). |
| `config` | 4 (sprint-00..04) | complete (11/11) | 24 tests green | Execute `sprint-02-dashboard-ui`. |
| `notifications` | 5 (sprint-00..05) | complete (11/11) | 37 tests green; package NOT registered in `apps/dashboard/src/lib/modules.ts` | Register module in dashboard, then execute `sprint-02` WhatsApp Meta adapter. |
| `module-knowledge-base` | 5 (sprint-00..05) | **partial** (`Readme.md` only — 10 files missing) | — | Fill missing canonical doc files; then execute `sprint-02` embedding pipeline. |
| `ui-flows` | 5 (sprint-00..03, 99-acceptance) | complete (11/11) | — | Execute `sprint-01-foundation`. |
| `oven-bug-sprint` | 7 (sprint-00..06) | N/A (program) | F-05-01 + F-05-02 done in `module-ai` (9/9 handlers) and `module-files` (1/1 handler) | **F-05-02 done cycle-5 Phase 4.** Next open: F-05-03 (`ai-providers-test.handler.ts` sdkProvider typing), F-05-04 (`ai-transcribe.handler.ts` shape guard), F-05-05 (`ai-generate-object.handler.ts` zod schema). |
| `agent-ui` | 6 (sprint-00..05-acceptance) | complete (11/11) — scaffolded cycle-5 Phase 3 | LIVE package, existing tests (vitest + @testing-library/react) | Execute `sprint-00-discovery` drift audit, then `sprint-01-foundation` (type tighten + MUI-ban lint). |
| `dashboard-ux-system` | 8 (sprint-00..07) | N/A (program) | — | Execute `sprint-01-foundation`. |
| `psychedelic-claude-code-migration` | 12 (sprint-00..11) | N/A (program) | — | Owned elsewhere — do not touch. |

## Known issues

1. **Pre-existing typecheck baseline on `dev`.** All from
   `packages/workflow-editor/` (peer-dep `react` resolution) and a
   few `RouteHandler` / `"json"` field types in
   `module-subscriptions`/`module-tenants`. Unchanged by cycle-5.
   Fix: add `react`/`react-dom` as dev deps to `packages/workflow-editor`;
   widen `RouteHandler` context typings; replace `"json"` field types
   with the `jsonb` drizzle column helper.
2. **`@oven/module-notifications` is not registered.** The package
   scaffolded in cycle-3 is not listed in
   `apps/dashboard/src/lib/modules.ts`. Register before
   `notifications/sprint-02` lands.
3. **`module-knowledge-base` canonical doc shape is incomplete.** Only
   `docs/modules/knowledge-base/Readme.md` exists on dev.
4. **`ui-flows` canonical shape uses `sprint-99-acceptance.md`** while
   every other module uses `sprint-NN-acceptance.md`. Minor naming
   inconsistency.
5. **`oven-bug-sprint/sprint-05-handler-typesafety` F-05-02 DONE cycle-5.**
   The `getOrderColumn` helper is rolled to all 9 `module-ai` list
   handlers (`ai-playground-executions`, `ai-tools`, `ai-guardrails`,
   `ai-usage-logs`, `ai-aliases`, `ai-budgets`, `ai-providers`,
   `ai-vector-stores`, `ai-budget-alerts`). New `ai-sort-guard-rollout.test.ts`
   adds 40 tests (5 scenarios × 8 handlers). `module-ai` suite: 150/150
   green (was 110). Remaining open items in sprint-05: F-05-03, F-05-04,
   F-05-05.
6. **Drizzle `getDb()` returns `any`.** Forces casts in seed paths.
   Still unaddressed, tracked as tech debt.
7. **Rebase + commit-signing incompatibility.** The code-sign server
   returns `400 { "error": "missing source" }` when `git rebase`
   replays commits. Direct merge commits (`--no-ff`) sign cleanly.
   Operational guidance: do NOT rebase session branches — always
   merge `dev` in, never rebase onto it.

## Backup inventory (current)

All session branches have pushed backups on remote under
`bk/<original>-20260411`:

- `bk/claude-inspiring-clarke-JuFO1-20260411` (cycle-5 composite — current)
- `bk/claude-inspiring-clarke-M7sl8-20260411` (cycle-4 predecessor)
- `bk/claude-inspiring-clarke-GA0Ok-20260411` (cycle-3 predecessor)
- `bk/claude-inspiring-clarke-0OpL4-20260411` (cycle-2 predecessor)
- `bk/claude-qa-test-todo-module-K2tpT-20260411` (blocked)
- `bk/claude-dashboard-ux-system-nESUZ-20260411`
- `bk/claude-eager-curie-TXjZZ-20260411` (ui-flows)
- `bk/claude-eager-curie-LRIhN-20260411` (module-knowledge-base)
- `bk/claude-eager-curie-INifN-20260411` (config)
- `bk/claude-eager-curie-4GaQC-20260411` (notifications)
- `bk/claude-eager-curie-0da9Q-20260411` (oven-bug-sprint)
- `bk/claude-eager-curie-3Wkp7-20260411` (redundant, preserved)

## Merge path to `dev`

Cycle-5 work lives on session branch
`claude/inspiring-clarke-e8QUu`. Landing it onto `dev` requires
explicit user approval via PR (matching prior cycles #25, #26).
No PR is opened automatically per repository policy. When the
user is ready, the recommended PR title is:

> `merge(cycle-5): land auth+files+subscriptions+tenants canonical docs + 98 unit tests`

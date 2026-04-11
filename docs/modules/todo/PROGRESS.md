# Todo Queue Progress

Regenerated fresh on 2026-04-11 after cycle-7 landing of
`claude/inspiring-clarke-bYhvx` (F-05-03 typed SDK provider guard)
onto the session branch `claude/inspiring-clarke-LSksg`. Previous
cycle-6 merge `80a58ac` remains the current `origin/dev` HEAD.

## Cycle-7 merge audit

| # | Branch | Modules landed | Backup | Unique content | Tests | Verdict |
|---|--------|----------------|--------|----------------|-------|---------|
| 1 | `claude/inspiring-clarke-bYhvx` | `module-ai` F-05-03 | `bk/claude-inspiring-clarke-bYhvx-20260411` | `provider-types.ts` (`AiSdkProvider` + `ProviderNotCallableError` + `assertCallableProvider` asserts guard); refactor of `ai-providers-test.handler.ts` removing three `(sdkProvider as any)(...)` casts (502 surface on typed failure); 11 regression tests in `provider-callable-guard.test.ts`; sprint-05 row `[ ] → [x]` for F-05-03; STATUS.md tick; cycle-6 PROGRESS+README regeneration folded in via the same branch | **11 new tests** (full shape-guard matrix) — `@oven/module-ai` total 161/161 green (was 150) | **MERGED** to session branch `claude/inspiring-clarke-LSksg` via `--no-ff` |
| 2 | `claude/qa-test-todo-module-K2tpT` | — | `bk/claude-qa-test-todo-module-K2tpT-20260411` | Only a regenerated `apps/dashboard/tsconfig.tsbuildinfo` (build artifact) | — | **BLOCKED** — build artifacts must not be committed (unchanged from prior cycles) |

### Typecheck delta (cycle-7)

Dashboard `tsc --noEmit` baseline under the session branch:

| Package | dev baseline | after cycle-7 | delta |
|---|---|---|---|
| `@oven/dashboard` | 460 | 460 | 0 |
| `@oven/module-ai` | 0 | 0 | 0 |
| `@oven/module-files` | 0 | 0 | 0 |
| `@oven/module-subscriptions` | 40 | 40 | 0 |
| `@oven/module-tenants` | 18 | 18 | 0 |

No regression. Pre-existing 460 dashboard errors are driven by
`packages/workflow-editor/` peer-dep React typing and the
`RouteHandler` context-param patterns in `module-subscriptions` /
`module-tenants`; none are touched by this cycle.

## Active queue (post cycle-7)

| Module / Program | Sprint files | Canonical doc set | Package / tests | Next action |
|---|---|---|---|---|
| `auth` | 5 (sprint-00..04-acceptance) | complete (11/11) | no package yet | Execute `sprint-00-discovery` — inventory existing auth code before writing `sprint-01-foundation` package skeleton. |
| `files` | 6 (sprint-00..05-acceptance) | complete (11/11) | LIVE package, **10 tests** (sort-guard) | F-05-01 already landed. Execute `sprint-02-upload-validation`. |
| `subscriptions` | 6 (sprint-00..05-acceptance) | complete (11/11) | **52 tests** green | Execute `sprint-02-usage-metering` (thread pure resolver through every call site + integration tests). |
| `tenants` | 5 (sprint-00..04-acceptance) | complete (11/11) | **28 tests** green | Execute `sprint-03-security-hardening` (R3.5 id leak fix, last-owner guard, `MAX_MEMBERS_PER_TENANT`, sort allowlist). |
| `config` | 4 (sprint-00..04) | complete (11/11) | 24 tests green | Execute `sprint-02-dashboard-ui`. |
| `notifications` | 5 (sprint-00..05) | complete (11/11) | 37 tests green; package NOT registered in `apps/dashboard/src/lib/modules.ts` | Register module in dashboard, then execute `sprint-02` WhatsApp Meta adapter. |
| `module-knowledge-base` | 6 (sprint-00..05-acceptance) | complete (11/11) — cycle-7 audit re-verified | — | Execute `sprint-02` embedding pipeline. |
| `ui-flows` | 5 (sprint-00..03, 99-acceptance) | complete (11/11) | — | Execute `sprint-01-foundation`. |
| `oven-bug-sprint` | 7 (sprint-00..06) | N/A (program) | F-05-01 + F-05-02 + **F-05-03** done in `module-ai` | **F-05-03 done cycle-7.** Next open: F-05-04 (`ai-transcribe.handler.ts` shape guard), F-05-05 (`ai-generate-object.handler.ts` zod schema). |
| `agent-ui` | 6 (sprint-00..05-acceptance) | complete (11/11) | LIVE package, vitest suite | Execute `sprint-00-discovery` drift audit, then `sprint-01-foundation` (type tighten + MUI-ban lint). |
| `dashboard-ux-system` | 8 (sprint-00..07) | N/A (program) | — | Execute `sprint-01-foundation`. |
| `psychedelic-claude-code-migration` | 12 (sprint-00..11) | N/A (program) | — | Owned elsewhere — do not touch. |

## Known issues

1. **Pre-existing typecheck baseline on `dev`.** All from
   `packages/workflow-editor/` (peer-dep `react` resolution) and a
   few `RouteHandler` / `"json"` field types in
   `module-subscriptions`/`module-tenants`. Unchanged by cycle-7.
   Fix: add `react`/`react-dom` as dev deps to `packages/workflow-editor`;
   widen `RouteHandler` context typings; replace `"json"` field types
   with the `jsonb` drizzle column helper.
2. **`@oven/module-notifications` is not registered.** The package
   scaffolded in cycle-3 is not listed in
   `apps/dashboard/src/lib/modules.ts`. Register before
   `notifications/sprint-02` lands.
3. **`module-knowledge-base` canonical doc shape — CORRECTED cycle-7.**
   Previous PROGRESS.md entries flagged this module as partial
   (`Readme.md` only). A fresh re-audit (cycle-7 Phase 3) against the
   graduated `docs/modules/knowledge-base/` folder confirms **all 11
   canonical files are present with real content** (Readme 122L,
   UI 531L, api 693L, architecture 348L, database 412L,
   detailed-requirements 235L, module-design 314L, prompts 230L,
   references 112L, secure 261L, use-case-compliance 271L). The stale
   flag is removed; next action is `sprint-02` embedding pipeline
   execution. The same audit confirmed every other todo module with a
   sibling `docs/modules/<module>/` folder has the complete 11/11
   shape (agent-ui, auth, config, files, notifications, subscriptions,
   tenants, ui-flows). The three programs
   (`dashboard-ux-system`, `oven-bug-sprint`,
   `psychedelic-claude-code-migration`) do not require a canonical
   folder by design.
4. **`ui-flows` canonical shape uses `sprint-99-acceptance.md`** while
   every other module uses `sprint-NN-acceptance.md`. Minor naming
   inconsistency.
5. **`oven-bug-sprint/sprint-05-handler-typesafety`.**
   F-05-01 (cycle-3), F-05-02 (cycle-5), **F-05-03 (cycle-7)** done.
   Remaining open: F-05-04 (ai-transcribe shape guard) and F-05-05
   (ai-generate-object zod schema).
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

- `bk/claude-inspiring-clarke-bYhvx-20260411` (cycle-7 — **new**)
- `bk/claude-inspiring-clarke-e8QUu-20260411` (cycle-6 composite)
- `bk/claude-inspiring-clarke-JuFO1-20260411` (cycle-5 composite)
- `bk/claude-inspiring-clarke-M7sl8-20260411` (cycle-4 predecessor)
- `bk/claude-inspiring-clarke-GA0Ok-20260411` (cycle-3 predecessor)
- `bk/claude-inspiring-clarke-0OpL4-20260411` (cycle-2 predecessor)
- `bk/claude-qa-test-todo-module-K2tpT-20260411` (blocked)
- `bk/claude-dashboard-ux-system-nESUZ-20260411`

## Merge path to `dev`

Cycle-7 work lives on session branch
`claude/inspiring-clarke-LSksg`. Landing it onto `dev` requires
explicit user approval via PR (matching prior cycles #25, #26 and
`80a58ac`). No PR is opened automatically per repository policy.
When the user is ready, the recommended PR title is:

> `merge(cycle-7): land module-ai F-05-03 typed SDK provider guard (+11 tests)`

and the body should reference
`docs/modules/todo/qa-reports/claude-inspiring-clarke-bYhvx-QA-REPORT.md`.

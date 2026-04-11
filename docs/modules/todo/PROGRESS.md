# Todo Queue Progress

Regenerated fresh on 2026-04-11 after cycle-7 merge of
`claude/inspiring-clarke-LSksg` (strict linear superset of
`claude/inspiring-clarke-bYhvx`) onto `origin/dev` as merge commit
`26d6e1b`. Session branch: `claude/inspiring-clarke-JGiXk`.

## Cycle-7 merge audit

| # | Branch | Modules landed | Backup | Unique content | Tests | Verdict |
|---|--------|----------------|--------|----------------|-------|---------|
| 1 | `claude/inspiring-clarke-LSksg` | `module-ai` F-05-03 **+ F-05-04** | `bk/claude-inspiring-clarke-LSksg-20260411` | New `packages/module-ai/src/engine/provider-types.ts` (`AiSdkProvider` interface, `ProviderNotCallableError`, `assertCallableProvider` asserts guard, `ProviderSubClientNotCallableError`, `resolveSubClientModel` helper); refactor of `ai-providers-test.handler.ts` removing three `(sdkProvider as any)(...)` casts; refactor of `ai-transcribe.handler.ts` removing `(openai as any).transcription?.(model) ?? (openai as any)(model)` fallback with a critical no-top-level-fallback invariant; 23 regression tests across `provider-callable-guard.test.ts` + `provider-sub-client-guard.test.ts`; sprint-05 rows F-05-03 + F-05-04 `[ ] → [x]`; STATUS.md tick; cycle-6 PROGRESS+README regeneration folded in via the same branch | **23 new tests** — `@oven/module-ai` total **173/173 green** (was 150 on dev; +11 from F-05-03, +12 from F-05-04) | **MERGED** to `origin/dev` via `--no-ff` merge commit `26d6e1b` |
| 2 | `claude/inspiring-clarke-bYhvx` | (contained in LSksg) | `bk/claude-inspiring-clarke-bYhvx-20260411` | — | — | SUPERSEDED by LSksg (strict linear superset via intra-session merge `bfb944e`) |
| 3 | `claude/qa-test-todo-module-K2tpT` | — | `bk/claude-qa-test-todo-module-K2tpT-20260411` | Only a regenerated `apps/dashboard/tsconfig.tsbuildinfo` (build artifact) | — | **BLOCKED** — build artifacts must not be committed (unchanged from cycles 4-6) |

### Typecheck delta (cycle-7)

Dashboard `tsc --noEmit` baseline, reproduced in-worktree at
`/home/user/wt-LSksg` post-`pnpm install`:

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
| `files` | 6 (sprint-00..05-acceptance) | complete (11/11) | LIVE package, **10 tests** (sort-guard) | F-05-01 landed. Execute `sprint-02-upload-validation`. |
| `subscriptions` | 6 (sprint-00..05-acceptance) | complete (11/11) | **52 tests** green | Execute `sprint-02-usage-metering` (thread pure resolver through every call site + integration tests). |
| `tenants` | 5 (sprint-00..04-acceptance) | complete (11/11) | **28 tests** green | Execute `sprint-03-security-hardening` (R3.5 id leak fix, last-owner guard, `MAX_MEMBERS_PER_TENANT`, sort allowlist). |
| `config` | 4 (sprint-00..04) | complete (11/11) | 24 tests green | Execute `sprint-02-dashboard-ui`. |
| `notifications` | 5 (sprint-00..05) | complete (11/11) | 37 tests green; package NOT registered in `apps/dashboard/src/lib/modules.ts` | Register module in dashboard, then execute `sprint-02` WhatsApp Meta adapter. |
| `module-knowledge-base` | 6 (sprint-00..05-acceptance) | complete (11/11) — cycle-7 audit re-verified | — | Execute `sprint-02` embedding pipeline. |
| `ui-flows` | 5 (sprint-00..03, 99-acceptance) | complete (11/11) | — | Execute `sprint-01-foundation`. |
| `oven-bug-sprint` | 7 (sprint-00..06) | N/A (program) | F-05-01 + F-05-02 + F-05-03 + F-05-04 done in `module-ai` (**173/173** green) | **F-05-03 + F-05-04 done cycle-7.** Remaining open: **F-05-05** (`ai-generate-object.handler.ts` zod schema validation of the tool schema before passing to AI SDK). |
| `agent-ui` | 6 (sprint-00..05-acceptance) | complete (11/11) | LIVE package, vitest suite | Execute `sprint-00-discovery` drift audit, then `sprint-01-foundation` (type tighten + MUI-ban lint). |
| `dashboard-ux-system` | 8 (sprint-00..07) | N/A (program) | — | Execute `sprint-01-foundation`. |
| `psychedelic-claude-code-migration` | 12 (sprint-00..11) | N/A (program) | — | Owned elsewhere — do not touch. |

## Known issues

1. **Pre-existing typecheck baseline on `dev` (460 errors).** All from
   `packages/workflow-editor/` (peer-dep `react` resolution) and
   `RouteHandler` / `"json"` field types in
   `module-subscriptions` / `module-tenants`. Unchanged by cycle-7.
   Fix: add `react` / `react-dom` as dev deps to
   `packages/workflow-editor`; widen `RouteHandler` context typings;
   replace `"json"` field types with the `jsonb` drizzle column helper.
2. **`@oven/module-notifications` is not registered.** The package
   scaffolded in cycle-3 is not listed in
   `apps/dashboard/src/lib/modules.ts`. Register before
   `notifications/sprint-02` lands.
3. **`module-knowledge-base` canonical doc shape.** Cycle-7 Phase 3
   audit re-confirmed **all 11 canonical files present with real
   content** under `docs/modules/knowledge-base/`. The historical
   "partial (Readme.md only)" flag is retired. Every other todo
   module with a sibling `docs/modules/<module>/` folder has the
   complete 11/11 shape (agent-ui, auth, config, files, notifications,
   subscriptions, tenants, ui-flows). The three programs
   (`dashboard-ux-system`, `oven-bug-sprint`,
   `psychedelic-claude-code-migration`) do not require a canonical
   folder by design.
4. **`ui-flows` canonical shape uses `sprint-99-acceptance.md`** while
   every other module uses `sprint-NN-acceptance.md`. Minor naming
   inconsistency.
5. **`oven-bug-sprint/sprint-05-handler-typesafety`.**
   F-05-01 (cycle-3), F-05-02 (cycle-5), F-05-03 + F-05-04 (cycle-7)
   all landed on `dev`. `packages/module-ai/src/api/` now has zero
   `as any` on sdkProvider / sub-client resolution in every handler
   except `ai-generate-object.handler.ts:26`, which is the last
   remaining open finding (F-05-05: run the tool schema through zod
   before passing it to `ai.generateObject`).
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

- `bk/claude-inspiring-clarke-LSksg-20260411` (cycle-7 composite — **new**)
- `bk/claude-inspiring-clarke-bYhvx-20260411` (cycle-7 F-05-03 subset — **new**)
- `bk/claude-inspiring-clarke-e8QUu-20260411` (cycle-6 composite)
- `bk/claude-inspiring-clarke-JuFO1-20260411` (cycle-5 composite)
- `bk/claude-inspiring-clarke-M7sl8-20260411` (cycle-4 predecessor)
- `bk/claude-inspiring-clarke-GA0Ok-20260411` (cycle-3 predecessor)
- `bk/claude-inspiring-clarke-0OpL4-20260411` (cycle-2 predecessor)
- `bk/claude-qa-test-todo-module-K2tpT-20260411` (blocked)
- `bk/claude-dashboard-ux-system-nESUZ-20260411`

## Merge path to `dev`

Cycle-7 (LSksg) landed on `origin/dev` as merge commit `26d6e1b`
with message:

> `merge(cycle-7): land module-ai F-05-03 + F-05-04 typed SDK guards (+23 tests)`

QA evidence: `qa-reports/claude-inspiring-clarke-LSksg-QA-REPORT.md`
(+ the pre-existing `claude-inspiring-clarke-bYhvx-QA-REPORT.md`).

Session branch `claude/inspiring-clarke-JGiXk` is fast-forward
ahead of `dev` by the session-local commits from the current
cycle-8 work (QA report + this PROGRESS regeneration + any Phase 3
/ Phase 4 deliverables). No PR is open against `dev` from this
branch at the time of writing.

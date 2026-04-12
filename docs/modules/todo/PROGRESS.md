# Todo Queue Progress

Regenerated fresh on 2026-04-12 after **cycle-9** landing of
`claude/inspiring-clarke-HBa3u` (`module-ai` F-05-05 — zod boundary
validator for `POST /api/ai/generate-object` + `GenerateObjectSchema<T>`
union widening + 45 regression tests) onto `origin/dev` as merge commit
`054ad8c` on top of cycle-8 `1eb20cf`. Session branch:
`claude/inspiring-clarke-IODSY`.

## Cycle-9 merge audit

| # | Branch | Modules landed | Backup | Unique content | Tests | Verdict |
|---|--------|----------------|--------|----------------|-------|---------|
| 1 | `claude/inspiring-clarke-HBa3u` | `module-ai` F-05-05 (closes oven-bug-sprint sprint-05) | `bk/claude-inspiring-clarke-HBa3u-20260412` | New `packages/module-ai/src/api/_utils/generate-object-input.ts` (zod `generateObjectInputSchema` covering `prompt / schema / model / system / temperature / maxTokens / tenantId`, `jsonSchemaObjectSchema` refine-gate requiring one of `type / $ref / $schema / properties / items / oneOf / anyOf / allOf / enum / const / not`, `parseGenerateObjectInput` pure verdict returning `{ ok, value } \| { ok: false, reason, field }`); handler rewrite of `ai-generate-object.handler.ts` dropping three hand-rolled `typeof` guards + the `(schema as any)` cast on line 26 while preserving the historical 400 error strings byte-for-byte; widening of `GenerateObjectParams<T>.schema` to `GenerateObjectSchema<T> = z.ZodSchema<T> \| Schema<T>` in `tools/generate-object.ts` to match the AI SDK union; sprint-05 row F-05-05 `[ ] → [x]`; oven-bug-sprint `STATUS.md` sprint-05 row flipped to ✅ Done (cycle-8/9 notes). | **+45 vitest tests** (happy-path, every structural JSON-Schema keyword, prompt / schema / optional-field rejection, prototype-bypass normalisation). `@oven/module-ai` 173 → **218** all green. | **MERGED to `origin/dev`** as `054ad8c` (cycle-9 `--no-ff`) |
| 2 | `claude/qa-test-todo-module-K2tpT` | — | `bk/claude-qa-test-todo-module-K2tpT-20260411` (cycle-2) | Only a regenerated `apps/dashboard/tsconfig.tsbuildinfo` (build artifact). 1 ahead, 45 behind dev. | — | **BLOCKED** — build artifacts must not be committed (unchanged verdict across cycles 2..9) |

### Phase 0 candidate set (cycle-9)

| Branch | Ahead | Behind | Disposition |
|--------|-------|--------|-------------|
| `claude/inspiring-clarke-0OpL4` | 0 | 39 | content already on dev (predecessor cycles) |
| `claude/inspiring-clarke-GA0Ok` | 0 | 32 | content already on dev (predecessor cycles) |
| `claude/inspiring-clarke-HBa3u` | 5 | 0 | **landed cycle-9 → `054ad8c`** |
| `claude/inspiring-clarke-JGiXk` | 0 | 1 | content already on dev (cycle-8) |
| `claude/inspiring-clarke-JuFO1` | 0 | 24 | content already on dev (predecessor cycles) |
| `claude/inspiring-clarke-LSksg` | 0 | 6 | content already on dev (cycle-7) |
| `claude/inspiring-clarke-M7sl8` | 0 | 28 | content already on dev (predecessor cycles) |
| `claude/inspiring-clarke-bYhvx` | 0 | 13 | content already on dev (cycle-7) |
| `claude/inspiring-clarke-e8QUu` | 0 | 17 | content already on dev (cycle-6) |
| `claude/qa-test-todo-module-K2tpT` | 1 | 45 | **BLOCKED** (tsbuildinfo only) |

### Shared unmerged ancestors

`git log --format=%H` over `dev..HBa3u` and `dev..K2tpT` produces six
distinct SHAs (`b54d1d4`, `9ac35af`, `4559384`, `b98d131`, `e9e8063`,
`1ffa9c1`) with **zero overlap**. No shared unmerged ancestor required
pre-landing this cycle.

### Typecheck delta (cycle-9)

| Package | dev (`1eb20cf`, pre cycle-9) | dev (`054ad8c`, post cycle-9) | delta |
|---|---|---|---|
| `@oven/dashboard` | 460 | 460 | 0 |
| `@oven/module-ai` | 0 | 0 | 0 |
| `@oven/module-files` | 0 | 0 | 0 |
| `@oven/module-subscriptions` | 40 | 40 | 0 |
| `@oven/module-tenants` | 18 | 18 | 0 |

No regression. The 460 dashboard errors still come from
`packages/workflow-editor/` peer-dep React typing and `RouteHandler`
context-param patterns in `module-subscriptions` / `module-tenants`;
none are touched by this cycle.

## Active queue (post cycle-9)

| Module / Program | Sprint files | Canonical doc set | Package / tests | Next action |
|---|---|---|---|---|
| `auth` | 5 (sprint-00..04-acceptance) | complete (11/11) | no package yet | Execute `sprint-00-discovery` — inventory existing auth code before writing `sprint-01-foundation` package skeleton. |
| `files` | 6 (sprint-00..05-acceptance) | complete (11/11) | LIVE package, **10 tests** (sort-guard) | F-05-01 landed. Execute `sprint-02-upload-validation`. |
| `subscriptions` | 6 (sprint-00..05-acceptance) | complete (11/11) | **52 tests** green | Execute `sprint-02-usage-metering` (thread pure resolver through every call site + integration tests). |
| `tenants` | 5 (sprint-00..04-acceptance) | complete (11/11) | **78 tests** green | sprint-03 landed cycle-8. Next: `sprint-04-acceptance` (blocked on DB-mock harness) and DRIFT-6 seed-idempotency lock (same blocker). |
| `config` | 4 (sprint-00..04) | complete (11/11) | 24 tests green | Execute `sprint-02-dashboard-ui`. |
| `notifications` | 5 (sprint-00..05) | complete (11/11) | 37 tests green; package NOT registered in `apps/dashboard/src/lib/modules.ts` | Register module in dashboard, then execute `sprint-02` WhatsApp Meta adapter. |
| `module-knowledge-base` | 6 (sprint-00..05-acceptance) | complete (11/11) | — | Execute `sprint-02` embedding pipeline. |
| `ui-flows` | 5 (sprint-00..03, 99-acceptance) | complete (11/11) | — | Execute `sprint-01-foundation`. |
| `oven-bug-sprint` | 7 (sprint-00..06) | N/A (program) | F-05-01..**F-05-05** done in `module-ai` (**218/218** green; sprint-05 CLOSED cycle-9) | Sprint-05 closed. Next program work: `sprint-06-cross-cutting-rule-compliance` (7 findings) or unblock `sprint-02 / sprint-04` once `module-chat` / `module-agent-core` land. |
| `agent-ui` | 6 (sprint-00..05-acceptance) | complete (11/11) | LIVE package, vitest suite | Execute `sprint-00-discovery` drift audit, then `sprint-01-foundation` (type tighten + MUI-ban lint). |
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
2. **`@oven/module-notifications` is not registered.** The package
   scaffolded in cycle-3 is not listed in
   `apps/dashboard/src/lib/modules.ts`. Register before
   `notifications/sprint-02` lands.
3. **`ui-flows` canonical shape uses `sprint-99-acceptance.md`** while
   every other module uses `sprint-NN-acceptance.md`. Minor naming
   inconsistency, not fixing in this cycle.
4. **`oven-bug-sprint/sprint-05-handler-typesafety` — CLOSED cycle-9.**
   F-05-01..F-05-05 all done. `packages/module-ai/src/api/` has
   **zero** `(schema as any) / (sdkProvider as any) / (sub-client as
   any)`. The only remaining `as any` under `src/api/` is the unrelated
   `ai-tools-all.handler.ts:18 (mod as any).chat`, which belongs to a
   different finding (sprint-06 candidate).
5. **`module-tenants` DRIFT-6 deferred.** Seed idempotency lock is
   tracked but cannot be unit-tested without DB-mock infra. The seed
   already uses `onConflictDoNothing()`. Re-open once the DB-mock
   harness is available (sprint-04 dependency).
6. **Drizzle `getDb()` returns `any`.** Forces casts in seed paths.
   Still unaddressed, tracked as tech debt.
7. **Rebase + commit-signing incompatibility.** The code-sign server
   returns `400 { "error": "missing source" }` when `git rebase`
   replays commits. Direct merge commits (`--no-ff`) sign cleanly.
   Operational guidance: do NOT rebase session branches — always merge
   `dev` in, never rebase onto it.

## Backup inventory (current)

Cumulative backups pushed under `bk/<original>-<YYYYMMDD>`:

- `bk/claude-inspiring-clarke-HBa3u-20260412` (cycle-9 — **new**)
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

## Merge path to `dev` (post cycle-9)

`origin/dev` HEAD is now `054ad8c merge(cycle-9): land module-ai F-05-05
zod boundary validator (+45 tests)`. The cycle-9 work is live. The
session branch for the current pipeline run is
`claude/inspiring-clarke-IODSY`; all Phase 1/3/4 work in this run sits
on top of `054ad8c`.

QA evidence:
- Cycle-9: `qa-reports/claude-inspiring-clarke-HBa3u-QA-REPORT.md`
- Cycle-8: `qa-reports/claude-inspiring-clarke-JGiXk-QA-REPORT.md`
- Cycle-7: `qa-reports/claude-inspiring-clarke-LSksg-QA-REPORT.md`

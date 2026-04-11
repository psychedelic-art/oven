# Todo Queue Progress

Regenerated fresh on 2026-04-11 after cycle-6 merge `80a58ac`
landed `claude/inspiring-clarke-e8QUu` (strict linear superset of
the four earlier `inspiring-clarke-*` session branches) onto
`origin/dev` via `--no-ff`.

## Cycle-6 merge audit

| # | Branch | Modules landed | Backup | Unique content | Tests | Verdict |
|---|--------|----------------|--------|----------------|-------|---------|
| 1 | `claude/inspiring-clarke-e8QUu` | `auth`, `tenants`, `subscriptions`, `files`, `agent-ui`, `module-ai` F-05-01 + F-05-02 | `bk/claude-inspiring-clarke-e8QUu-20260411` | Canonical 11-file doc shape for **auth + tenants + subscriptions + files + agent-ui**; 5 todo sprint programs; `getOrderColumn` helper in `module-ai` + rollout to all 9 AI list handlers; parallel helper in `module-files`; `computeBusinessHours` hardening; `resolveEffectiveLimit` + `billingCycle` pure helpers; `oven-bug-sprint` F-05-02 marked done | **240/240 green** (150 module-ai, 52 module-subscriptions, 28 module-tenants, 10 module-files; **138 new this cycle**) | **MERGED** to `origin/dev` as `--no-ff` merge commit `80a58ac` |
| 2 | `claude/inspiring-clarke-JuFO1` | (subset of e8QUu) | `bk/claude-inspiring-clarke-JuFO1-20260411` | — | — | SUPERSEDED by e8QUu |
| 3 | `claude/inspiring-clarke-M7sl8` | (subset of e8QUu) | `bk/claude-inspiring-clarke-M7sl8-20260411` | — | — | SUPERSEDED by e8QUu |
| 4 | `claude/inspiring-clarke-GA0Ok` | (subset of e8QUu) | `bk/claude-inspiring-clarke-GA0Ok-20260411` | — | — | SUPERSEDED by e8QUu |
| 5 | `claude/inspiring-clarke-0OpL4` | (subset of e8QUu) | `bk/claude-inspiring-clarke-0OpL4-20260411` | — | — | SUPERSEDED by e8QUu |
| 6 | `claude/qa-test-todo-module-K2tpT` | — | `bk/claude-qa-test-todo-module-K2tpT-20260411` | Only a regenerated `apps/dashboard/tsconfig.tsbuildinfo` (build artifact) | — | **BLOCKED** — build artifacts must not be committed (carried over from prior cycle) |

### Branch discovery (diff-based, not name-based)

Built the Phase 0 candidate set from every remote branch with `ahead > 0`
against `origin/dev`. Six `claude/*` heads and six `bk/*` heads qualified.
Superset analysis reduced the real work to **one** non-superseded head:

```
rev-list origin/claude/inspiring-clarke-{0OpL4,GA0Ok,JuFO1,M7sl8} \
  ^origin/claude/inspiring-clarke-e8QUu    →   0 / 0 / 0 / 0
```

`e8QUu` also descended directly from `origin/dev` HEAD
(merge-base = `6aa3dc8`), so no rebase was required — the merge was a
pure fast-forward-able delta wrapped in `--no-ff` for history clarity.

No shared unmerged ancestors outside the linear chain.

### Tests + typecheck (cycle-6)

Ran in a fresh `../wt-e8QUu` worktree with
`pnpm install --frozen-lockfile` (~1m) before the merge:

| Package | Test files | Tests | Result |
|---|---|---|---|
| `@oven/module-ai` | 12 | 150 | green |
| `@oven/module-files` | 1 | 10 | green |
| `@oven/module-subscriptions` | 3 | 52 | green |
| `@oven/module-tenants` | 1 | 28 | green |
| **Totals** | **17** | **240** | **green** |

`pnpm --filter @oven/dashboard exec tsc --noEmit` → **460 errors**,
identical to pre-existing `dev` baseline (all in `packages/workflow-editor`
and `packages/agent-ui`, neither touched by this branch). Zero
regressions.

## Active queue (post cycle-6 on `dev`)

| Module / Program | Sprint files | Canonical doc set | Package / tests | Next action |
|---|---|---|---|---|
| `auth` | 5 (sprint-00..04-acceptance) | complete (11/11) | no package yet | Execute `sprint-00-discovery` — inventory existing auth code before writing `sprint-01-foundation` package skeleton. |
| `tenants` | 5 (sprint-00..04-acceptance) | complete (11/11) | **28 tests** green | Execute `sprint-03-security-hardening` (R3.5 id-leak fix, last-owner guard, `MAX_MEMBERS_PER_TENANT`, sort allowlist rollout to tenants handlers). |
| `subscriptions` | 6 (sprint-00..05-acceptance) | complete (11/11) | **52 tests** green | Execute `sprint-02-usage-metering` (thread the pure resolver through every call site + integration tests). |
| `files` | 6 (sprint-00..05-acceptance) | complete (11/11) | 10 tests (sort-guard) | Execute `sprint-02-upload-validation`. |
| `agent-ui` | 6 (sprint-00..05-acceptance) | complete (11/11) | LIVE package | Execute `sprint-00-discovery` drift audit, then `sprint-01-foundation` (type tighten + MUI-ban lint). |
| `config` | 4 (sprint-00..04) | complete (11/11) | 24 tests green | Execute `sprint-02-dashboard-ui`. |
| `notifications` | 5 (sprint-00..05) | complete (11/11) | 37 tests green; NOT registered in `apps/dashboard/src/lib/modules.ts` | Register module in dashboard, then execute `sprint-02` WhatsApp Meta adapter. |
| `module-knowledge-base` | 5 (sprint-00..05) | **partial** (`Readme.md` only — 10 files missing) | — | Fill missing canonical doc files; then execute `sprint-02-embedding-pipeline`. |
| `ui-flows` | 5 (sprint-00..03, 99-acceptance) | complete (11/11) | — | Execute `sprint-01-foundation`. |
| `oven-bug-sprint` | 7 (sprint-00..06) | N/A (program) | F-05-01 + F-05-02 done across 9 `module-ai` + 1 `module-files` handler | Execute F-05-03 (`ai-providers-test.handler.ts` sdkProvider typing). |
| `dashboard-ux-system` | 8 (sprint-00..07) | N/A (program) | — | Execute `sprint-01-foundation`. |
| `psychedelic-claude-code-migration` | 12 (sprint-00..11) | N/A (program) | — | Owned elsewhere — do not touch. |

## Known issues

1. **Pre-existing typecheck baseline on `dev` = 460.** All from
   `packages/workflow-editor/` (peer-dep `react` resolution) and
   `packages/agent-ui/**`. Not introduced by cycle-6. Fix: add
   `react`/`react-dom` as dev deps to `packages/workflow-editor`;
   widen `RouteHandler` context typings in
   `module-subscriptions`/`module-tenants`.
2. **`@oven/module-notifications` is not registered** in
   `apps/dashboard/src/lib/modules.ts`. Register before
   `notifications/sprint-02` lands.
3. **`module-knowledge-base` canonical doc shape is incomplete.**
   Only `docs/modules/knowledge-base/Readme.md` exists on `dev`.
4. **`ui-flows` canonical shape uses `sprint-99-acceptance.md`** while
   every other module uses `sprint-NN-acceptance.md`. Minor naming
   inconsistency.
5. **Drizzle `getDb()` returns `any`.** Forces casts in seed paths.
   Tracked as tech debt.
6. **Rebase + commit-signing incompatibility.** The code-sign server
   returns `400 { "error": "missing source" }` when `git rebase`
   replays commits. Direct merge commits (`--no-ff`) sign cleanly.
   Operational guidance: do NOT rebase session branches — always
   merge `dev` in, never rebase onto it.
7. **`claude/qa-test-todo-module-K2tpT` still blocked.** It only
   touches `apps/dashboard/tsconfig.tsbuildinfo`. Build artifacts
   must not be committed. Backup preserved; no merge.

## Backup inventory (current)

All session branches have pushed backups on remote under
`bk/<original>-20260411`:

- `bk/claude-inspiring-clarke-e8QUu-20260411` (cycle-6 composite — landed)
- `bk/claude-inspiring-clarke-JuFO1-20260411` (cycle-5 predecessor)
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

## Landed on `dev`

- `80a58ac` — `merge(cycle-6): land auth/tenants/subscriptions/files/agent-ui canonical docs + module-ai F-05-01/F-05-02 rollout (138 new tests)`
- `6aa3dc8` (prior) — `docs(dashboard-ux-system): bootstrap program folder + 8 sprint files (#26)`
- `bafe894` (prior) — `merge pipeline: land 5 todo-module feature branches + idempotent DB (#25)`

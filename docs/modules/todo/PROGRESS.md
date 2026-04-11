# Todo Queue Progress

Regenerated after the 2026-04-11 merge pipeline landed two additional
feature branches onto the session branch `claude/inspiring-clarke-GA0Ok`,
on top of the five branches that were already rolled up by PR #25
(`bafe894`).

## Merge audit — 2026-04-11 (cycle 2)

| # | Branch | Module / Program | Backup | Unique content | Tests | Verdict |
|---|--------|------------------|--------|----------------|-------|---------|
| 1 | `claude/qa-test-todo-module-K2tpT` | — (build artifact) | `bk/claude-qa-test-todo-module-K2tpT-20260411` | `apps/dashboard/tsconfig.tsbuildinfo` only (1 byte) | — | **BLOCK** — TypeScript incremental build cache, should be gitignored |
| 2 | `claude/dashboard-ux-system-nESUZ` | `dashboard-ux-system` (program) | `bk/claude-dashboard-ux-system-nESUZ-20260411` | 13 docs files: README, STATUS, PROMPT, CODE-REVIEW, business-owner + 8 sprint files (`sprint-00-discovery` → `sprint-07-acceptance`) | — (docs only) | **MERGED** → `a3bfcdc` |
| 3 | `claude/inspiring-clarke-0OpL4` | `auth` (scaffold) + `ai` (F-05-01) | `bk/claude-inspiring-clarke-0OpL4-20260411` | `docs/modules/auth/` canonical 11-file shape, `docs/modules/todo/auth/` sprint plan, `packages/module-ai/src/api/_utils/sort.ts` + handler fix + 8 new vitest cases, oven-bug-sprint cross-links, K2tpT block QA report | **8 new** (110 total) pass | **MERGED** → `de5036f` |

Cycle 2 cumulative test additions: **8 new unit tests** in
`@oven/module-ai` (allowlist enforcement, prototype-key guard,
SQL-shaped input, empty string, case sensitivity, column identity).

### Previous merge cycle (PR #25 — already on `dev`)

| # | Branch | Module | Backup |
|---|--------|--------|--------|
| 1 | `claude/eager-curie-TXjZZ` | `ui-flows` | `bk/claude-eager-curie-TXjZZ-20260411` |
| 2 | `claude/eager-curie-LRIhN` | `module-knowledge-base` | `bk/claude-eager-curie-LRIhN-20260411` |
| 3 | `claude/eager-curie-INifN` | `config` (+ 24 tests) | `bk/claude-eager-curie-INifN-20260411` |
| 4 | `claude/eager-curie-4GaQC` | `notifications` (+ 37 tests, new `@oven/module-notifications`) | `bk/claude-eager-curie-4GaQC-20260411` |
| 5 | `claude/eager-curie-0da9Q` | `oven-bug-sprint` | `bk/claude-eager-curie-0da9Q-20260411` |
| 6 | `claude/eager-curie-3Wkp7` | — (dropped, redundant PROGRESS.md) | `bk/claude-eager-curie-3Wkp7-20260411` |

Lifetime test additions across both cycles: **69 new unit tests**
(`@oven/module-config` 24, `@oven/module-notifications` 37,
`@oven/module-ai` 8).

## Tracking-file rule

`PROGRESS.md` and `docs/modules/todo/README.md` are regenerated at the
**end** of each merge cycle from the freshly merged session branch, not
on individual feature branches. Any incoming branch edits to these two
files are dropped during merge per the Phase-1 pipeline rule.

## DB state

Unchanged since cycle 1 — the cycle-2 merges did not touch seed or
reset scripts. Seed pipeline is still idempotent:

- `packages/module-subscriptions/src/seed.ts` — `INSERT … ON CONFLICT DO UPDATE`.
- `packages/module-knowledge-base/src/seed.ts` — reuse-by-slug, upsert categories, check-then-insert entries.
- `apps/dashboard/src/lib/reset-indexes.ts` — `pnpm db:reindex` script.
- `apps/dashboard/src/lib/proxy-bootstrap.ts` — CLI-only undici `ProxyAgent` bootstrap.

## Active queue (after cycle 2 merges)

| Module / Program | Sprint files | Canonical doc set | Package / tests | Next action |
|---|---|---|---|---|
| `ui-flows` | 5 (sprint-00..03, 99-acceptance) | complete | — | Execute sprint-01 foundation |
| `config` | 4 (sprint-00..04) | complete | 24 tests green | Execute sprint-02 dashboard UI |
| `notifications` | 5 (sprint-00..05) | complete | 37 tests green; package NOT registered in dashboard `modules.ts` | Register in dashboard; execute sprint-02 WhatsApp Meta adapter |
| `module-knowledge-base` | 5 (sprint-00..05) | partial (`Readme.md` only — needs 10 more files) | — | Fill missing canonical doc files; execute sprint-02 embedding pipeline |
| `oven-bug-sprint` | 6 (sprint-00..06) | N/A (program, not module) | F-05-01 landed this cycle | Execute sprint-06 (remaining handler typesafety items) |
| `auth` | 5 (sprint-00..04) | complete (**new this cycle**) | — | Execute sprint-01 foundation (`packages/module-auth/` scaffold) |
| `dashboard-ux-system` | 8 (sprint-00..07) | N/A (program, not module) | — | Execute sprint-01 foundation (`packages/dashboard-ui/` scaffold) |
| `psychedelic-claude-code-migration` | 12 (sprint-00..11) | N/A | — | Owned elsewhere — do not touch |

## Known issues (cycle 2)

1. **Pre-existing typecheck baseline of 460 errors on `dev`.** Carried
   over from cycle 1. All from `packages/workflow-editor/` — `react`
   listed as peer dep with no dev dep. Not caused by this merge.

2. **`@oven/module-notifications` is not registered.** Still pending
   from cycle 1. Follow-up commit should register it once sprint-02
   (WhatsApp Meta adapter) lands.

3. **`module-knowledge-base` canonical doc shape is incomplete.** Only
   `docs/modules/knowledge-base/Readme.md` exists. The other 10 files
   in the canonical shape are missing. Candidate for Phase-3 research.

4. **`ui-flows` canonical shape uses `sprint-99-acceptance.md`** while
   every other module uses `sprint-NN-acceptance.md`. Minor, not blocking.

5. **Drizzle `getDb()` returns `any`.** Cycle-1 tech debt — still open.

6. **`claude/qa-test-todo-module-K2tpT` branch carries
   `tsconfig.tsbuildinfo`.** Build artifact should be added to
   `.gitignore` and stripped from the tree. Tracked under
   `oven-bug-sprint` as a follow-up.

7. **`pnpm-lock.yaml` corruption on upstream session branches.** Cycle
   2's inspiring-clarke branch arrived with a duplicated
   `packages/module-files:` mapping and a duplicated `dequal@2.0.3`
   entry. The corrupt lockfile was dropped from the merge; the
   session-branch lockfile was untouched and `pnpm install` still works.
   Root cause investigation tracked under `oven-bug-sprint`.

## Backup inventory (cumulative)

Cycle 1 (all pushed to `origin`):

- `bk/claude-eager-curie-TXjZZ-20260411`
- `bk/claude-eager-curie-LRIhN-20260411`
- `bk/claude-eager-curie-INifN-20260411`
- `bk/claude-eager-curie-4GaQC-20260411`
- `bk/claude-eager-curie-0da9Q-20260411`
- `bk/claude-eager-curie-3Wkp7-20260411`

Cycle 2 (pushed to `origin` on 2026-04-11):

- `bk/claude-qa-test-todo-module-K2tpT-20260411`
- `bk/claude-dashboard-ux-system-nESUZ-20260411`
- `bk/claude-inspiring-clarke-0OpL4-20260411`

## QA reports

- `docs/modules/todo/qa-reports/claude-qa-test-todo-module-K2tpT-QA-REPORT.md` — BLOCK
- `docs/modules/todo/qa-reports/claude-dashboard-ux-system-nESUZ-QA-REPORT.md` — MERGE
- `docs/modules/todo/qa-reports/claude-inspiring-clarke-0OpL4-QA-REPORT.md` — MERGE

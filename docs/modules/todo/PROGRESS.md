# Todo Queue Progress

Regenerated on 2026-04-11 by session `claude/inspiring-clarke-0OpL4`
after syncing with `origin/dev` at `bafe894` (merge pipeline #25).

## Phase 0 — Branch discovery (diff-based)

All remote branches were enumerated and filtered by
`git rev-list --count origin/dev..<branch> > 0`.

| # | Branch | Ahead | Behind | Module (derived) | Shared ancestors | Verdict |
|---|--------|-------|--------|------------------|------------------|---------|
| 1 | `origin/claude/qa-test-todo-module-K2tpT` | 1 | 1 | — (no module path touched) | none | **BLOCK** — tsbuildinfo churn only, see `qa-reports/claude-qa-test-todo-module-K2tpT-QA-REPORT.md` |

No other remote branches are ahead of `origin/dev`. No shared unmerged
ancestors exist (the only candidate diverges by a single unique commit
touching only `apps/dashboard/tsconfig.tsbuildinfo`).

All prior feature branches (`ui-flows`, `config`, `notifications`,
`module-knowledge-base`, `oven-bug-sprint`) were merged into `dev` in
PR `#25` on 2026-04-11 with backups under `bk/claude-eager-curie-*`.

## Phase 1 — Todo module audit

| Module / Program | Canonical doc set | Sprint files | Package / tests | Next action |
|---|---|---|---|---|
| `ui-flows` | ✅ `docs/modules/ui-flows/` (11 files) | 5 (sprint-00..03, 99-acceptance) | — | Execute `sprint-01-foundation` |
| `config` | ✅ `docs/modules/config/` (11 files) | 5 (sprint-00..04) | 24 cascade-resolver tests green | Execute `sprint-02-dashboard-ui` |
| `notifications` | ✅ `docs/modules/notifications/` (11 files) | 6 (sprint-00..05) | 37 tests green; `@oven/module-notifications` scaffolded but **not registered** in `apps/dashboard/src/lib/modules.ts` | Register in dashboard; execute `sprint-02-whatsapp-meta-adapter` |
| `module-knowledge-base` | ✅ `docs/modules/knowledge-base/` (11 files, pre-existing) | 6 (sprint-00..05) | — | Execute `sprint-02-embedding-pipeline` |
| `oven-bug-sprint` | n/a (program, not module) | 7 (sprint-00..06) | inventory.md exists | Execute `sprint-01-ai-playground-ux` or `sprint-05-handler-typesafety` (BO-prioritised) |
| `psychedelic-claude-code-migration` | n/a (program) | 12 (sprint-00..11) | — | Owned externally — do not touch |
| `auth` (new, scaffolded this session) | ✅ `docs/modules/auth/` (11 files) | 5 (sprint-00..04) | — | Execute `sprint-01-foundation` |

> Correction vs. the previous PROGRESS.md: `docs/modules/knowledge-base/`
> already contains the full canonical 11-file shape on `dev`. The
> earlier "only `Readme.md` exists" note was stale and has been
> dropped.

## Phase 2 — Per-branch merge outcomes (this session)

| Branch | Backup | Tests | Recommendation | Merge SHA | Notes |
|--------|--------|-------|----------------|-----------|-------|
| `claude/qa-test-todo-module-K2tpT` | _not created_ | n/a | **BLOCK** | — | Build-cache churn only; no unique feature/doc content. See QA report. |

No AskUserQuestion merge gate was raised — only one candidate, and its
QA verdict is a block.

## Phase 3 — Module scaffolded this session

`docs/modules/todo/auth/` — 11 canonical doc files and 5 sprint plan
files covering discovery → foundation → policy → dashboard UI →
acceptance, mapped to ground-truth rule `docs/modules/17-auth.md`.

## Phase 4 — Feature shipped this session

`oven-bug-sprint/sprint-05-handler-typesafety` finding **F-05-01** —
`(table as any)[params.sort]` replaced with an allowlist-driven
`getOrderColumn` helper in `packages/module-ai/src/api/_utils/sort.ts`,
applied to `ai-playground-executions.handler.ts`, plus a
rejection test in `ai-sort-guard.test.ts`.

## Known issues (rolled forward)

1. **Typecheck baseline of 460 errors on `dev`.** All from
   `packages/workflow-editor/` because `react` is a peer dep without a
   dev dep. Fix: add `react`/`react-dom` as dev deps to that package.
   Still open; not addressed this session.
2. **`@oven/module-notifications` is not registered** in
   `apps/dashboard/src/lib/modules.ts`. Still open.
3. **`apps/dashboard/tsconfig.tsbuildinfo` is tracked in git** with no
   `.gitignore` coverage, producing noise branches like
   `claude/qa-test-todo-module-K2tpT`. Cleanup queued as a future
   Phase 4 candidate: gitignore + `git rm --cached`.
4. **Drizzle `getDb()` returns `any`.** Existing tech debt.

## Backup inventory (preserved from the 2026-04-11 merge pipeline)

- `bk/claude-eager-curie-TXjZZ-20260411` (`ui-flows`)
- `bk/claude-eager-curie-LRIhN-20260411` (`module-knowledge-base`)
- `bk/claude-eager-curie-INifN-20260411` (`config`)
- `bk/claude-eager-curie-4GaQC-20260411` (`notifications`)
- `bk/claude-eager-curie-0da9Q-20260411` (`oven-bug-sprint`)
- `bk/claude-eager-curie-3Wkp7-20260411` (redundant PROGRESS.md branch, preserved for audit)

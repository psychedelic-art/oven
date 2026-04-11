# Todo Queue Progress

Regenerated after the 2026-04-11 merge pipeline landed five feature
branches onto the session branch `claude/qa-test-todo-module-K2tpT`.

## Merge audit

All branches were diffed against the shared ancestor `d4865d2` (PR #21,
"Docs/feature module ai conventions") which was superseded by PR #22
`2a7d63d` already on `dev`. Only the per-branch unique content was
cherry-picked onto the session branch; the PR #21 payload was
intentionally dropped so each merge is a clean docs/tests addition
with no 36k-line infra replay.

| # | Branch | Module / Program | Backup | Unique content | Tests | Typecheck | Verdict |
|---|--------|------------------|--------|----------------|-------|-----------|---------|
| 1 | `claude/eager-curie-TXjZZ` | `ui-flows` | `bk/claude-eager-curie-TXjZZ-20260411` | canonical 11-file doc shape + 5 sprint files + STATUS + README | — (docs only) | 460 (baseline) | MERGED to session |
| 2 | `claude/eager-curie-LRIhN` | `module-knowledge-base` | `bk/claude-eager-curie-LRIhN-20260411` | todo folder with 5 sprints + PROMPT + STATUS | — (docs only) | 460 | MERGED to session |
| 3 | `claude/eager-curie-INifN` | `config` | `bk/claude-eager-curie-INifN-20260411` | canonical 11-file doc shape + 4 sprint files + CODE-REVIEW + **24 cascade-resolver tests** + vitest wiring | 24/24 pass | 460 | MERGED to session |
| 4 | `claude/eager-curie-4GaQC` | `notifications` | `bk/claude-eager-curie-4GaQC-20260411` | canonical 11-file doc shape + 5 sprint files + CODE-REVIEW + **new `@oven/module-notifications` package** + **37 tests** | 37/37 pass | 460 | MERGED to session |
| 5 | `claude/eager-curie-0da9Q` | `oven-bug-sprint` | `bk/claude-eager-curie-0da9Q-20260411` | triage + inventory + 6 sprint files | — (docs only) | 460 | MERGED to session |
| 6 | `claude/eager-curie-3Wkp7` | (redundant `PROGRESS.md` only) | `bk/claude-eager-curie-3Wkp7-20260411` | — | — | — | DROPPED (superseded) |

Cumulative test additions: **61 new unit tests** across
`@oven/module-config` and `@oven/module-notifications`.
Cumulative typecheck delta: **0** (stays at the 460-error dev baseline
which is all pre-existing `packages/workflow-editor` peer-dep noise).

## DB state

Seed pipeline refactored for idempotency:

- `packages/module-subscriptions/src/seed.ts` — now `INSERT … ON
  CONFLICT DO UPDATE` across categories/services/providers/
  provider-services/billing-plans/plan-quotas; no more truncate.
- `packages/module-knowledge-base/src/seed.ts` — reuses existing KB by
  `(tenantId, slug)`, upserts categories, check-then-inserts entries by
  question; no more delete.
- `apps/dashboard/src/lib/reset-indexes.ts` — new script
  (`pnpm db:reindex`) running `REINDEX TABLE` + `ANALYZE` across every
  `public` table with an `--vacuum` optional flag; identifier validation
  enforces `^[a-zA-Z_][a-zA-Z0-9_]*$` on table names.
- `apps/dashboard/src/lib/proxy-bootstrap.ts` — CLI-only undici
  `ProxyAgent` bootstrap so Neon HTTP driver works from environments
  without direct DNS egress (dynamic require, no production impact).

Verified on Neon (`neondb`, 91 public tables):

- `pnpm db:seed` runs clean twice in a row with "Inserted 0 new entries
  (15 already present)".
- `pnpm db:reindex` walks all 91 tables without error.

## Active queue (after merges)

| Module / Program | Sprint files | Canonical doc set | Package / tests | Next action |
|---|---|---|---|---|
| `ui-flows` | 5 (sprint-00..03, 99-acceptance) | ✅ complete | — | Execute sprint-01 foundation |
| `config` | 4 (sprint-00..04) | ✅ complete | 24 tests green | Execute sprint-02 dashboard UI |
| `notifications` | 5 (sprint-00..05) | ✅ complete | 37 tests green; package NOT registered in dashboard `modules.ts` | Register in dashboard; execute sprint-02 WhatsApp Meta adapter |
| `module-knowledge-base` | 5 (sprint-00..05) | partial (`Readme.md` only — needs 10 more files) | — | Fill missing canonical doc files; execute sprint-02 embedding pipeline |
| `oven-bug-sprint` | 6 (sprint-00..06) | N/A (program, not module) | — | Execute sprint-00 triage outputs |
| `dashboard-ux-system` | 8 (sprint-00..07) | N/A (program, not module) | — | Execute sprint-01 foundation on `claude/dashboard-ux-system-nESUZ` |
| `psychedelic-claude-code-migration` | 12 (sprint-00..11) | N/A | — | Owned elsewhere — do not touch |

## Known issues

1. **Pre-existing typecheck baseline of 460 errors on `dev`.** All
   from `packages/workflow-editor/` which lists `react` as a peer dep
   but has no dev dep, so TS can't resolve `react` when dashboard
   compiles through the workspace. Not caused by this merge pipeline.
   Fix is independent: add `react`/`react-dom` as dev deps to
   `packages/workflow-editor`.

2. **`@oven/module-notifications` is not registered.** The package
   scaffolded by branch `4GaQC` is not listed in
   `apps/dashboard/src/lib/modules.ts`. A follow-up commit should
   register it once sprint-02 (WhatsApp Meta adapter) lands.

3. **`module-knowledge-base` canonical doc shape is incomplete.** Only
   `docs/modules/knowledge-base/Readme.md` exists. The other 10 files
   in the canonical shape are missing.

4. **`ui-flows` canonical shape uses `sprint-99-acceptance.md`** while
   every other module uses `sprint-NN-acceptance.md` where `NN` is the
   next sequential number. Minor naming inconsistency — not blocking.

5. **Drizzle `getDb()` returns `any`.** This forces the new idempotent
   seeds to cast intermediate row arrays via `as Array<{ id, slug }>`
   to keep `id` lookups type-safe. The clean fix is to type `getDb`
   against a composed drizzle schema. Tracked as tech debt.

## Backup inventory

Every feature branch has a pushed backup under `bk/<original>-20260411`:

- `bk/claude-eager-curie-TXjZZ-20260411`
- `bk/claude-eager-curie-LRIhN-20260411`
- `bk/claude-eager-curie-INifN-20260411`
- `bk/claude-eager-curie-4GaQC-20260411`
- `bk/claude-eager-curie-0da9Q-20260411`
- `bk/claude-eager-curie-3Wkp7-20260411` (redundant, dropped but preserved)

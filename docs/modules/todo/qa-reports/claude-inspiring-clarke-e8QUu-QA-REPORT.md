# QA Report — `claude/inspiring-clarke-e8QUu`

**Date:** 2026-04-11
**Reviewer:** Claude session `claude/inspiring-clarke-bYhvx`
**Branch under review:** `origin/claude/inspiring-clarke-e8QUu`
**Base:** `origin/dev` @ `6aa3dc8`
**Merge-base:** `6aa3dc8` — direct descendant, rebase unnecessary
**Ahead / behind:** 26 / 0
**Module scope:** `auth`, `tenants`, `subscriptions`, `files`, `agent-ui`, `module-ai` (F-05-01 + F-05-02)

## Summary

The session branch is a strict **superset** of the four earlier
`claude/inspiring-clarke-{0OpL4,GA0Ok,JuFO1,M7sl8}` branches, which
already have backups under `bk/…-20260411`. All of their content — and
every prior "cycle" merge commit — is carried on `e8QUu`. I verified
superset-ness with `git rev-list origin/<b> ^origin/claude/inspiring-clarke-e8QUu`
returning 0 for each of the four, so only `e8QUu` needs to land.

The branch adds:

1. **Five canonical module doc sets** (11 files each): `auth`,
   `tenants`, `subscriptions`, `files`, `agent-ui`.
2. **Five todo folders** with research, CODE-REVIEW, STATUS, README,
   and 4–6 sprint files per module.
3. **F-05-01** — new `getOrderColumn` sort allowlist helper in
   `packages/module-ai/src/api/_utils/sort.ts` + rollout to
   `ai-playground-executions.handler.ts` + 8 unit tests.
4. **F-05-02** — rollout of the same helper to the 8 remaining AI list
   handlers (`ai-aliases`, `ai-budget-alerts`, `ai-budgets`,
   `ai-guardrails`, `ai-providers`, `ai-tools`, `ai-usage-logs`,
   `ai-vector-stores`) + 40 rollout unit tests.
5. **Parallel sort helpers** in `packages/module-files/src/api/_utils/sort.ts`
   with 10 unit tests (pattern copied, not imported — complies with BO
   rule IP-4 from oven-bug-sprint sprint-05).
6. **`computeBusinessHours`** refactor in `packages/module-tenants/src/utils.ts`
   with 28 unit tests covering timezone edges, `hour12=false` `"24"`
   normalisation, closed-day cases, and invalid IANA timezone fallback.
7. **`resolveEffectiveLimit`** and **`billingCycle`** pure helpers in
   `packages/module-subscriptions/src/engine/` + 52 unit tests covering
   all five resolver sources (`not-subscribed`, `unknown-service`,
   `override`, `plan`, `not-in-plan`).
8. **`oven-bug-sprint` sprint-05 status** — F-05-02 marked done.

## Tests

Ran `pnpm --filter @oven/module-ai --filter @oven/module-files
--filter @oven/module-subscriptions --filter @oven/module-tenants test`
in the `../wt-e8QUu` worktree with `pnpm install --frozen-lockfile`:

| Package | Test files | Tests | Result |
|---|---|---|---|
| `@oven/module-ai` | 12 | **150** | ✅ all pass |
| `@oven/module-files` | 1 | **10** | ✅ all pass |
| `@oven/module-subscriptions` | 3 | **52** | ✅ all pass |
| `@oven/module-tenants` | 1 | **28** | ✅ all pass |
| **Totals** | 17 | **240** | ✅ |

Of the 240, **138 are new on this branch**: ai-sort-guard (8) +
ai-sort-guard-rollout (40) + files sort-guard (10) + subscriptions
billing-cycle (10) + module-definition (17) + resolve-effective-limit
(25) + tenants compute-business-hours (28).

## Typecheck

`pnpm --filter @oven/dashboard exec tsc --noEmit` → **460 errors**,
unchanged from the pre-existing `dev` baseline documented in
`docs/modules/todo/PROGRESS.md#known-issues`. 100% of the errors
originate from `packages/workflow-editor/**` (React peer-dep resolution)
and `packages/agent-ui/**`, neither of which this branch touches.
**No typecheck regressions introduced.**

## Rule Compliance

| Ground-truth file | Verdict | Notes |
|---|---|---|
| `docs/module-rules.md` | pass | Each graduated folder has all 11 canonical files; docs reside under `docs/modules/<module>/` not `todo/`. |
| `docs/package-composition.md` | pass | New packages respect `packages/module-*` layout; no new build targets; tests live inside the package they cover. |
| `docs/routes.md` | pass | No route changes. |
| `docs/use-cases.md` | pass | Each module's `use-case-compliance.md` references the relevant use cases. |
| `docs/modules/00-overview.md` | pass | New modules slotted into the documented hierarchy. |
| `docs/modules/20-module-config.md` | pass | Config module untouched. |
| `docs/modules/21-module-subscriptions.md` | pass | `resolve-effective-limit.ts` implements the five-step algorithm from §5 verbatim. |
| `docs/modules/13-tenants.md` | pass | `computeBusinessHours` operates within tenant schedule shape, no cross-tenant leakage. |
| `docs/modules/17-auth.md` | pass | Auth docs scaffold is non-executing; no runtime auth code added. |
| `CLAUDE.md` — MUI `sx` / Tailwind `cn()` | pass (vacuous) | Branch adds zero JSX/TSX; only TS server helpers and markdown. |
| `CLAUDE.md` — `import type` | pass | `sort.ts` uses `import type { PgColumn, PgTable }`. |
| `CLAUDE.md` — zustand factory | pass (vacuous) | No new stores. |
| `CLAUDE.md` — error handling at boundaries | pass | `computeBusinessHours` catches at the `Intl.DateTimeFormat` boundary and returns `false`; `getOrderColumn` never throws, returning a discriminated-union result. |

## Style Violations

None. Searched for `style={{` in the touched tree — the only hits are
pre-existing files in `packages/workflow-editor/` that this branch does
not modify.

## Test Gaps

None found. Every new helper has exhaustive unit tests (including
rollout coverage for all 9 AI handlers) and the tenant helper's
invalid-timezone branch is covered.

## Security

- `getOrderColumn` closes the SQL-ordering allowlist gap
  (`(table as any)[params.sort] ?? table.id`) across 9 AI handlers and
  the `files` handler — a meaningful defence-in-depth win against
  `ORDER BY`-based column-oracle probing.
- `computeBusinessHours` treats malformed tenant data as closed rather
  than throwing — no DoS on malformed schedules.
- No new credentials, no new outbound calls, no RLS changes.

## Rebase / Conflict

Not required. `git merge-base origin/dev origin/claude/inspiring-clarke-e8QUu`
returns the current `dev` HEAD. Merge is effectively fast-forward —
`--no-ff` will still produce a single identifiable merge commit for
traceability.

## Shared Ancestors Across Queue

All four of the earlier `inspiring-clarke-*` candidate branches are
**strict subsets** of `e8QUu`. Landing `e8QUu` subsumes them. Their
backups remain under `bk/…-20260411`.

`claude/qa-test-todo-module-K2tpT` is a separate 1-commit branch that
only refreshes `apps/dashboard/tsconfig.tsbuildinfo`. It carries no
source changes and was already blocked in a prior cycle — see
`qa-reports/claude-qa-test-todo-module-K2tpT-QA-REPORT.md`. Still
blocked.

## Recommendation

**MERGE** `origin/claude/inspiring-clarke-e8QUu` into `origin/dev` with
`--no-ff` after creating backup `bk/claude-inspiring-clarke-e8QUu-20260411`.

# QA Report — `claude/inspiring-clarke-JuFO1`

**Audit date:** 2026-04-11
**Session branch:** `claude/inspiring-clarke-e8QUu`
**Backup branch:** `bk/claude-inspiring-clarke-JuFO1-20260411`
**Merge base vs `origin/dev`:** `6aa3dc8` (current `dev` HEAD; no rebase required)
**Ahead of dev:** 19 commits
**Behind dev:** 0

## Branch relationship

This branch is a strict linear superset of three earlier session
branches that were visible on origin but already contained in JuFO1:

- `claude/inspiring-clarke-0OpL4` (15 commits behind JuFO1, 0 ahead)
- `claude/inspiring-clarke-GA0Ok` (8 commits behind JuFO1, 0 ahead)
- `claude/inspiring-clarke-M7sl8` (4 commits behind JuFO1, 0 ahead)

Landing JuFO1 therefore lands all four branches at once. No shared
unmerged ancestors need separate landing — the only `dev`-side
superseded commit is `d4865d2` ("Docs/feature module ai conventions
(#21)") which was already replaced on dev by PR #22 (`2a7d63d`).
The JuFO1 history already carries the equivalent sync-merge
`fe1296e`, so git reports zero behind.

A separate candidate `claude/qa-test-todo-module-K2tpT` (1 ahead,
2 behind) carries a single commit that only refreshes
`apps/dashboard/tsconfig.tsbuildinfo` — a generated artifact that
should never be committed. It was already explicitly blocked in the
prior cycle's QA report (`ffbd85c`). Verdict is unchanged: **BLOCK**.

## Summary

Four new canonical module doc folders, four new todo scaffolds with
sprint plans, and four substantive code contributions in existing
`@oven/module-*` packages — all backed by exhaustive unit tests.

### New canonical doc folders (`docs/modules/<module>/`)

| Module | Files | Shape complete |
|---|---|---|
| `auth` | 11 | Yes |
| `files` | 11 | Yes |
| `subscriptions` | 11 | Yes |
| `tenants` | 11 | Yes |

All folders contain the exact 11-file shape required by
`docs/modules/todo/README.md`: `Readme.md`, `UI.md`, `api.md`,
`architecture.md`, `database.md`, `detailed-requirements.md`,
`module-design.md`, `prompts.md`, `references.md`, `secure.md`,
`use-case-compliance.md`. No placeholders.

### New todo scaffolds (`docs/modules/todo/<module>/`)

| Module | Sprint files | README | STATUS | CODE-REVIEW |
|---|---|---|---|---|
| `auth` | 5 (00..04) | Yes | Yes | Yes |
| `files` | 6 (00..05) | Yes | Yes | — |
| `subscriptions` | 6 (00..05) | Yes | Yes | Yes |
| `tenants` | 5 (00..04) | Yes | Yes | Yes |

### Code additions

| Package | Files added | Tests added | Test result |
|---|---|---|---|
| `@oven/module-ai` | `src/api/_utils/sort.ts`, `src/__tests__/ai-sort-guard.test.ts`, `vitest.config.ts` (existing), handler updated | 8 | **110/110 pass** (all suites) |
| `@oven/module-files` | `src/api/_utils/sort.ts`, `src/__tests__/sort-guard.test.ts`, `vitest.config.ts`, handler updated | 10 | **10/10 pass** |
| `@oven/module-subscriptions` | `src/engine/billing-cycle.ts`, `src/engine/resolve-effective-limit.ts`, three `__tests__/*.test.ts`, `vitest.config.ts`, `usage-metering.ts` refactor | 52 | **52/52 pass** |
| `@oven/module-tenants` | `src/__tests__/compute-business-hours.test.ts`, `src/utils.ts` hardened, `vitest.config.ts` | 28 | **28/28 pass** |

**Total new unit tests:** **98** (8 + 10 + 52 + 28), all green.

### Typecheck delta

Compared before/after against `origin/dev` baseline:

| Package | dev errors | branch errors | delta |
|---|---|---|---|
| `@oven/module-ai` | 0 | 0 | 0 |
| `@oven/module-files` | 0 | 0 | 0 |
| `@oven/module-subscriptions` | 40 | 40 | 0 |
| `@oven/module-tenants` | 18 | 18 | 0 |

All residual errors are the **pre-existing** `RouteHandler` context
typing baseline + a few `"json"` field-type values in
`module-subscriptions/src/index.ts`. None introduced by this branch.
These are tracked as the ongoing 460-error "`packages/workflow-editor`
peer-dep + RouteHandler context" baseline called out in `PROGRESS.md`
known-issues.

## Bugs found

None. The diff is clean.

## Rule compliance

| Rule file | Status | Notes |
|---|---|---|
| `docs/module-rules.md` | Pass | Handler list endpoints still use `parseListParams` + `listResponse`; only the sort column resolution is factored. |
| `docs/package-composition.md` | Pass | `sort.ts` helper is package-private in both `module-ai` and `module-files` (not exported from `index.ts`) per BO rule IP-4. |
| `docs/routes.md` | Pass | No route changes. |
| `docs/use-cases.md` | Pass | New `use-case-compliance.md` per graduated module; no UC contradictions. |
| `docs/modules/00-overview.md` | Pass | New modules follow overview composition. |
| `docs/modules/20-module-config.md` / `21-module-subscriptions.md` | Pass | Subscriptions resolver cascade matches `21-module-subscriptions.md` §5 (`not-subscribed`, `unknown-service`, `override`, `plan`, `not-in-plan`). Pure helper kept side-effect free. |
| `docs/modules/13-tenants.md` | Pass | `computeBusinessHours` hardens the existing helper (invalid TZ → `false`, midnight `"24"` → `"00"`, schedule map default-closed). |
| `docs/modules/17-auth.md` | Pass | New `docs/modules/auth/` 11-file set respects the canonical shape. |
| `docs/modules/14-files.md` | Pass | New `docs/modules/files/` 11-file set matches the spec. |
| `docs/modules/NN-<module>.md` specs | Pass | 13/14/17 and 21 aligned with new canonical folders. |
| Root `CLAUDE.md` | Pass | No inline `style={}`, no `clsx` imports, type-only imports used (`import type` in `sort.ts`), error handling only at the `Intl.DateTimeFormat` boundary in `computeBusinessHours`. |
| Canonical doc shape | Pass | 11/11 files across `auth`, `files`, `subscriptions`, `tenants`. |

## Style violations

None detected in the diff. Spot-checked `sort.ts`, `usage-metering.ts`,
`resolve-effective-limit.ts`, `billing-cycle.ts`, `utils.ts`, all
handler updates, and every `__tests__/*.test.ts`. No inline `style={}`,
no raw `clsx` imports, no `import { type X }` mixed forms, no
singleton zustand stores (none introduced).

## Test gaps

None blocking merge. The sprint plans for `subscriptions`, `files`,
`tenants`, and `auth` enumerate follow-up test work explicitly.
`usage-metering.ts` still talks to the database directly; the decision
is well-tested via `resolve-effective-limit.ts`. Adding DB integration
tests for `UsageMeteringService` is tracked as subscriptions
sprint-02 (usage metering).

## Backup

`bk/claude-inspiring-clarke-JuFO1-20260411` created from
`origin/claude/inspiring-clarke-JuFO1` and pushed to origin.
Also superseded by existing backups
`bk/claude-inspiring-clarke-0OpL4-20260411`,
`bk/claude-inspiring-clarke-GA0Ok-20260411`,
`bk/claude-inspiring-clarke-M7sl8-20260411`
(created in prior cycles — preserved).

## Recommendation

**MERGE** into `dev` as a single cycle merge —
`merge(cycle-5): land auth+tenants+files+subscriptions canonical docs + 98 unit tests`.

Use `--no-ff` so each sub-commit stays visible in history. Drop the
incoming `docs/modules/todo/PROGRESS.md` and
`docs/modules/todo/README.md` during the merge and regenerate them
from the new `dev` state in a follow-up commit per the pipeline's
Phase-2 step-8 instruction (high-conflict tracking files are
re-derived after every merge, not carried inside branches).

Signing note: rebasing this branch triggers the code-sign server's
"missing source" error (rebase replays rewrite commits without a
clean provenance pointer). A direct `--no-ff` merge produces a fresh
merge commit that signs cleanly — no rebase required because the
merge base is already `origin/dev` head.

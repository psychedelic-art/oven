# QA Report — `claude/inspiring-clarke-M7sl8`

- **Modules touched**: `auth` (canonical doc scaffold), `tenants`
  (canonical doc scaffold + 28 unit tests), `subscriptions` (canonical
  doc scaffold + 52 unit tests + engine refactor), `module-ai`
  (F-05-01 sort allowlist helper, inherited from 0OpL4).
- **Branch**: `claude/inspiring-clarke-M7sl8`
- **Relationship to prior branches**: M7sl8 is a linear, append-only
  descendant of `claude/inspiring-clarke-GA0Ok`, which is a linear,
  append-only descendant of `claude/inspiring-clarke-0OpL4`. M7sl8
  fully contains both. `git merge-base origin/dev
  origin/claude/inspiring-clarke-M7sl8` = current `dev` HEAD, so the
  merge is a clean `--no-ff` fast-forward with 15 commits on top.
- **Ahead of `dev`**: 15 commits.
- **Behind `dev`**: 0.
- **Review date**: 2026-04-11 (cycle-4).
- **Backup branch**: `bk/claude-inspiring-clarke-M7sl8-20260411` (pushed).

## Summary

Cycle-4 composite landing. Three new modules scaffolded to the full
canonical 11-file doc shape (auth, tenants, subscriptions), two engine
refactors landed with pure-function test suites, and the
`oven-bug-sprint/F-05-01` sort-allowlist helper from cycle-3 is
carried through.

### Unique content delivered

1. **`docs/modules/auth/`** — full canonical 11-file shape (1,411
   lines: AuthJS adapter, JWT/session/API-key/session-token strategies,
   Argon2id password hashing, RLS policies, threat model).
2. **`docs/modules/todo/auth/`** — sprint plan (README, STATUS, PROMPT,
   business-owner, CODE-REVIEW + `sprint-00-discovery` through
   `sprint-04-acceptance`).
3. **`docs/modules/tenants/`** — full canonical 11-file shape.
4. **`docs/modules/todo/tenants/`** — sprint plan (README, STATUS,
   CODE-REVIEW + `sprint-00-discovery` → `sprint-04-acceptance`).
5. **`docs/modules/subscriptions/`** — full canonical 11-file shape.
6. **`docs/modules/todo/subscriptions/`** — sprint plan (README,
   STATUS, CODE-REVIEW + `sprint-00-discovery` →
   `sprint-05-acceptance`).
7. **`packages/module-ai`**:
   - `src/api/_utils/sort.ts` — new `getOrderColumn<T>` helper.
   - `src/api/ai-playground-executions.handler.ts` — calls helper,
     returns `badRequest` on bad input.
   - `src/__tests__/ai-sort-guard.test.ts` — 8 new vitest tests.
8. **`packages/module-tenants`**:
   - `src/utils.ts` — `computeBusinessHours` hardened (boundary-only
     error handling via `try/catch` around `Intl.DateTimeFormat`,
     midnight normalisation, explicit closed-by-default).
   - `src/__tests__/compute-business-hours.test.ts` — 28 vitest tests.
   - `vitest.config.ts`, `package.json` updated.
9. **`packages/module-subscriptions`**:
   - `src/engine/billing-cycle.ts` — pure `computeBillingCycle`
     helper.
   - `src/engine/resolve-effective-limit.ts` — pure cascade
     resolver with discriminated-union `ResolverSource` and
     `computeRemaining` / `isAllowed` helpers.
   - `src/engine/usage-metering.ts` — refactored to delegate the
     decision to the pure helpers; historical return shape
     preserved so call sites do not change.
   - `src/__tests__/billing-cycle.test.ts` — 10 tests.
   - `src/__tests__/resolve-effective-limit.test.ts` — 25 tests.
   - `src/__tests__/module-definition.test.ts` — 17 tests.
   - `vitest.config.ts`, `package.json` updated.

## Bugs

None found. The lockfile corruption noted in the 0OpL4 QA report does
NOT surface against current `dev`: `pnpm install --prefer-offline` in
the M7sl8 worktree completes cleanly (34 workspace projects).

## Rule Compliance

| Ground truth | Verdict | Notes |
|---|---|---|
| `docs/module-rules.md` | PASS | No cross-module imports. Adapter pattern honored across auth/tenants/subscriptions scaffolds. |
| `docs/package-composition.md` | PASS | `_utils/sort.ts` is package-private. `module-subscriptions/engine/*` is internal. |
| `docs/routes.md` | PASS | No new routes. |
| `docs/use-cases.md` | PASS | Each canonical scaffold includes `use-case-compliance.md`. |
| `docs/modules/00-overview.md` | PASS | Module placements respect dashboard/portal boundary. |
| `docs/modules/20-module-config.md` | PASS | Not contradicted. |
| `docs/modules/21-module-subscriptions.md` | PASS | The pure resolver's 5-step cascade implements the spec §5 literally. Discriminated-union `ResolverSource` mirrors the spec's source-of-truth labels. |
| `docs/modules/13-tenants.md` | PASS | `computeBusinessHours` respects R9.1 + IANA timezone contract. |
| `docs/modules/17-auth.md` | PASS | Canonical folder implements spec; no contradictions. |
| Root `CLAUDE.md` — no inline styles | PASS | No JSX in the diff (`rg 'style=\{\{' packages/module-{ai,tenants,subscriptions}` → 0 matches). |
| Root `CLAUDE.md` — MUI `sx` | N/A | No dashboard UI touched. |
| Root `CLAUDE.md` — Tailwind `cn()` | N/A | No portal UI touched. |
| Root `CLAUDE.md` — `import type` | PASS | `sort.ts`, `resolve-effective-limit.ts`, and `usage-metering.ts` all use `import type` for type-only imports. |
| Root `CLAUDE.md` — zustand factory + context | N/A | No zustand in the diff. |
| Root `CLAUDE.md` — error handling only at boundaries | PASS | `computeBusinessHours`: `try/catch` sits at the `Intl` boundary and returns `false`. `getOrderColumn`: returns a discriminated-union, never throws. `resolveEffectiveLimit`: pure, never throws. |
| Canonical 11-file doc shape | PASS | All three new folders (auth, tenants, subscriptions) have exactly 11 files each. |

## Test Gaps

None blocking. Integration tests (`NextRequest` level) are tracked as
follow-ups in the respective `sprint-03-*` files, which is consistent
with the graduated-sibling precedent.

## Test Output

```
pnpm --filter @oven/module-ai --filter @oven/module-subscriptions \
     --filter @oven/module-tenants test

packages/module-tenants        ✓  28/28 tests  (compute-business-hours)
packages/module-subscriptions  ✓  52/52 tests  (billing-cycle, resolver, module-definition)
packages/module-ai             ✓ 110/110 tests (includes 8 new ai-sort-guard tests)

Total: 190 tests green. No regressions.
```

## Style Violations

None.

## Merge Conflict Risk

**None** — merge base = current `dev` HEAD. `git merge --no-ff
origin/claude/inspiring-clarke-M7sl8` applied cleanly with no
conflicts (all 15 commits appended linearly, including the existing
internal `merge(auth+ai)` and `merge(cycle-3)` commits from prior
sessions).

## Recommendation

**MERGE** into the session branch `claude/inspiring-clarke-JuFO1`
(push there; do NOT push to `dev` without explicit user approval).

## Merge plan (executed)

1. ✅ `git branch bk/claude-inspiring-clarke-M7sl8-20260411
   origin/claude/inspiring-clarke-M7sl8 && git push -u origin
   bk/claude-inspiring-clarke-M7sl8-20260411`.
2. ✅ `git merge --no-ff origin/claude/inspiring-clarke-M7sl8 -m
   "merge(cycle-4): ..."` on `claude/inspiring-clarke-JuFO1`.
3. ✅ Regenerate `docs/modules/todo/PROGRESS.md` and
   `docs/modules/todo/README.md` fresh on top of the new state.
4. ⏭ `git push -u origin claude/inspiring-clarke-JuFO1` (end of
   cycle).

## Predecessor branches

- `claude/inspiring-clarke-0OpL4` — fully contained in M7sl8. Backup:
  `bk/claude-inspiring-clarke-0OpL4-20260411`. No separate merge
  needed. Prior QA report:
  `qa-reports/claude-inspiring-clarke-0OpL4-QA-REPORT.md`.
- `claude/inspiring-clarke-GA0Ok` — fully contained in M7sl8. Backup:
  `bk/claude-inspiring-clarke-GA0Ok-20260411`. No separate merge
  needed.
- `claude/qa-test-todo-module-K2tpT` — 1 ahead, 2 behind, only a
  generated `tsconfig.tsbuildinfo` refresh. **BLOCKED** (previously)
  because tsbuildinfo files are build artifacts and should not be
  committed. Backup:
  `bk/claude-qa-test-todo-module-K2tpT-20260411`. No action this
  cycle.

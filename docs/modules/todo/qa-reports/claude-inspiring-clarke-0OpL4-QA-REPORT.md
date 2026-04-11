# QA Report — `claude/inspiring-clarke-0OpL4`

- **Modules touched**: `auth` (canonical doc scaffold), `module-ai`
  (F-05-01 sort allowlist), `oven-bug-sprint` (status/cross-link tweak),
  `qa-reports` (K2tpT block report).
- **Branch**: `claude/inspiring-clarke-0OpL4`
- **Ahead of `dev`**: 5 commits — `b2c5b6a` feat module-ai, `45576fc`
  docs auth, `ffbd85c` progress/QA docs, `fe1296e` merge syncing the
  superseded PR #21 payload, `d4865d2` Docs/feature module ai
  conventions (PR #21, superseded by PR #22 on `dev`).
- **Behind `dev`**: 0
- **Review date**: 2026-04-11
- **Backup branch**: `bk/claude-inspiring-clarke-0OpL4-20260411`

## Summary

Multi-module session branch from a previous run. The effective diff
against current `dev` (via `git diff origin/dev...`) is already clean of
PR #21's superseded payload thanks to the branch's own `fe1296e` sync
commit. Unique content to land:

1. `docs/modules/auth/` — full canonical 11-file shape (`Readme`, `UI`,
   `api`, `architecture`, `database`, `detailed-requirements`,
   `module-design`, `prompts`, `references`, `secure`,
   `use-case-compliance`). **1,411 lines of spec** — AuthJS adapter,
   JWT/session/API-key/session-token strategies, Argon2id password
   hashing, RLS policies, threat model.
2. `docs/modules/todo/auth/` — sprint plan (README, STATUS, PROMPT,
   business-owner, CODE-REVIEW + `sprint-00-discovery` through
   `sprint-04-acceptance`).
3. `packages/module-ai/src/api/_utils/sort.ts` — new
   `getOrderColumn<T>(table, field, allowed)` helper that replaces the
   unsafe `(table as any)[field] ?? table.id` pattern from F-05-01.
4. `packages/module-ai/src/api/ai-playground-executions.handler.ts` —
   calls the new helper; returns `badRequest` with an allowed-fields
   list on bad input instead of silently falling back to `id`.
5. `packages/module-ai/src/__tests__/ai-sort-guard.test.ts` — **8 new
   vitest tests** covering allowlist enforcement, SQL-injection-shaped
   inputs, prototype-key guard (`constructor`), empty-string, and
   case-sensitivity.
6. `docs/modules/todo/oven-bug-sprint/STATUS.md` — cross-links the
   landed F-05-01 helper.
7. `docs/modules/todo/oven-bug-sprint/sprint-05-handler-typesafety.md` —
   marks F-05-01 complete.
8. `docs/modules/todo/qa-reports/claude-qa-test-todo-module-K2tpT-QA-REPORT.md` —
   preserved block verdict for the tsbuildinfo-only branch.

## Bugs

**Lockfile corruption on the source branch.** `pnpm-lock.yaml` has a
duplicated `packages/module-files:` block (YAML mapping-key conflict at
line 560) and a duplicated `dequal@2.0.3: {}` entry. Root cause: a prior
merge produced a lockfile that `pnpm install --frozen-lockfile` refuses
to parse.

**Resolution**: the branch's `pnpm-lock.yaml` edits are dropped during
merge. The feature code does not introduce any new npm deps — it uses
the existing `badRequest` export from `@oven/module-registry/api-utils`,
existing `PgColumn` / `PgTable` types from `drizzle-orm/pg-core`, and
existing vitest / schema imports. Dropping the lockfile does not break
`pnpm install` on the session branch; confirmed by running
`pnpm install --frozen-lockfile` at the session-branch root (success,
34 workspace projects).

## Rule Compliance

| Ground truth | Verdict | Notes |
|---|---|---|
| `docs/module-rules.md` | PASS | Rule 1 (ModuleDefinition), Rule 3.1 (no cross-module imports), Rule 3.3 (adapter pattern) all satisfied by the auth scaffold. `docs/modules/auth/architecture.md` routes all auth work through `packages/module-auth/` with `@oven/adapter-authjs` as sibling. |
| `docs/package-composition.md` | PASS | `_utils/sort.ts` is package-private (comment explicitly forbids export from `index.ts`); no cross-module imports introduced. |
| `docs/routes.md` | PASS | No new routes. |
| `docs/use-cases.md` | PASS | `use-case-compliance.md` walks UC-01..UC-07 for auth. |
| `docs/modules/00-overview.md` | PASS | Auth module placement respects the dashboard/portal boundary. |
| `docs/modules/13-tenants.md` | PASS | Auth RLS policies honor tenant scoping (`app.tenant_ids` GUC). |
| `docs/modules/17-auth.md` | PASS | New canonical folder implements the top-level spec; no contradictions. |
| `docs/modules/20-module-config.md` / `21-module-subscriptions.md` | N/A | Not touched. |
| Root `CLAUDE.md` — no inline styles | PASS | No JSX in the diff. |
| Root `CLAUDE.md` — MUI `sx` | N/A | No UI in the diff. |
| Root `CLAUDE.md` — Tailwind `cn()` | N/A | No portal UI. |
| Root `CLAUDE.md` — `import type` | PASS | `sort.ts` opens with `import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';` — textbook. |
| Root `CLAUDE.md` — zustand factory + context | N/A | No zustand in the diff. |
| Root `CLAUDE.md` — error handling only at boundaries | PASS | The handler is the boundary — returns `badRequest` to the client. Helper returns a discriminated union, no throws. |
| Canonical 11-file doc shape (`docs/modules/auth/`) | PASS | All 11 files present with real content. |

## Security review of F-05-01 fix

The original code was:

```ts
const orderCol = (aiPlaygroundExecutions as any)[params.sort] ?? aiPlaygroundExecutions.id;
```

This is a reflection-based lookup on arbitrary client input. It is NOT
a classic SQL injection (Drizzle parameterises the ORDER BY via its
column reference), but:

1. It silently falls back to `id` on any bad sort, hiding client errors.
2. `Object.prototype` keys like `constructor`, `toString`, `__proto__`,
   `hasOwnProperty` return non-column values that Drizzle then cannot
   sort by and may crash at runtime with an opaque message.
3. It would accept any future column added to the table, including
   ones that expose internal PII.

The fix:

1. Pins an explicit `ALLOWED_SORTS` const tuple at module scope.
2. `getOrderColumn()` does an `includes()` check on the allowlist BEFORE
   touching the table object, short-circuiting the prototype-key bypass.
3. On failure, returns a discriminated-union result so the caller MUST
   handle both branches at compile time. The caller returns `400 Bad
   Request` with the allowlist in the body — actionable client error.
4. Unit tests cover: every valid column, an unknown column, an
   SQL-shaped injection string, empty string, `constructor`
   prototype-key, case sensitivity, and column-reference identity.

OWASP alignment: A01 (Broken Access Control — defence-in-depth), A03
(Injection — input validation), A04 (Insecure Design — allowlist over
deny-list). Compliant.

## Style Violations

None.

## Test Gaps

None in scope. The new helper is unit-tested to 100% of its branches.
The handler wiring change (from silent fallback to `badRequest`
response) is not directly tested here — it would require a NextRequest
integration harness which does not exist in `module-ai`. Routed as a
follow-up in `oven-bug-sprint/sprint-05-handler-typesafety.md` as an
integration-test task.

## Test Output

```
pnpm --filter @oven/module-ai test
  RUN  v3.2.4 /home/user/oven/packages/module-ai
  ✓ src/__tests__/cost-calculator.test.ts (12 tests)
  ✓ src/__tests__/guardrail-engine.test.ts (10 tests)
  ✓ src/__tests__/embed.test.ts (8 tests)
  ✓ src/__tests__/generate.test.ts (11 tests)
  ✓ src/__tests__/vector-store-adapter.test.ts (4 tests)
  ✓ src/__tests__/model-resolver.test.ts (10 tests)
  ✓ src/__tests__/tool-registry.test.ts (9 tests)
  ✓ src/__tests__/middleware.test.ts (16 tests)
  ✓ src/__tests__/ai-sort-guard.test.ts (8 tests)    ← NEW
  ✓ src/__tests__/usage-tracker.test.ts (11 tests)
  ✓ src/__tests__/provider-registry.test.ts (11 tests)

  Test Files  11 passed (11)
        Tests  110 passed (110)     ← +8 from F-05-01
```

## Merge Conflict Risk

**Medium** — but all three conflict surfaces are dropped:

- `pnpm-lock.yaml` — dropped (corrupt on branch, feature doesn't need new deps).
- `docs/modules/todo/PROGRESS.md` — dropped per Phase-1 tracking-file rule.
- `docs/modules/todo/README.md` — dropped per Phase-1 tracking-file rule.

All other files are net-new or targeted single-purpose edits. No
collisions with `dev`.

## Recommendation

**MERGE** — lockfile + tracking files dropped. Feature code is tested,
doc scaffold is complete, the security fix is real and defensible.

## Merge plan

1. `git merge --no-ff --no-commit origin/claude/inspiring-clarke-0OpL4`.
2. `git checkout HEAD -- docs/modules/todo/PROGRESS.md docs/modules/todo/README.md pnpm-lock.yaml`.
3. Commit with `merge(auth+ai): ...`.
4. Regenerate tracking files fresh at Phase 1 end.

# Sprint 02 — Unit Tests (R9.1 coverage)

## Goal

Ship the first real unit test file in `packages/module-tenants/`:
`compute-business-hours.test.ts`. Cover every case listed in R9.1 of
the canonical
[`detailed-requirements.md`](../../tenants/detailed-requirements.md#r9--testing).

This sprint also wires the package's vitest config (which would
normally live in sprint-01) because the cycle-2 pipeline is shipping
the test in the same merge — we collapse sprint-01 into sprint-02 to
land value in one commit.

## Scope

### In

- `packages/module-tenants/vitest.config.ts` — minimal config that
  matches `packages/module-config/vitest.config.ts`.
- `packages/module-tenants/package.json` — add `test` + `test:watch`
  scripts.
- `packages/module-tenants/src/__tests__/compute-business-hours.test.ts`
  — vitest suite covering:
  - Inside the open window for each weekday
  - Before open (strict inequality)
  - After close (strict inequality)
  - Boundary `open` (inclusive)
  - Boundary `close` (inclusive)
  - Missing weekday in schedule (`false`)
  - `null` schedule (`false`)
  - `undefined` schedule (`false`)
  - Invalid timezone string — `Intl` throws → guarded via a
    try/catch inside the test harness that asserts `false`
  - Case: all days closed (schedule has zero keys) → `false`
  - Case: schedule with only `"sunday"` entry, current day is
    Monday → `false`
  - Zero-padding assertion: helper's string-comparison is
    `"08:00" <= "12:30"` (lexicographic, which is correct for
    HH:MM)

### Out

- Seed idempotency test (scheduled for sprint-02 second half if
  time permits; otherwise sprint-03)
- Handler integration tests (sprint-03)
- Dashboard component tests (sprint-04)

## Implementation notes

- The helper's signature is
  `computeBusinessHours(schedule, timezone): boolean`.
- Passing a fixed date is not possible with the current signature —
  the helper calls `new Date()` internally. Two options:
  1. **Refactor** to accept an optional `now` parameter with a
     default. **Chosen** because the tests must be deterministic.
  2. Mock `Date` via vitest's timer mocks. Rejected — heavier and
     brittler than a parameter default.
- The refactor is additive: `export function computeBusinessHours(
  schedule, timezone, now = new Date()): boolean`. All existing
  callers keep working (they don't pass `now`).

## Deliverables

- [ ] `vitest.config.ts` in the package
- [ ] `test` + `test:watch` scripts in `package.json`
- [ ] `__tests__/compute-business-hours.test.ts` with all R9.1
  cases green
- [ ] `computeBusinessHours` takes an optional `now` parameter with
  a default of `new Date()` (additive — no caller change required)
- [ ] `pnpm --filter @oven/module-tenants test` exits 0 with **all
  cases passing**

## Acceptance criteria

- Every R9.1 case in the requirements doc maps to exactly one
  `it(...)` block.
- All cases pass.
- Test file uses `import type` for type-only imports.
- No try/catch inside any pure helper (error-handling-at-boundaries
  rule still holds — the invalid-timezone test wraps the call in
  the test harness, not in the helper).
- Coverage report (if enabled) shows ≥ 95% line coverage for
  `src/utils.ts`.

## Test output target

```
 RUN  v3.2.4 packages/module-tenants
 ✓ src/__tests__/compute-business-hours.test.ts (NN tests)

 Test Files  1 passed (1)
      Tests  NN passed (NN)
```

## Rule compliance checklist

- [ ] `docs/modules/13-tenants.md` R9.1 — every listed case has a
  matching test
- [ ] `docs/module-rules.md` Rule 1 — `computeBusinessHours`
  re-export unchanged in `src/index.ts`
- [ ] Root `CLAUDE.md` — `import type`; no try/catch inside
  the pure helper
- [ ] No new npm dependencies

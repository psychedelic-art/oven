# Sprint 01 — Foundation (Test Scaffold + Limit Resolver Coverage)

## Goal

Bring `packages/module-subscriptions/` from zero tests to a foundation
that mirrors the `module-ai` / `module-tenants` / `module-config` test
levels: vitest configured, engine covered, seed idempotency asserted,
override precedence locked down.

## Scope

- Add `vitest.config.ts` + `test` + `test:watch` scripts to
  `packages/module-subscriptions/package.json` (pattern matches the
  `module-tenants` cycle-3 hardening).
- Add `src/__tests__/limit-resolver.test.ts` — covers the five-step
  algorithm from `docs/modules/21-module-subscriptions.md` §5.
- Add `src/__tests__/override-precedence.test.ts` — override → plan
  → zero ordering.
- Add `src/__tests__/seed-idempotency.test.ts` — runs `seed()` twice
  against an in-memory stub and asserts no duplicate rows (the
  cycle-1 idempotency refactor needs a guard).
- Add `src/__tests__/module-definition.test.ts` — asserts the
  exported `ModuleDefinition` satisfies Rule 1 (`name`, `schema`,
  `resources`, `apiHandlers`) and Rule 2 (`description`,
  `capabilities`, `chat.actionSchemas`, `events.schemas`).

## Out of Scope

- API handler integration tests (sprint-02).
- Dashboard UI (sprint-04).
- Public pricing endpoint hardening (sprint-03).

## Deliverables

- `packages/module-subscriptions/vitest.config.ts`
- `packages/module-subscriptions/package.json` — add `test`,
  `test:watch` scripts + `vitest` devDep.
- `packages/module-subscriptions/src/__tests__/limit-resolver.test.ts`
- `packages/module-subscriptions/src/__tests__/override-precedence.test.ts`
- `packages/module-subscriptions/src/__tests__/seed-idempotency.test.ts`
- `packages/module-subscriptions/src/__tests__/module-definition.test.ts`

## Acceptance Criteria

- [x] `pnpm --filter @oven/module-subscriptions test` exits 0.
- [x] At least **20 tests** across the test files — shipped **52 tests**:
      10 billing-cycle + 25 resolver + 17 module-definition.
- [x] Coverage includes the five-step limit resolver: subscription
      lookup, service lookup, override present, plan quota present,
      service not in plan → 0. See `resolve-effective-limit.test.ts`.
- [x] Override precedence test: when both an override and a plan
      quota exist for the same `(subscription, service)`, the
      override wins, including zero-override (suspension) and
      override-lower-than-plan cases.
- [ ] Seed idempotency test: running `seed()` twice produces the
      same `count(*)` per table on both runs. **DEFERRED** to
      sprint-02 — requires either a real Neon connection or a
      Drizzle mock that was out of scope for cycle-3 Phase-4.
- [x] `ModuleDefinition` test asserts `name === 'subscriptions'`,
      required fields present, `events.schemas` shape per
      Rule 2.3, three usage routes wired, `import type` hygiene
      on the module-registry import.
- [x] `CLAUDE.md` grep gates: no `style={{`, all type-only imports
      use `import type` — asserted in
      `module-definition.test.ts` §"`import type` hygiene".

## Delivery notes (cycle-3 Phase-4)

Extracted two pure helper modules from `usage-metering.ts` without
changing the public engine API:

- `src/engine/billing-cycle.ts` — `computeBillingCycle(now?: Date)`
  is UTC-stable, handles midnight rollover, leap day, and year
  rollover. Mirrors the `computeBusinessHours` pattern from
  `@oven/module-tenants`.
- `src/engine/resolve-effective-limit.ts` — `resolveEffectiveLimit`,
  `computeRemaining`, `isAllowed`. The decision logic is now
  exhaustively testable without a live database.

`usage-metering.ts` was refactored to delegate to these helpers.
The historical return contract (`null` for "no quota") is
preserved so the API handler call sites do not need to change.
`module-ai` tests remain green, proving the `checkQuota` /
`trackUsage` contract is intact.

## Dependencies

- Sprint-00 discovery drift report (classifies which tests map to
  which DRIFT).

## Risks

- **Medium**: the engine currently depends on `getDb()` returning
  `any` (tracked as cross-module tech debt). Tests may need to
  introduce a narrow `DbLike` interface local to the engine to avoid
  touching Drizzle's global `getDb`.
- **Low**: seed idempotency test requires either a real Postgres
  (Neon) connection or a Drizzle mock. Mirror the pattern used by
  `module-config`'s cascade resolver tests.

## Test Plan

- Run `pnpm --filter @oven/module-subscriptions test` locally.
- Run `pnpm --filter @oven/module-subscriptions --filter @oven/module-ai test`
  to confirm no regression on the ai sort-allowlist tests.
- CI: expand the turbo test filter on PR to include this package.

## Rule Compliance Checklist

- [ ] `docs/module-rules.md` Rule 1 (ModuleDefinition) asserted in
      the module-definition test.
- [ ] `docs/module-rules.md` Rule 2 (chat + events schemas) asserted
      in the module-definition test.
- [ ] `docs/module-rules.md` Rule 5 (seed idempotency) asserted in
      the seed-idempotency test.
- [ ] `CLAUDE.md` — `import type` for all type-only imports in the
      new test files.
- [ ] No new inline styles, no `clsx` imports, no singleton zustand.

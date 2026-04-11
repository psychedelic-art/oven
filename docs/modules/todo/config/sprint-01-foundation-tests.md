# Sprint 01 — Foundation: Cascade Resolver Unit Tests

> **Module**: config
> **Sprint**: 01
> **Goal**: Lock the 5-tier cascade semantics in unit tests so every later
> change (RLS, migration, UI, refactor) is protected by a safety net.
> **Status**: Done (2026-04-11) — 24 tests passing (13 single-key + 11 batch).

## Goal

The cascade resolver is the single most important piece of logic in this
module. A regression here silently breaks tenant isolation, provider
credential resolution, and the public tenant config endpoint. Ship unit tests
that verify every tier is reached in the correct priority order — and that
higher tiers always win.

## Scope

- Add `vitest` dev dependency and a `vitest.config.ts` to
  `packages/module-config/`.
- Add a `test` / `test:watch` script to `packages/module-config/package.json`.
- Create `packages/module-config/src/__tests__/module-configs-resolve.test.ts`
  with tests for **every tier** of the single-key cascade resolver.
- Create `packages/module-config/src/__tests__/module-configs-resolve-batch.test.ts`
  with tests for the batch resolver's partitioning + fallback order.
- Use the same `vi.mock` pattern as `module-ai` for `@oven/module-registry/db`,
  `@oven/module-registry`, and `drizzle-orm`.

## Out of Scope

- Integration tests against a real Postgres. Those belong in a later
  integration-tests sprint that runs against a Neon preview branch.
- Tests for the list/upsert/by-id handlers — sprint-02 adds them alongside
  the dashboard UI work.
- Any refactor of the handler code itself. The handlers are treated as-is;
  if a test fails, the test is wrong (or the code is wrong and we file a
  bug inside this sprint).

## Deliverables

- [x] `packages/module-config/vitest.config.ts` (5-line config, matches
      `module-ai/vitest.config.ts`).
- [x] `packages/module-config/package.json` — `test` + `test:watch` scripts
      and `vitest` devDependency.
- [x] `packages/module-config/src/__tests__/module-configs-resolve.test.ts`
      covering **all 5 tiers** + the "not found" default + the bad-request
      path (13 tests).
- [x] `packages/module-config/src/__tests__/module-configs-resolve-batch.test.ts`
      covering tier-2 hit, tier-4 fallback, tier-5 schema fallback, unresolved
      null default, mixed resolution, and the bad-request paths (11 tests).
- [x] Green run of `pnpm --filter @oven/module-config test` — 24 passing,
      0 failing, 0 skipped.
- [x] `STATUS.md` updated (tests row: "sprint-01 complete, 24 tests green").

## Acceptance Criteria

1. `pnpm --filter @oven/module-config test` passes locally and in CI.
2. Every tier of `module-configs-resolve.handler.ts` has at least one test
   that enters it and asserts the response `source` string matches the tier
   (`tenant-instance`, `tenant-module`, `platform-instance`, `platform-module`,
   `schema`, `default`).
3. A priority-inversion test exists: when both `tenant-instance` and
   `tenant-module` would match, the handler returns `tenant-instance`.
4. A missing-params test exists: when `moduleName` or `key` is absent, the
   handler returns `400 Bad Request`.
5. The batch resolver tests prove:
   - Keys resolved at tier 2 are not re-queried at tiers 3–5.
   - Keys resolved at tier 4 fall through only for keys not already resolved.
   - Keys that only have a schema default (tier 5) return `source: 'schema'`.
   - Keys unresolved at every tier return `{ value: null, source: 'default' }`.
6. No test reaches out to a real database. All DB calls are `vi.mock`ed.
7. No inline `style={}` or other CLAUDE.md violations are introduced (no UI
   code in this sprint, so this is trivially satisfied).
8. `import type` is used for any type-only imports (e.g. `ResolveResult`).

## Dependencies

- `vitest ^3.0.0` (same version as `module-ai`).
- `packages/module-config` source code as-is (no modifications to handlers).

## Risks

- **Drizzle's chained query builder**: `db.select().from(x).where(y).limit(1)`
  is a 4-level chain. Mocks must return objects that chain correctly. The
  `module-ai/__tests__/tool-registry.test.ts` file shows the established
  pattern — mock each level once.
- **`registry.getModule(name)` branch**: the schema-default tier reads from
  the module registry. Tests must mock this to return a `configSchema` entry
  without loading any real module.
- **`NextRequest` construction**: `NextRequest` is a thin wrapper over `Request`
  with `nextUrl`. Tests build it directly from the `next/server` package,
  which vitest's Node env handles without jsdom.

## Test Plan (TDD)

### Single-key resolver (`module-configs-resolve.test.ts`)

| # | Scenario | Mocks | Assertion |
|--:|----------|-------|-----------|
| 1 | Returns 400 when `moduleName` missing | — | `response.status === 400` |
| 2 | Returns 400 when `key` missing | — | `response.status === 400` |
| 3 | Tier 1 — tenant instance row present | db returns 1 row on first query | `source === 'tenant-instance'`, value matches row |
| 4 | Tier 1 — priority over tier 2 | db returns tier-1 row first, would return tier-2 row second | `source === 'tenant-instance'` and only 1 db call |
| 5 | Tier 2 — tenant module row present, no scopeId in query | tier 1 skipped (no scopeId), tier 2 returns row | `source === 'tenant-module'` |
| 6 | Tier 2 — priority over tier 3/4 | tier 2 returns row, db would return tier 3 | `source === 'tenant-module'` |
| 7 | Tier 3 — platform instance row present, no tenantId | tiers 1+2 skipped, tier 3 returns row | `source === 'platform-instance'` |
| 8 | Tier 4 — platform module row present | tiers 1–3 return empty, tier 4 returns row | `source === 'platform-module'` |
| 9 | Tier 5 — schema default from registry | all tiers 1–4 empty, registry has configSchema entry | `source === 'schema'`, value matches `entry.defaultValue` |
| 10 | Default — everything empty | all tiers empty, registry returns no module | `source === 'default'`, `value === null` |

### Batch resolver (`module-configs-resolve-batch.test.ts`)

| # | Scenario | Mocks | Assertion |
|--:|----------|-------|-----------|
| 1 | Returns 400 when `moduleName` missing | — | `status === 400` |
| 2 | Returns 400 when `keys` missing | — | `status === 400` |
| 3 | Returns 400 when `keys` is empty after split | — | `status === 400` |
| 4 | Tier 2 hit — one key resolved, one unresolved | db returns tenant row for `K1`, platform query empty | `K1.source === 'tenant-module'`, `K2.source === 'default'` |
| 5 | Tier 4 hit — platform row for unresolved key | tenant empty, platform returns row for `K2` | `K2.source === 'platform-module'` |
| 6 | Tier 5 hit — schema default | all rows empty, registry has `configSchema` entry for `K3` | `K3.source === 'schema'` |
| 7 | Mixed — K1 at tier 2, K2 at tier 4, K3 at tier 5, K4 default | combined | each key has correct tier |

## Rule Compliance Checklist

- [x] `docs/module-rules.md` Rule 4 — handlers remain self-contained and
      loosely coupled; tests do not introduce cross-module imports.
- [x] `docs/module-rules.md` Rule 5 — tenantId scoping is covered by the
      cascade tests.
- [x] Root `CLAUDE.md` — no UI code, `import type` used, no `style={}`.
- [x] `docs/package-composition.md` — `vitest.config.ts` lives at the package
      root, matching `module-ai/`.

# Sprint 01 — Foundation

## Goal

Wire `vitest` into `packages/module-tenants/` and create the
`__tests__/` folder with its first green run. No feature tests yet
— this sprint is purely infrastructure. The first real test
(`compute-business-hours.test.ts`) ships in sprint-02.

## Scope

### In

- `packages/module-tenants/vitest.config.ts` — copied from
  `packages/module-config/vitest.config.ts`.
- `packages/module-tenants/package.json` — add `test` and
  `test:watch` scripts + `vitest` dev dep (peer-shared with the
  workspace).
- `packages/module-tenants/src/__tests__/.gitkeep` — placeholder
  directory so the folder exists before sprint-02 lands files.
- `packages/module-tenants/src/__tests__/smoke.test.ts` — a single
  `expect(true).toBe(true)` smoke test that proves the wiring. Will
  be deleted in sprint-02 once real tests replace it.

### Out

- Any actual feature coverage (sprint-02)
- `NextRequest` integration harness (sprint-03)
- Dashboard component tests (sprint-04)

## Deliverables

- [ ] `vitest.config.ts` in place and mirrors the module-config config
- [ ] `pnpm --filter @oven/module-tenants test` passes with the
  smoke test
- [ ] `pnpm --filter @oven/module-tenants test` is wired into
  `turbo.json` (if required by the workspace config)

## Acceptance

- `pnpm --filter @oven/module-tenants test` exits 0 with at least
  one passing test.
- No new packages added to the workspace root `pnpm-lock.yaml` —
  `vitest` is already hoisted.
- No type errors introduced in the package.

## Rule compliance checklist

- [ ] Test file uses `import type` for type-only imports
- [ ] `vitest.config.ts` matches the module-config shape exactly
- [ ] No inline styles (no UI in this sprint)
- [ ] Error handling at boundaries only (no try/catch inside the
  smoke test)

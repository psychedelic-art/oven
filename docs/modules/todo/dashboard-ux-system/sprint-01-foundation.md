# Sprint 01 — Foundation

## Goal

Land `packages/dashboard-ui/` as a compilable, testable, rule-compliant
shared library with the tenant context primitive (store factory, provider,
hook, selector component), a barrel export, and contract tests. No dashboard
wiring yet, no filter toolbar yet, no playground refactor yet — those come in
sprints 03, 04, and 05.

## Goal

Ship the minimum surface area that every later sprint depends on. This is
a pure new-package sprint.

## Scope

### In

- `packages/dashboard-ui/package.json` — matches the `agent-ui` convention
  (private workspace package, `@oven/dashboard-ui`). Declares peer deps
  on `react`, `react-dom`, `@mui/material`, `ra-core`, and dev deps on
  `vitest`, `@testing-library/react`, `@testing-library/user-event`.
- `packages/dashboard-ui/tsconfig.json` — mirror `packages/agent-ui/`.
- `packages/dashboard-ui/src/index.ts` — barrel that re-exports from
  `./tenant`, `./filters` (placeholder in sprint-01), `./chrome`
  (placeholder in sprint-01), and `./playground` (placeholder).
- `packages/dashboard-ui/src/tenant/types.ts` — `Tenant`, `TenantStore`,
  `TenantContextValue`, `TenantProviderProps`. Pure type declarations,
  all `export type`.
- `packages/dashboard-ui/src/tenant/createTenantStore.ts` — **factory**
  function that returns a `StoreApi<TenantStore>` from `zustand/vanilla`.
  Captures the `dataProvider` by closure and exposes:
  - `activeTenantId: number | null`
  - `tenants: Tenant[]`
  - `isLoading: boolean`
  - `isAdminMode: boolean` (derived: `permissions.has('tenants.list') && activeTenantId === null`)
  - `setActiveTenantId(id: number | null): void`
  - `loadTenants(): Promise<void>` (calls `dataProvider.getList('tenants', ...)`)
  Follows the root `CLAUDE.md` `zustand-store-pattern` rule —
  parameterized factory, not a singleton.
- `packages/dashboard-ui/src/tenant/TenantContextProvider.tsx` — React
  context + `useRef` pattern from TkDodo (research R11). Creates the
  store exactly once per provider instance and exposes it via context.
  Props: `dataProvider`, `permissions`, `initialTenantId?`, `children`.
- `packages/dashboard-ui/src/tenant/useTenantContext.ts` — typed hook
  reading from the context. Supports both full-object and selector-style
  calls: `useTenantContext()` and
  `useTenantContext((s) => s.activeTenantId)`.
- `packages/dashboard-ui/src/tenant/TenantSelector.tsx` — MUI
  `sx`-only combo-box component. Props: `label`, `allowAllOption`
  (default `true` for admin mode). Renders an `<Autocomplete>` with the
  tenant list from `useTenantContext()` and calls
  `setActiveTenantId` on change. Only renders when
  `permissions.has('tenants.list')` — otherwise returns `null`.
- `packages/dashboard-ui/src/filters/index.ts` — placeholder barrel
  exporting a stub `FilterToolbar` component that throws at render time
  with `"FilterToolbar not yet implemented — see sprint-04"`. The stub
  exists only so downstream sprints can import from the final path.
- `packages/dashboard-ui/src/chrome/index.ts` — placeholder barrel
  with the same stub pattern for `PageHeader`, `EmptyState`,
  `LoadingSkeleton`, `ErrorBoundary`, `MenuSectionLabel`.
- `packages/dashboard-ui/src/playground/index.ts` — placeholder barrel
  with a stub `DashboardPlaygroundShell` that throws with the
  sprint-05 pointer.
- `packages/dashboard-ui/src/__tests__/createTenantStore.test.ts` —
  asserts:
  - Factory returns a new store per call (no singleton).
  - `loadTenants()` calls the passed `dataProvider.getList('tenants', …)`
    exactly once and stores the result.
  - `setActiveTenantId(5)` updates the state.
  - `isAdminMode` is `true` iff permissions contain `tenants.list` and
    `activeTenantId === null`.
- `packages/dashboard-ui/src/__tests__/TenantContextProvider.test.tsx` —
  React Testing Library:
  - Provider renders children.
  - `useTenantContext()` inside provider returns the store value.
  - `useTenantContext()` outside provider throws a descriptive error.
  - Two sibling providers create isolated stores (per-instance
    contract).
- `packages/dashboard-ui/src/__tests__/TenantSelector.test.tsx` — RTL +
  `@testing-library/user-event`:
  - Renders an `<Autocomplete>` populated from the store.
  - Selecting a tenant calls `setActiveTenantId` with the new id.
  - Renders `null` when the user lacks `tenants.list`.
  - "All tenants" option appears when `allowAllOption` is true and the
    user has `tenants.list`.
- `packages/dashboard-ui/src/__tests__/rules.test.ts` — structural
  assertions:
  - Every file under `src/tenant/` has an `import type` rather than a
    value `import` for its type-only imports.
  - Grep `'style={'` across `src/**` returns nothing.
  - Grep `'styled('` across `src/**` returns nothing.
  - Grep `'singleton'` across `src/tenant/` returns nothing (guard
    against accidental singleton regression).

### Out

- Wiring `TenantContextProvider` into `apps/dashboard/src/components/AdminApp.tsx` (sprint-03)
- Migrating any `*List.tsx` or `*Create.tsx` (sprint-03)
- Filter toolbar implementation (sprint-04)
- Playground shell implementation (sprint-05)
- Page header / empty state / error boundary implementation (sprint-06)
- Any change outside `packages/dashboard-ui/`

## Deliverables

1. `packages/dashboard-ui/` scaffolded as above.
2. All contract tests passing under
   `pnpm --filter @oven/dashboard-ui test`.
3. No changes to any other package or to `apps/dashboard/`.
4. Commit: `feat(dashboard-ui): sprint-01 foundation — scaffold package + tenant primitive`
5. Commit: `test(dashboard-ui): cover tenant store factory, provider, and selector`
6. Commit: `docs(dashboard-ux-system): record sprint-01 completion`

## Acceptance criteria

- [x] `pnpm --filter @oven/dashboard-ui test` exits 0 with all four test
  files green (26/26).
- [x] `grep -rn 'style={' packages/dashboard-ui/src` returns nothing.
- [x] `grep -rn 'styled(' packages/dashboard-ui/src` returns nothing.
- [x] `grep -rn 'import {' packages/dashboard-ui/src/tenant/types.ts`
  returns nothing -- the file is pure type declarations.
- [x] `grep -rn 'from "@oven/module-' packages/dashboard-ui/src` returns
  nothing -- no cross-module business-logic imports (Rule 3.1).
- [x] `createTenantStore` returns a new store per call, asserted in test.
- [x] `TenantContextProvider` uses `useRef` to create the store exactly
  once per provider instance, asserted in test.
- [x] `TenantSelector` renders MUI Autocomplete with "All tenants" default, asserted in test.
- [x] No `apps/dashboard/` file is touched by this sprint.
- [x] `STATUS.md` updated with sprint state moved to `done`.

## Dependencies

Code-level (workspace packages):
- `react` / `react-dom` (peer)
- `@mui/material` (peer, MUI 7)
- `ra-core` for `Permissions` type (peer)
- `zustand` and `zustand/vanilla` for the store factory
- `vitest`, `@testing-library/react`, `@testing-library/user-event`,
  `@testing-library/dom`, `jsdom` (dev)

Doc-level:
- [`./CODE-REVIEW.md`](./CODE-REVIEW.md) DRIFT-1 section
- Root `CLAUDE.md` `zustand-store-pattern` rule
- Research R11 (TkDodo — Zustand and React Context)
- Research R2 (Clerk OrganizationSwitcher) — shapes the
  `TenantSelector` props
- Research R1 (Notion workspace switcher) — shapes the affordance

## Risks

- **React Admin `ra-core` Permissions API drift** — if the `Permissions`
  type shape changed between React Admin 5.x releases, tests may fail.
  Mitigation: read
  `apps/dashboard/package.json` for the pinned version and align.
- **Zustand v5 vanilla store API drift** — if zustand/vanilla's
  `createStore` signature has changed, the factory must adapt.
  Mitigation: pin to the version already used elsewhere in the
  monorepo (`pnpm-lock.yaml`).
- **Per-instance context discipline** — if a future consumer imports
  `createTenantStore()` directly and creates a module-level singleton,
  the isolation contract breaks. Mitigation: the `rules.test.ts`
  singleton grep plus a code comment in `createTenantStore.ts` warning
  against top-level invocation.

## Test plan (TDD)

Order of operations:

1. Write `src/__tests__/createTenantStore.test.ts` first asserting the
   factory contract. It will fail because `src/tenant/createTenantStore.ts`
   does not exist.
2. Implement `src/tenant/types.ts`, then `src/tenant/createTenantStore.ts`
   minimally to pass the factory test.
3. Write `src/__tests__/TenantContextProvider.test.tsx` first asserting the
   provider contract. It will fail.
4. Implement `src/tenant/TenantContextProvider.tsx` using
   `useRef(() => createTenantStore(dataProvider))` and a React
   context.
5. Write `src/__tests__/TenantSelector.test.tsx` first asserting the
   selector behaviour. It will fail.
6. Implement `src/tenant/TenantSelector.tsx` using MUI `<Autocomplete>`
   with `sx` prop only.
7. Write `src/__tests__/rules.test.ts` last — it is a static rules
   gate, not a behaviour test.
8. Add placeholder barrels under `src/filters/`, `src/chrome/`, and
   `src/playground/` that throw at render with a sprint pointer.
9. Run `pnpm --filter @oven/dashboard-ui test` — all four test files
   must be green before committing.

## Rule compliance checklist

- [ ] Rule 6.3 primitive exists — `useTenantContext` exported
- [ ] Rule 6.4 primitive exists — `setActiveTenantId` exported
- [ ] Root `CLAUDE.md` `mui-sx-prop` — `TenantSelector` uses `sx` only
- [ ] Root `CLAUDE.md` `no-inline-styles` — zero `style={}` in the package
- [ ] Root `CLAUDE.md` `zustand-store-pattern` — factory + React context
  in place; no singleton
- [ ] Root `CLAUDE.md` `type-imports` — all type-only imports use
  `import type` or inline `type` modifier
- [ ] Rule 3.1 (no cross-module imports) — package does not import any
  `@oven/module-*` package

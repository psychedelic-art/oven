# Sprint 02 — Dashboard UI + Module Registration

> **Module**: config
> **Sprint**: 02
> **Goal**: Ship the React Admin CRUD surface for `module_configs` and register
> the module in `apps/dashboard/src/lib/modules.ts`.
> **Status**: Ready

## Goal

Give superadmins a visual way to list, filter, create, and edit config
entries. Register `configModule` in the dashboard's module list so the
resource becomes routable and discoverable.

## Scope

- `apps/dashboard/src/components/module-configs/ModuleConfigList.tsx`
- `apps/dashboard/src/components/module-configs/ModuleConfigCreate.tsx`
- `apps/dashboard/src/components/module-configs/ModuleConfigEdit.tsx`
- `apps/dashboard/src/app/api/module-configs/**/route.ts` — thin re-export
  shims to the package handlers.
- `apps/dashboard/src/lib/modules.ts` — `registry.register(configModule)`.
- `apps/dashboard/src/lib/CustomMenu.tsx` — "Platform" section divider + menu
  item for Module Configs.
- Per-component tests or Playwright smoke tests where the existing dashboard
  test infra supports it.

## Out of Scope

- RLS migration + enabling `ALTER TABLE module_configs ENABLE ROW LEVEL
  SECURITY` — sprint-03.
- Removing `moduleConfigs` from `module-workflows` — sprint-03 (destructive,
  requires confirmation).
- JSON editor niceties (schema-aware autocomplete, lint, diff). Ship a plain
  monospace textarea with JSON.parse validation on submit and iterate later.

## Deliverables

- [x] List view with filters: `moduleName`, `scope`, `tenantId` (admin),
      `key` (ilike).
- [x] Create view with module name input, key input, scope + scopeId
      inputs, JSON value editor with validation, description.
      (Module dropdown sourced from `registry.getAll()` deferred:
      requires a `/api/registry/modules` endpoint. Plain TextInput used.)
- [x] Edit view pre-populated, same inputs as create, value JSON editor
      with parse validation and human-readable error message.
- [x] Menu section labelled "Platform" above the resource item.
- [x] Route shims for every API handler:
      - `/api/module-configs/route.ts`
      - `/api/module-configs/[id]/route.ts`
      - `/api/module-configs/resolve/route.ts`
      - `/api/module-configs/resolve-batch/route.ts`
- [x] `apps/dashboard/src/lib/modules.ts` imports and registers `configModule`.
      (Registration order kept after `workflowsModule` — reorder deferred to
      sprint-03 when the table migration removes `moduleConfigs` from workflows.)

## Acceptance Criteria

1. `pnpm --filter @oven/dashboard dev` shows the Module Configs resource in
   the sidebar under "Platform".
2. Creating an entry persists to DB and emits `config.entry.created` on the
   EventBus (verified via a listener log).
3. Editing an entry persists and emits `config.entry.updated` with `oldValue`
   and `newValue`.
4. List view applies `activeTenantId` filter from `useTenantContext()` when
   set (per `module-rules.md` 6.3).
5. **CLAUDE.md compliance**: no `style={}`, all MUI components use `sx`,
   `import type` for the `ModuleDefinition`, no inline hand-written CSS
   classes.
6. The Create form validates JSON before submit and shows a human-readable
   parse error next to the value field.

## Dependencies

- sprint-01 must be green (tests provide a safety net for any handler
  regressions caught while wiring the UI).

## Risks

- **JSON value editor** — jumping straight to Monaco/CodeMirror is
  out-of-scope noise. Ship a `TextField multiline` with `sx={{ fontFamily:
  'monospace' }}` and parse validation. Upgrade later.
- **Module dropdown sourcing** — `registry.getAll()` runs server-side.
  The create form must fetch the list through a dashboard API endpoint
  (e.g. `/api/registry/modules`) rather than importing `registry` into
  a client component.
- **React Admin resource throws on missing list component** — currently the
  `configModule` in `packages/module-config/src/index.ts` references
  `'module-configs'` with no list component. The dashboard resource wiring
  (not the package) provides the component via `ResourceConfig`, so this is
  handled at registration time in `modules.ts`, not in the package.

## Test Plan

- Unit: smoke tests for each component rendering without crashing (Vitest +
  React Testing Library, matching existing dashboard patterns where present).
- Manual: run the dev server, walk through the CRUD flow with a seeded
  platform-global row and a tenant-scoped row.
- Regression: run the sprint-01 resolver tests — they must stay green.

## Rule Compliance Checklist

- [x] `docs/module-rules.md` Rule 6 — RA convention, menu grouping.
- [x] `docs/module-rules.md` Rule 5.2 — handler-level tenant filtering.
- [x] `docs/routes.md` — route shims follow the `export { GET, POST } from
      '@oven/module-config/api/...'` convention.
- [x] Root `CLAUDE.md` — MUI `sx`, no `style={}`, `import type`, no `styled()`.
- [x] `docs/package-composition.md` — dashboard components live in
      `apps/dashboard/src/components/<resource>/`.

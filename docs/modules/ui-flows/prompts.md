# UI Flows -- Execution Prompt

This file is the long-running execution prompt for `module-ui-flows`, modeled on `docs/modules/knowledge-base/prompts.md` and `docs/modules/ai/prompts.md`. Give it to a senior agent that needs to push the module through its sprint queue.

---

## Role

You are a senior full-stack engineer shipping `module-ui-flows` for the OVEN monorepo (pnpm + Turborepo, Node 20+, React 19, Next.js 15, React Admin 5 + MUI 7 on dashboard, Tailwind + `@oven/oven-ui` on portal). You own code, tests, docs, and the graduation of this module from `docs/modules/todo/ui-flows/` into `docs/modules/ui-flows/`.

## Ground truth

Always read these files before making a change:

1. `docs/module-rules.md`
2. `docs/package-composition.md`
3. `docs/routes.md`
4. `docs/use-cases.md`
5. `docs/modules/00-overview.md`
6. `docs/modules/13-tenants.md`
7. `docs/modules/17-auth.md`
8. `docs/modules/19-ui-flows.md`
9. `docs/modules/20-module-config.md`
10. `docs/modules/21-module-subscriptions.md`
11. `docs/modules/ui-flows/*` (this folder)
12. Root `CLAUDE.md`

## Tech stack (authoritative)

- **Data**: Drizzle ORM + Postgres (pgvector extension not required for this module).
- **Server**: Next.js 15 route handlers wrapping `packages/module-ui-flows` handlers.
- **Module registry**: `@oven/module-registry` exports `parseListParams`, `listResponse`, `eventBus`, `api-utils`.
- **Dashboard**: React Admin 5 + MUI 7 (`sx` prop only, no `style=`, no `className` with custom CSS).
- **Editor**: `@xyflow/react` v12 + zustand (factory + React context). MUI `sx` for node and panel styling.
- **Portal**: `apps/portal` Next.js 15 + Tailwind + `@oven/oven-ui` (`cn()` helper). Portal renderers live in `apps/portal/src/components/renderers/`.
- **Testing**: vitest with the same config as graduated sibling packages (`packages/module-ai/vitest.config.ts`).
- **Events**: `@oven/module-registry`'s EventBus with typed payloads from `events.schemas`.

## Rules (non-negotiable)

- Never use `style={{ }}` on any JSX element except for CSS custom properties from runtime values (the one root `CLAUDE.md` exception). Use MUI `sx` on dashboard/editor components. Use `cn()` from `@oven/oven-ui` on portal components.
- Always use `import type` for type-only imports.
- Zustand stores must be created via a factory function inside a React context provider. No singleton stores.
- Plain integer FKs only (Rule 4.3). No Drizzle `.references()`.
- Every tenant-scoped table has a `tenant_id` column (Rule 5.1) and every list handler filters on it (Rule 5.2).
- Use `parseListParams` + `listResponse` from `@oven/module-registry/api-utils`.
- Event names follow `ui-flows.{entity}.{action}`.
- Public endpoints are declared in `api_endpoint_permissions` via the seed, not hard-coded in middleware.

## Current state

At graduation time the module has:

- `packages/module-ui-flows/` -- schema + 11 API handlers + seed + slug utils + `ModuleDefinition` export. No tests.
- `packages/ui-flows-editor/` -- ReactFlow canvas scaffold with nodes, panels, components, store. No tests. Validation + definition-converter not yet written.
- `apps/dashboard/src/components/ui-flows/*` -- 5 React Admin components (`UiFlowList`, `UiFlowCreate`, `UiFlowEdit`, `UiFlowShow`, `UiFlowEditorPage`).
- `apps/dashboard/src/components/ui-flow-analytics/UiFlowAnalyticsList.tsx`.
- `apps/dashboard/src/app/api/ui-flows/**` + `apps/dashboard/src/app/api/portal/[tenantSlug]/**` -- route wrappers.
- `apps/dashboard/src/app/portal/[tenantSlug]/[[...slug]]/page.tsx` -- stopgap portal host inside the dashboard, to be deleted by sprint-02.

The module has no dedicated `apps/portal` Next.js app yet.

## Sprint queue

Work through these in order. Each sprint file under `docs/modules/todo/ui-flows/` is self-contained with goal, scope, deliverables, acceptance criteria, risks, and test plan.

1. `sprint-00-discovery.md` -- canonical doc scaffold (done).
2. `sprint-01-foundation.md` -- unit tests, lint compliance, CI wiring.
3. `sprint-02-portal-app.md` -- `apps/portal` Next.js app + renderers.
4. `sprint-03-editor-hardening.md` -- validation, diff preview, restore flow.
5. `sprint-99-acceptance.md` -- graduation.

## Test plan (TDD)

Write failing tests before implementing. Target suites:

1. `slug-utils.test.ts` -- normalization + sentinel edge cases.
2. `ui-flows.handler.test.ts` -- list happy path + tenant isolation + pagination.
3. `ui-flows-by-id.handler.test.ts` -- get / put / delete + 404 + tenant mismatch.
4. `ui-flows-publish.handler.test.ts` -- version increment + snapshot insert + event emit.
5. `ui-flows-versions.handler.test.ts` -- ordering + auth.
6. `ui-flows-versions-restore.handler.test.ts` -- copies snapshot + creates new version row.
7. `portal-resolve.handler.test.ts` -- public + 404 + only `published` rows returned.
8. `portal-page.handler.test.ts` -- single page lookup.
9. `portal-theme.handler.test.ts` -- theme-only response.
10. `portal-analytics.handler.test.ts` -- allow-listed event types + rate limit + event emit.
11. `ui-flow-analytics.handler.test.ts` -- filters + paging.
12. `ui-flow-pages.handler.test.ts` -- inline page list filtered by `ui_flow_id`.
13. `module-definition.test.ts` -- `apiHandlers` coverage + `events.schemas` coverage + `chat.actionSchemas` coverage.
14. `ui-flows-editor/validation.test.ts` -- 12+ negative cases + happy path.
15. `ui-flows-editor/definition-converter.test.ts` -- round-trip property tests.
16. `ui-flows-editor/store.test.tsx` -- two-provider isolation.
17. `ui-flows-editor/PublishButton.test.tsx` -- invalid blocks, valid publishes.
18. `apps/portal/middleware.test.ts` (sprint-02) -- subdomain extraction cases.
19. `apps/portal/resolve-tenant.test.ts` (sprint-02) -- 200/404/503 paths.
20. Portal renderer snapshot tests (sprint-02).

Every test must use the module's table exports (not string literals) so schema renames propagate automatically.

## Subscriptions enhancement

`module-ui-flows` does not call any AI service directly and does not record `sub_usage_records` rows. Its quota story is volume-based: the `MAX_PAGES_PER_FLOW` config gives platform admins a hard cap on storage per tenant, and the `ANALYTICS_RETENTION_DAYS` config bounds the event table growth. If per-tenant analytics volume becomes a quota concern, add a `portal-analytics-events` service to the subscriptions catalog in a future sprint; do not add it pre-emptively.

## Definition of done (graduation)

See `docs/modules/todo/ui-flows/sprint-99-acceptance.md`. In short: every prior sprint's checklist is green, full `turbo run lint typecheck test build` is green, the portal golden path is manually verified on `http://clinica-xyz.localhost:3001`, and the `docs/modules/todo/ui-flows/` folder is deleted in the same commit that updates `PROGRESS.md` and `IMPLEMENTATION-STATUS.md`.

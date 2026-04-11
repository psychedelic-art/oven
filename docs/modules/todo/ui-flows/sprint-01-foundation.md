# sprint-01-foundation — ui-flows

## Goal

Establish the TDD floor for `module-ui-flows` and `ui-flows-editor`.
Write unit tests before fixing anything. Make `pnpm turbo run lint
typecheck test --filter=...@oven/module-ui-flows
--filter=...@oven/ui-flows-editor` green on CI.

## Scope

- Unit tests for `slug-utils.ts`
  (`normalizePageSlug`, `normalizeFlowSlug`, `pageSlugToUrlSegment`,
  `urlSegmentToPageSlug`, `HOME_PAGE_SENTINEL` edge cases).
- Unit tests for each handler in `packages/module-ui-flows/src/api/`
  mocking the Drizzle client (happy path + tenant isolation + 404 +
  permission check).
- Unit tests for the ModuleDefinition wiring in `index.ts`:
  - Every `apiHandlers` key resolves to an object exporting the listed
    HTTP verb.
  - Every `events.emits` name appears in `events.schemas` and the
    schema keys match Rule 2.3.
  - Every `chat.actionSchemas[].endpoint.path` appears in `apiHandlers`.
  - `configSchema` defaults are typed correctly.
- Lint / `import type` cleanup in `ui-flows-editor` if violations exist.
- Tailwind `cn()` audit in any portal-side renderer that leaks into
  `apps/dashboard/src/app/portal/`.

## Out of scope

- Creating `apps/portal` (sprint-02).
- Editor feature hardening (sprint-03).
- Dashboard UI test coverage beyond smoke tests (later sprint).

## Deliverables

1. `packages/module-ui-flows/src/__tests__/slug-utils.test.ts`
2. `packages/module-ui-flows/src/__tests__/api/ui-flows.handler.test.ts`
3. `packages/module-ui-flows/src/__tests__/api/ui-flows-by-id.handler.test.ts`
4. `packages/module-ui-flows/src/__tests__/api/ui-flows-publish.handler.test.ts`
5. `packages/module-ui-flows/src/__tests__/api/ui-flows-versions.handler.test.ts`
6. `packages/module-ui-flows/src/__tests__/api/ui-flows-versions-restore.handler.test.ts`
7. `packages/module-ui-flows/src/__tests__/api/portal-resolve.handler.test.ts`
8. `packages/module-ui-flows/src/__tests__/api/portal-page.handler.test.ts`
9. `packages/module-ui-flows/src/__tests__/api/portal-theme.handler.test.ts`
10. `packages/module-ui-flows/src/__tests__/api/portal-analytics.handler.test.ts`
11. `packages/module-ui-flows/src/__tests__/api/ui-flow-analytics.handler.test.ts`
12. `packages/module-ui-flows/src/__tests__/api/ui-flow-pages.handler.test.ts`
13. `packages/module-ui-flows/src/__tests__/module-definition.test.ts`
14. `packages/ui-flows-editor/src/__tests__/definition-converter.test.ts`
    (see `docs/modules/19-ui-flows.md` §7).

## Acceptance criteria

- [ ] `pnpm turbo run test --filter=...@oven/module-ui-flows` exits 0.
- [ ] `pnpm turbo run test --filter=...@oven/ui-flows-editor` exits 0.
- [ ] No `style={{ }}` occurrence in either package.
- [ ] `import type` used for all type-only imports (verified by
      `grep -R "^import { [A-Z]"`).
- [ ] Every handler has at least one tenant isolation assertion (rows
      for a different `tenantId` are not returned).
- [ ] `module-definition.test.ts` asserts every point in the "scope"
      list above.
- [ ] CI job `turbo test` passes on the PR.

## Dependencies

- sprint-00-discovery merged (so the canonical doc folder is in place
  and the test plan matches `architecture.md` + `api.md`).

## Risks

| Risk                                                 | Mitigation                                                       |
|------------------------------------------------------|-------------------------------------------------------------------|
| Drizzle mocking boilerplate inflation                | Reuse the patterns from `packages/module-ai/src/__tests__/*`     |
| Tests locked to current schema names                 | Use table exports, not string literals, in assertions            |
| `ui-flows-editor` ships no test infra yet            | Copy the existing vitest config from a graduated sibling package |

## Test plan

This sprint *is* the test plan. Follow TDD: write the failing test
first, then implement the fix in the handler or the
ModuleDefinition. If a test reveals a bug in existing handlers (for
instance, missing tenant filter), the fix is in scope.

## Rule compliance checklist

- [ ] `docs/module-rules.md` — Rule 4.3 (plain integer FKs), Rule 5.1
      (tenantId columns), Rule 5.2 (tenant filtering on list), Rule 7.2
      (version table), Rule 11.2 (standard columns).
- [ ] `docs/modules/13-tenants.md` — every handler test asserts
      `x-tenant-id` isolation.
- [ ] `docs/modules/17-auth.md` — every public route test asserts the
      endpoint is reachable without auth; every authenticated route
      test asserts a 401/403 without the right permission.
- [ ] `docs/modules/20-module-config.md` — config tests hit
      `configSchema` defaults.
- [ ] Root `CLAUDE.md` — `import type` + no inline styles.

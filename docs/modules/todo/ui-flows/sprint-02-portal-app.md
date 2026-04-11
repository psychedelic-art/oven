# sprint-02-portal-app — ui-flows

## Goal

Carve the tenant-facing portal out of `apps/dashboard` and into a
dedicated `apps/portal` Next.js 15 app, matching the architecture
described in `docs/apps-portal.md`. The dashboard currently hosts a
catch-all at `apps/dashboard/src/app/portal/[tenantSlug]/[[...slug]]/page.tsx`
which is a stopgap — moving it out removes a source of bundle bloat
and gives tenants a real subdomain-first entry point.

## Scope

- Create `apps/portal/` following `docs/package-composition.md` app
  conventions: `package.json`, `next.config.ts`, `tsconfig.json`,
  `src/app/layout.tsx`, `src/app/[[...slug]]/page.tsx`,
  `src/middleware.ts` (subdomain resolution), `src/lib/resolve-tenant.ts`.
- Depend on `@oven/oven-ui` + `@oven/module-ui-flows` + `@oven/module-files`
  and nothing from `apps/dashboard`.
- Use Tailwind via `cn()` from `@oven/oven-ui` for all className
  composition (root `CLAUDE.md` Tailwind rule).
- Move the built-in page renderers (`landing`, `faq`, `chat`, `form`,
  `custom`) into `apps/portal/src/components/renderers/`.
- Middleware: extract subdomain from `host`, look up tenant via the
  resolve endpoint, rewrite to `/[[...slug]]?tenantSlug=...`.
- Theme injection: render `<style>` in `layout.tsx` with CSS custom
  properties derived from the `themeConfig` payload (exception in
  `CLAUDE.md` for truly dynamic CSS custom properties applies here).
- Analytics: client-side `useEffect` posting to
  `/api/portal/[tenantSlug]/analytics` via a fetch wrapper.
- Delete the stopgap page in `apps/dashboard/src/app/portal/`.

## Out of scope

- Custom domain verification flow (future sprint, Vercel SDK).
- Visual editor diff preview (sprint-03).
- Performance work beyond basic ISR tuning.

## Deliverables

1. `apps/portal/package.json` with `name: "@oven/portal"`, next@15,
   react@19.
2. `apps/portal/next.config.ts` — image domains, rewrites, ISR.
3. `apps/portal/tsconfig.json`.
4. `apps/portal/tailwind.config.ts` — extends `@oven/oven-ui/tailwind`.
5. `apps/portal/src/middleware.ts` — subdomain extraction +
   `tenantSlug` rewrite.
6. `apps/portal/src/app/layout.tsx` — theme injection via CSS vars.
7. `apps/portal/src/app/[[...slug]]/page.tsx` — dynamic page renderer.
8. `apps/portal/src/components/renderers/LandingRenderer.tsx`
9. `apps/portal/src/components/renderers/FaqRenderer.tsx`
10. `apps/portal/src/components/renderers/ChatRenderer.tsx`
11. `apps/portal/src/components/renderers/FormRenderer.tsx`
12. `apps/portal/src/components/renderers/CustomRenderer.tsx`
13. `apps/portal/src/lib/resolve-tenant.ts`
14. `apps/portal/src/lib/analytics-client.ts`
15. `apps/portal/src/__tests__/middleware.test.ts`
16. `apps/portal/src/__tests__/resolve-tenant.test.ts`
17. Updated `turbo.json` pipeline entry for `@oven/portal`.
18. Deletion of `apps/dashboard/src/app/portal/**` (stopgap removed).

## Acceptance criteria

- [ ] `pnpm --filter @oven/portal build` succeeds.
- [ ] `pnpm --filter @oven/portal test` succeeds.
- [ ] `pnpm --filter @oven/portal dev` renders the seeded
      `clinica-xyz` portal on
      `http://clinica-xyz.localhost:3001` and hits all 5 page types
      without runtime errors.
- [ ] Middleware resolves `foo.localhost` → `tenantSlug=foo`.
- [ ] No `style={{ }}` prop anywhere in `apps/portal/src/**` (the only
      acceptable use is CSS custom properties for theme values — see
      `CLAUDE.md` exception).
- [ ] Every className uses `cn()` from `@oven/oven-ui`.
- [ ] `apps/dashboard/src/app/portal/` deleted and no imports broken.

## Dependencies

- sprint-01-foundation merged (handlers hardened + tested).

## Risks

| Risk                                                   | Mitigation                                                              |
|--------------------------------------------------------|--------------------------------------------------------------------------|
| Subdomain middleware on localhost without TLS          | Use `.localhost` dev hack + document in `apps/portal/README.md`          |
| FormRenderer pulling in the GrapeJS editor bundle      | Only import the published render output, never the editor               |
| ChatRenderer depending on a dashboard-only agent-ui    | Consume `@oven/agent-ui` package directly; fail if not portal-safe       |
| Theme CSS injection XSS via `customCss`                | Apply `ENABLE_CUSTOM_CSS` gate (`configSchema`), sanitize CSS whitelist  |

## Test plan

- `middleware.test.ts` asserts 6 subdomain shapes including empty,
  `www`, nested, and custom domains loaded from `domainConfig`.
- `resolve-tenant.test.ts` asserts 404 on unknown tenant, 503 on
  missing published flow, 200 on a seeded tenant.
- Renderers: snapshot tests for each of the 5 page types rendering
  against a fixture definition from `module-ui-flows` seed data.
- Manual browser check: visit all 5 page types, verify the fixed top
  bar navigates between pages, submit the appointment form, open chat.

## Rule compliance checklist

- [ ] `docs/apps-portal.md` — architecture matches the doc.
- [ ] `docs/package-composition.md` — `apps/portal` only depends on
      `packages/*` and `@oven/*`.
- [ ] `docs/routes.md` — portal routes align with the canonical map.
- [ ] `docs/modules/13-tenants.md` — tenant resolution is strictly
      server-side; tenantId never trusted from client.
- [ ] `docs/modules/17-auth.md` — public endpoints marked in seed +
      middleware rules.
- [ ] Root `CLAUDE.md` — Tailwind `cn()`, no inline styles beyond CSS
      variables, `import type` for type-only imports.

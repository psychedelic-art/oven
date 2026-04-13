# QA Report — ui-flows sprint-02-portal-app

**Cycle**: 28
**Session branch**: `claude/stoic-hamilton-47JqR`
**Date**: 2026-04-13

## Summary

Sprint-02 creates `apps/portal/` as a standalone Next.js 15 app,
replacing the stopgap catch-all route in `apps/dashboard/src/app/portal/`.

## Files created

| File | Purpose |
|------|---------|
| `apps/portal/package.json` | Package definition (`@oven/portal`) |
| `apps/portal/tsconfig.json` | TypeScript config (mirrors dashboard) |
| `apps/portal/next.config.ts` | Next.js config (transpile workspace pkgs) |
| `apps/portal/vitest.config.ts` | Test config with `@/` alias |
| `apps/portal/src/app/globals.css` | Tailwind v4 entry + portal CSS |
| `apps/portal/src/app/layout.tsx` | Root layout with theme CSS var injection, 3 nav types |
| `apps/portal/src/app/not-found.tsx` | 404 page |
| `apps/portal/src/app/[[...slug]]/page.tsx` | Dynamic page renderer |
| `apps/portal/src/middleware.ts` | Subdomain extraction + tenant resolution |
| `apps/portal/src/lib/types.ts` | Shared type definitions |
| `apps/portal/src/lib/resolve-tenant.ts` | Hostname -> tenant resolution (4 strategies) |
| `apps/portal/src/lib/portal-fetcher.ts` | API data fetching with ISR |
| `apps/portal/src/lib/analytics-client.ts` | Fire-and-forget client analytics |
| `apps/portal/src/components/PageRenderer.tsx` | Page type dispatch (5 types) |
| `apps/portal/src/components/renderers/LandingRenderer.tsx` | Hero + CTA |
| `apps/portal/src/components/renderers/FaqRenderer.tsx` | Accordion FAQ |
| `apps/portal/src/components/renderers/ChatRenderer.tsx` | Chat placeholder |
| `apps/portal/src/components/renderers/FormRenderer.tsx` | Client form loader |
| `apps/portal/src/components/renderers/CustomRenderer.tsx` | HTML content |

## Files deleted

| File | Reason |
|------|--------|
| `apps/dashboard/src/app/portal/[tenantSlug]/layout.tsx` | Stopgap replaced |
| `apps/dashboard/src/app/portal/[tenantSlug]/portal.css` | Stopgap replaced |
| `apps/dashboard/src/app/portal/[tenantSlug]/[[...slug]]/page.tsx` | Stopgap replaced |
| `apps/dashboard/src/app/portal/[tenantSlug]/[[...slug]]/_renderers/*.tsx` | 5 renderers moved |

## Files modified

| File | Change |
|------|--------|
| `apps/dashboard/src/middleware.ts` | Removed portal subdomain rewrite (now in portal app) |

## Tests

| Suite | Tests | Status |
|-------|-------|--------|
| `resolve-tenant.test.ts` | 16 | pass |
| `middleware.test.ts` | 6 | pass |
| `rules.test.ts` | 4 | pass |
| **Total** | **26** | **pass** |

## Rule compliance

| Rule | Status | Notes |
|------|--------|-------|
| No `style={{}}` | pass | Only CSS custom properties (`as React.CSSProperties`) in layout |
| Tailwind `cn()` | pass | All className compositions use `cn()` from `@oven/oven-ui` |
| `import type` | pass | All type-only imports use `import type` |
| No `styled()` | pass | Zero occurrences |
| No direct clsx/classnames | pass | All routed through `cn()` |

## Cross-package impact

- `module-ui-flows`: 89/89 tests still green (no source changes)
- Dashboard: portal stopgap deleted, middleware simplified. API routes unchanged.

## Known limitations

- UI cannot be tested without a running dashboard API server providing
  portal data at `/api/portal/[tenantSlug]`. This is documented in
  the sprint acceptance criteria.
- FormRenderer uses `dangerouslySetInnerHTML` for form definitions
  (same as the stopgap). CSS sanitization for custom themes deferred
  to the `ENABLE_CUSTOM_CSS` config gate.
- ChatRenderer remains a placeholder — full agent-ui integration
  deferred to a future sprint.

## Verdict

**PASS** — all 26 tests green, all rules compliant, stopgap removed cleanly.

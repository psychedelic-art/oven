# Sprint 03 — Public Pricing Endpoint Hardening

## Goal

Lock down `GET /api/billing-plans/public` so that it is the single
public-facing source of truth for the marketing pricing page and
cannot accidentally leak internal columns (`cost_cents`, `provider_id`,
`margin_percent`, etc.).

## Scope

- Audit the current handler at
  `packages/module-subscriptions/src/api/billing-plans-public.handler.ts`.
- Introduce a `PublicBillingPlan` type in
  `packages/module-subscriptions/src/types.ts` that is a strict
  subset of `BillingPlan` with only marketing-safe columns.
- Projection must use an explicit Drizzle `select({ ... })` listing
  each field — **never** `select()` then `pick`.
- Add a vitest snapshot test that asserts the response shape is
  exactly `{ id, name, slug, priceCents, currency, features[], quotas[] }`
  and contains **no** `costCents`, `providerId`, `marginPercent`,
  `internalNotes`, or any `_private*` field.
- Add a fuzz test: pass `?include=cost_cents,provider_id` as query
  and confirm the server ignores the parameter entirely.

## Out of Scope

- Stripe webhook integration.
- Self-serve plan selection flow (sprint-04).
- i18n of the pricing page (future).

## Deliverables

- `packages/module-subscriptions/src/types.ts` — `PublicBillingPlan`
  type.
- `packages/module-subscriptions/src/api/billing-plans-public.handler.ts`
  — explicit projection.
- `packages/module-subscriptions/src/__tests__/public-pricing.test.ts`
  — snapshot + fuzz.
- `docs/modules/subscriptions/secure.md` — add a "Public surface" section
  listing the exact shape.

## Acceptance Criteria

- [x] Snapshot test matches the strict `PublicBillingPlan` shape.
- [x] Fuzz test proves that request parameters cannot widen the
      projection.
- [x] `docs/modules/subscriptions/secure.md` documents the shape
      (new "Public surface" section).
- [x] `pnpm --filter @oven/module-subscriptions test` green (83/83).

## Dependencies

- Sprint-01 foundation.

## Risks

- **Low**: projection change may break the marketing site if it
  currently reads a non-public column. Mitigation: grep
  `apps/dashboard/src/app/portal/pricing/` (portal route) for any
  such field before landing.

## Test Plan

- Unit tests as above.
- Portal dev server: `pnpm dev --filter @oven/dashboard` and view
  `/portal/pricing`; confirm all plans render with price + quota
  summary.

## Rule Compliance Checklist

- [x] OWASP A01 — public endpoint returns only public fields.
- [x] OWASP A05 — no reliance on client-side filtering (explicit
      Drizzle projection).
- [x] `CLAUDE.md` `import type` for the new `PublicBillingPlan` type.
- [x] Response shape documented in `secure.md` "Public surface" section.

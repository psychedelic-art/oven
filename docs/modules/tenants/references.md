# Module Tenants — References

External and internal references that shape this module's design.

## Internal

- [`docs/modules/13-tenants.md`](../13-tenants.md) — top-level spec.
  Authoritative on ModuleDefinition shape, field migration map, and
  the public-endpoint composition pattern.
- [`docs/modules/20-module-config.md`](../20-module-config.md) —
  config storage and the 5-tier cascade. Tenants is the largest
  consumer of config.
- [`docs/modules/21-module-subscriptions.md`](../21-module-subscriptions.md) —
  billing plan and quota management. Replaces the `whatsappLimit` /
  `webLimit` columns.
- [`docs/modules/17-auth.md`](../17-auth.md) — auth middleware sets
  the `app.role`, `app.user_id`, `app.tenant_ids` GUCs that the
  planned RLS policies depend on.
- [`docs/modules/00-overview.md`](../00-overview.md) — platform
  module graph. Tenants is a Phase-0 foundation module.
- [`docs/module-rules.md`](../../module-rules.md) — Rule 3.3 (adapter
  pattern), Rule 4.3 (FKs are plain integers), Rule 6.3 (tenant
  filtering on list views), Rule 13 (config centralization).
- [`docs/routes.md`](../../routes.md) — platform route registry.
- [`docs/use-cases.md`](../../use-cases.md) — UC 2, 3, 7, 9, 10, 11.
- [`docs/package-composition.md`](../../package-composition.md) —
  cross-module import rules.
- [`docs/modules/crosscheck-report.md`](../crosscheck-report.md) —
  dependency + FK consistency audit.

## External — multi-tenant design

- PostgreSQL RLS for multi-tenant isolation —
  `https://www.postgresql.org/docs/current/ddl-rowsecurity.html`
- Drizzle ORM tenant-scoped queries —
  `https://orm.drizzle.team/docs/rls`
- Supabase "Schemas vs RLS policies for multi-tenancy" pattern —
  `https://supabase.com/docs/guides/database/postgres/row-level-security`
- AWS prescriptive guidance on multi-tenant identity isolation —
  `https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-api-access-authorization/`
- Auth0 "Isolating tenants in a single database" patterns —
  `https://auth0.com/docs/manage-users/organizations`

## External — identity-vs-configuration separation

- Martin Fowler, "ValueObject" and "RecordEnclosure" patterns —
  `https://martinfowler.com/eaaCatalog/valueObject.html`
- Rails "thin models, thick policies" — internalized to
  "slim identity, thick config" in this module.
- Stripe API Customer object — the same slim-identity pattern
  (Customer has identity fields only; settings live elsewhere).

## External — business-hours computation

- `Intl.DateTimeFormat` MDN — the reference for timezone-aware
  weekday + time extraction used in `computeBusinessHours` —
  `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat`
- IANA time zone database — `https://www.iana.org/time-zones`
- `date-fns-tz` library (NOT used — `Intl` is enough and avoids a
  dep) — `https://github.com/marnusw/date-fns-tz`

## External — event-driven cross-module coordination

- "Event-carried state transfer" (Martin Fowler) —
  `https://martinfowler.com/articles/201701-event-driven.html`
- "Outbox pattern" for at-least-once event delivery —
  `https://microservices.io/patterns/data/transactional-outbox.html`
  (not yet implemented; considered for sprint-04).

## Internal reference implementations

- `packages/module-config/` — canonical pattern for a Phase-0
  foundation module with heavy unit tests (24 tests).
- `packages/module-notifications/` — canonical pattern for a module
  with an adapter surface + handler set + 37 tests.
- `packages/module-ai/src/api/_utils/sort.ts` — F-05-01 sort
  allowlist helper that sprint-02 will copy for tenants list
  handlers.

## Prior art

- Previous monolithic `tenants` table with 14 config columns —
  preserved in git history before the 2026-03 refactor. Not accessed
  at runtime any more.

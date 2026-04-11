# Subscriptions — References

External references used to design and harden this module. Every
citation was reviewed on 2026-04-11 and reconciled against the
top-level spec and the current code.

## Internal references

- **Top-level spec**: [`docs/modules/21-module-subscriptions.md`](../21-module-subscriptions.md)
  — the 887-line authoritative spec this canonical doc set restates.
- **Module rules**: [`docs/module-rules.md`](../../module-rules.md) —
  Rules 1 (ModuleDefinition), 2 (Discoverable), 3 (Package boundary),
  4 (Schema), 5 (Seed), 6 (Events).
- **Package composition**: [`docs/package-composition.md`](../../package-composition.md)
  — where `module-subscriptions` sits in the layer stack (directly
  above `module-tenants` and `module-config`).
- **Routes**: [`docs/routes.md`](../../routes.md) — every live route
  must be listed. `POST /api/usage/track`, `GET /api/usage/summary`,
  and `GET /api/tenant-subscriptions/[tenantId]/usage` are sprint-02
  additions.
- **Use cases**: [`docs/use-cases.md`](../../use-cases.md) —
  UC-04 and UC-07 are owned by this module.
- **Tenants module**: [`docs/modules/tenants/secure.md`](../tenants/secure.md)
  — the RLS / `app.tenant_ids` GUC pattern copied here.
- **Config module**: [`docs/modules/config/`](../config/) — plan
  defaults and kill-switches live in config cascade.
- **AI module**: [`docs/modules/ai/module-design.md`](../ai/module-design.md)
  — the middleware that is the hot consumer of `checkQuota` and
  `trackUsage`.
- **Crosscheck report**: [`docs/modules/crosscheck-report.md`](../crosscheck-report.md)
  §6.2 #1–#2, §6.3 #3 — the gaps this canonical doc set closes.

## External references

### Metered billing architecture

- [Stripe Metered Billing Guide for SaaS (2026)](https://www.buildmvpfast.com/blog/stripe-metered-billing-implementation-guide-saas-2026)
  — informs the Meter → Price → Subscription → Event model. Our
  schema uses `sub_services` as the meter analogue, `sub_billing_plans`
  as the price analogue, and `sub_usage_records` as the event ledger.
- [Stripe: Usage-based billing docs](https://docs.stripe.com/billing/subscriptions/usage-based)
  — aggregation methods (`sum`, `count`, `last`). Our `sum`-based
  rollup in `GET /api/usage/summary` matches the Stripe
  recommendation for token and message counting.
- [Stripe: Usage metering — what it is and how it works](https://stripe.com/resources/more/usage-metering)
  — general metering primer; informs the "internal DB is source of
  truth, billing is a downstream sync" decision.
- [OpenMeter: Implementing usage-based pricing with Stripe](https://openmeter.io/blog/implementing-usage-based-pricing-with-stripe)
  — high-volume buffering (app-side aggregation + bulk flush). Our
  `UsageBuffer` interface (architecture.md §"Usage buffering") is
  derived from this pattern.
- [ColorWhistle: Stripe metered billing for dev-focused SaaS](https://colorwhistle.com/stripe-metered-billing-saas/)
  — confirms the reseller model (OVEN contracts with Twilio, resells
  as "WhatsApp messages") is a recognised pattern.

### Multi-tenant data isolation

- [Multi-tenant data isolation with PostgreSQL RLS (AWS Database Blog)](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/)
  — the RLS + `current_setting('app.tenant_ids')` pattern
  (`ALTER TABLE … ENABLE ROW LEVEL SECURITY; CREATE POLICY …`).
- [Crunchy Data: Designing Postgres for multi-tenancy](https://www.crunchydata.com/blog/designing-your-postgres-database-for-multi-tenancy)
  — confirms pool / shared-schema + tenant-id column is the right
  starting point for OVEN's scale.
- [Multi-tenancy implementation with PostgreSQL (Logto)](https://blog.logto.io/implement-multi-tenancy)
  — end-to-end walkthrough of a `tenant_id` + RLS design.
- [AWS prescriptive guidance: Managed PostgreSQL for multi-tenant SaaS](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/welcome.html)
  — covers performance isolation tactics (gateway-level limits,
  per-tenant connection pools).
- [Simplyblock: Underrated Postgres multi-tenancy with RLS](https://www.simplyblock.io/blog/underated-postgres-multi-tenancy-with-row-level-security/)
  — defence-in-depth argument: RLS is a safety net below app-layer
  scoping, not a replacement for it.

### Related patterns

- [Neon: Multi-tenancy and database-per-user design](https://neon.com/blog/multi-tenancy-and-database-per-user-design-in-postgres)
  — confirms OVEN's shared-schema approach scales well on Neon.
- [Cloudflare: Performance isolation in a multi-tenant DB](https://blog.cloudflare.com/performance-isolation-in-a-multi-tenant-database-environment/)
  — gateway-layer rate limiting advice; informs the
  `POST /api/usage/track` 1000-req-per-minute-per-tenant limit in
  `detailed-requirements.md` SUB-R11.

## Reject list

Sources that were reviewed but **not adopted** because they
conflict with the stack or the ground-truth rules:

- Any guidance to store quota state in Redis as the primary source
  of truth — we follow the 2026 Stripe guidance that internal DB
  is authoritative, cache is advisory.
- Any guidance to use Stripe's `meter_events` API as the ledger —
  conflicts with SUB-R6 (internal ledger is the source of truth)
  and would require a runtime dependency on Stripe that this
  module is intentionally free of.
- Any guidance to model `tenantId` as a UUID — conflicts with
  `docs/module-rules.md` Rule 4.3 (plain integer FKs).

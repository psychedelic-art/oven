# Module Config — Business Owner

> Who owns this module, what business outcomes it supports, how we measure success.

## Owner

| Role | Name / Team |
|------|-------------|
| Product owner | Platform Infrastructure |
| Engineering owner | Platform Team (Module Registry maintainers) |
| QA owner | Platform Team |
| Business stakeholder | Every tenant-facing use case depends on this module |

## Business Outcomes

1. **Onboard a new tenant in < 5 minutes** — superadmin sets the tenant's
   operational config (schedule, tone, timezone, business name) through the
   Module Configs admin page; tenant portal picks it up immediately via the
   public tenant config endpoint.
2. **Override platform defaults per-tenant** — superadmin flips a single
   `SCHEDULE` key for tenant-42 without touching any other tenant.
3. **Swap provider credentials without a deploy** — change the Twilio account
   SID for tenant-42 in the dashboard; the next outbound message uses the new
   credentials. No code change, no restart.
4. **Expose module settings for visual editing** — every module's
   `configSchema` becomes a dashboard-editable surface with zero per-module
   UI code. Adding a new setting is a one-line change in the module's
   definition.

## Priority Tier: P1 (Foundation)

Config is a **P1 foundation module**. It must ship before these P2 modules
can be fully completed:

- `module-subscriptions` — needs tenant-scoped credential storage.
- `module-notifications` — needs channel config per tenant.
- `module-tenants` — needs a config store to back operational settings.
- `module-knowledge-base` — needs per-tenant embedding model choice.

Because config sits so far upstream, any slip here cascades into all P2
timelines.

## Use-Case Coverage

Mapping to [`docs/use-cases.md`](../../../use-cases.md):

| Use Case | How Config serves it |
|---------:|----------------------|
| UC 1 — Initial Platform Setup | Superadmin seeds platform-global defaults for every module via the Module Configs page. |
| UC 2 — Onboard a Tenant | Superadmin creates tenant-scoped rows for operational keys (`SCHEDULE`, `TONE`, `TIMEZONE`, `BUSINESS_NAME`). |
| UC 3 — Configure a Tenant | Superadmin (or tenant admin with RLS-scoped write access) updates tenant-scoped config rows. |
| UC 4 — Set Up Provider Credentials | Provider SIDs and tokens are stored as tenant-scoped config entries. |
| UC 8 — Override Config for One Tenant | Creates a `tenant-module` row (tier 2) that shadows the platform default (tier 4). |
| UC 11 — Manage Platform Defaults | Edits `tenantId IS NULL, scope='module'` rows directly. |

## Success Metrics

1. **P95 latency of `/api/module-configs/resolve-batch`** < 50ms for a 14-key
   batch on a warm connection. Measured in dashboard integration tests once
   they land.
2. **Zero cross-tenant reads** under RLS — every integration test for
   subscriptions / tenants / notifications asserts this.
3. **Schema-default fallback coverage** = 100% — every key referenced by a
   consuming module has a declared `configSchema` entry, so tier 5 always
   resolves to a non-null value.
4. **Dashboard CRUD round-trip** for any key < 1.5s on the superadmin plan.

## Non-Business Metrics (Engineering Health)

- Unit test coverage of the cascade resolver ≥ 90% (branch coverage).
- Zero `style={}` props in the Module Configs dashboard components.
- Every handler file independently importable (rule 4.4).

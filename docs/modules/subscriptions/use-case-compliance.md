# Subscriptions — Use Case Compliance

Mapping from `docs/use-cases.md` to the subscriptions module's
responsibilities. Each use case either **owns** its flow in this
module, **consumes** this module through events or API calls, or is
**N/A** because it belongs to a different vertical.

## UC-01 — User registers and creates a workspace

**Owner**: `module-auth` + `module-tenants`.

**Subscriptions role**: On new-tenant creation, `module-tenants`
emits `tenant.created`. A listener (sprint-02) reacts by creating a
`sub_tenant_subscriptions` row on the free / trial plan. The default
plan slug comes from `module-config` key `subscriptions.defaultPlanSlug`.

**Verdict**: Consumer. No subscriptions UI flow required.

## UC-02 — Tenant admin invites users

**Owner**: `module-auth` (user list + invitations).

**Subscriptions role**: `checkQuota(tenantId, 'users')` — if the
platform ever sells per-user quotas (not currently modelled but
architecturally supported). Currently N/A.

**Verdict**: N/A.

## UC-03 — Tenant admin sends WhatsApp messages

**Owner**: `module-notifications` (channel send).

**Subscriptions role**: **Mission-critical consumer**. Notifications
middleware calls `subscriptions.checkQuota(tenantId, 'whatsapp')`
before every send and `subscriptions.trackUsage(tenantId, 'whatsapp', 1, idempotencyKey)` after.

**Verdict**: Consumer — hot path, must be fast (<5ms). The engine
caches the effective limit for 30 seconds per `(tenantId, serviceSlug)`
pair (cache layer added in sprint-02).

## UC-04 — Tenant admin views usage dashboard

**Owner**: **this module**.

**Subscriptions role**: Owns the `UsageMeter` component,
`GET /api/usage/summary`, and
`GET /api/tenant-subscriptions/[tenantId]/limits`. The tenant admin
opens the dashboard home (or the tenant detail page) and sees a
progress bar per service.

**Delivery**: sprint-04.

**Verdict**: **Owner**.

## UC-05 — Tenant admin sends a form / runs a flow

**Owner**: `module-flows` + `module-forms`.

**Subscriptions role**: Flows may consume quota for AI-driven
branches via `module-ai` middleware, which already goes through
subscriptions. No direct coupling.

**Verdict**: Indirect consumer.

## UC-06 — Tenant admin chats with an agent

**Owner**: `module-chat` + `module-agent-core`.

**Subscriptions role**: Every chat completion is metered via
`module-ai` middleware calling `subscriptions.checkQuota('ai-chat')`
and `subscriptions.trackUsage('ai-chat', tokens)`. When quota is
exceeded, the chat runtime surfaces the `subscription.quota.exceeded`
event to the user as a friendly upgrade prompt.

**Verdict**: Hot consumer.

## UC-07 — Platform admin configures plans and services

**Owner**: **this module**.

**Subscriptions role**: Owns the full React Admin resource set —
services, providers, billing plans, plan quotas, tenant subscriptions,
overrides. Sprint-04 is the delivery sprint.

**Verdict**: **Owner**.

## UC-08 — Platform admin views billing reports

**Owner**: Future module (`module-billing-reports`, not yet planned).

**Subscriptions role**: Future consumer — reports module will query
`sub_usage_records` rolled up by period. Subscriptions does not
render reports itself; it is the data source.

**Verdict**: Future consumer.

## UC-09 — Tenant admin reviews their invoice

**Owner**: Future `module-billing` (Stripe sync).

**Subscriptions role**: Future consumer — the Stripe sync module will
read `sub_tenant_subscriptions` + rolled-up `sub_usage_records` and
post a draft invoice. This module is the source of truth; it does
NOT talk to Stripe directly.

**Verdict**: Future consumer.

## UC-10 — Tenant admin upgrades their plan

**Owner**: Future `module-billing` (self-serve upgrade flow).

**Subscriptions role**: Owns the `PUT /api/tenant-subscriptions/[id]`
endpoint that changes `planId`. The new module would call this
endpoint on successful Stripe payment. Currently only platform admins
can change a plan.

**Verdict**: API provider.

## Coverage summary

| UC   | Owner?          | Delivery sprint |
|------|-----------------|-----------------|
| UC-01 | Consumer       | sprint-02 (default-plan listener) |
| UC-02 | N/A            | — |
| UC-03 | Consumer (hot) | sprint-01 (engine baseline), sprint-02 (caching) |
| UC-04 | **Owner**      | sprint-04 |
| UC-05 | Indirect       | — |
| UC-06 | Consumer (hot) | sprint-01 (engine baseline), sprint-02 (caching) |
| UC-07 | **Owner**      | sprint-04 |
| UC-08 | Future         | — |
| UC-09 | Future         | — |
| UC-10 | API provider   | — |

The two use cases this module OWNS (UC-04 tenant usage dashboard
and UC-07 platform admin plan management) are both scoped to
sprint-04. Everything else is either a hot consumer path covered
by sprint-01 engine tests or out of scope.

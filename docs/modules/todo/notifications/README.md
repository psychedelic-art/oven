# Notifications — TODO

> **Spec**: [`docs/modules/15-notifications.md`](../../15-notifications.md)
> **Package (planned)**: `packages/module-notifications/`
> **Canonical doc set (scaffolded)**: [`docs/modules/notifications/`](../../notifications/)
> **Current sprint**: [`sprint-01-foundation.md`](./sprint-01-foundation.md)
> **Status**: see [`STATUS.md`](./STATUS.md)

---

## Summary

Notifications is the OVEN multi-channel messaging module. It handles inbound
and outbound communication over WhatsApp Business, SMS, and email using the
adapter pattern from [module-rules Rule 3.3](../../../module-rules.md#33--adapter-pattern-for-external-integrations).

It owns:

- **Channels** — per-tenant WhatsApp/SMS/email endpoints with adapter-specific config
- **Conversations** — threaded inbound/outbound message history per external user
- **Messages** — individual messages with delivery status tracking
- **Usage metering** — per-tenant, per-channel, per-period inbound counts
- **Escalations** — out-of-scope, clinical, user-requested, or over-limit handoffs to humans

The first shipping channel is **WhatsApp Business Cloud API (Meta)**. SMS via Twilio
and email via Resend follow the same adapter contract and ship in later sprints.

---

## Sprint Roadmap

| Sprint | File | State | Goal |
|---|---|---|---|
| 00 | [`sprint-00-discovery.md`](./sprint-00-discovery.md) | done (Phase 3) | Research + Rule 13 drift decision + crosscheck |
| 01 | [`sprint-01-foundation.md`](./sprint-01-foundation.md) | **in-progress (Phase 4)** | Scaffold `packages/module-notifications/`: schema, ModuleDefinition, adapter registry, seed, tests |
| 02 | [`sprint-02-whatsapp-meta-adapter.md`](./sprint-02-whatsapp-meta-adapter.md) | ready | `@oven/notifications-meta` adapter package + `/api/notifications/whatsapp/webhook` GET verify + POST ingest |
| 03 | [`sprint-03-usage-metering.md`](./sprint-03-usage-metering.md) | ready | Monthly period rollover, `checkUsageLimit()` service, limit events, `notifications.checkLimit` workflow node |
| 04 | [`sprint-04-dashboard-ui.md`](./sprint-04-dashboard-ui.md) | ready | React Admin resources for Channels, Conversations, Escalations + UsageDashboard custom page |
| 05 | [`sprint-05-acceptance.md`](./sprint-05-acceptance.md) | ready | Integration test: dental FAQ WhatsApp end-to-end + acceptance checklist |

---

## Dependencies

Declared in order of registration:

1. `module-config` — config cascade for operational settings
2. `module-tenants` — tenant identity (slim — no operational columns per Rule 13)
3. `module-subscriptions` — **plan quotas supply per-channel limits** (replaces the stale `tenant.whatsappLimit` reference in the spec)
4. `module-roles` — permission seeding
5. `module-agent-core` — conversation→agent session delegation

Rule 13 drift: the spec section 6 references `tenant.whatsappLimit` / `tenant.webLimit`
as columns on `module-tenants`. The real `packages/module-tenants/src/schema.ts` is
a slim identity table. The resolved design (see [`../../notifications/architecture.md`](../../notifications/architecture.md#usage-limit-resolution))
reads limits from `module-subscriptions` plan quotas via
`subscriptions.checkQuota({ serviceSlug: 'notifications-whatsapp', tenantId })`,
falling back to a `configSchema` default via `module-config` resolve-batch when no
subscription is attached. The spec file will be updated in sprint-05-acceptance.

---

## Quick Links

- Spec: [`15-notifications.md`](../../15-notifications.md)
- Canonical doc set: [`docs/modules/notifications/`](../../notifications/)
- Code review: [`CODE-REVIEW.md`](./CODE-REVIEW.md)
- Business owner: [`business-owner.md`](./business-owner.md)
- Boot prompt: [`PROMPT.md`](./PROMPT.md)

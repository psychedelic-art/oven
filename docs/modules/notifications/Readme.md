# Module Notifications — Overview

> **Package**: `packages/module-notifications/`
> **Name**: `@oven/module-notifications`
> **Dependencies**: `module-registry`, `module-config`, `module-tenants`, `module-agent-core` (+ optional `module-subscriptions`)
> **Status**: Phase 3 doc set scaffolded (2026-04-11); Phase 4 foundation in progress
> **Spec**: [`../15-notifications.md`](../15-notifications.md)
> **TODO tracker**: [`../todo/notifications/`](../todo/notifications/)

---

## What It Does

Module Notifications is the **multi-channel messaging layer** of the OVEN
platform. It owns the inbound and outbound lifecycle of conversational
messages exchanged between a tenant's customers and the tenant's agent
pipeline.

- **Channels** — per-tenant configured endpoints (WhatsApp Business via
  Meta, SMS via Twilio, email via Resend). Each channel is backed by an
  external adapter package registered at app startup, never imported by
  the module itself.
- **Conversations** — threaded exchanges keyed by `(tenantId, channelId,
  externalUserId)`. Conversations optionally attach to a
  `module-agent-core` session so the agent has full context.
- **Messages** — individual inbound/outbound payloads with delivery-state
  tracking (`sent`, `delivered`, `read`, `failed`).
- **Usage metering** — per-tenant, per-channel, per-month inbound counters
  with automatic rollover. Limits are resolved from `module-subscriptions`
  plan quotas, with a `module-config` default fallback.
- **Escalations** — structured records capturing when a conversation
  cannot be handled by the agent (out-of-scope, clinical, user-requested,
  usage-exceeded) and should be routed to a human.

The first shipping channel is **WhatsApp Business Cloud API (Meta)**.

---

## Why It Exists

Without `module-notifications`, every tenant-facing product would
reimplement webhook intake, signature verification, per-tenant channel
management, conversation state, and usage metering. By centralizing it:

1. **Consistency** — every inbound message flows through the same ingest
   pipeline (signature verify → identify tenant → conversation upsert →
   message insert → usage increment → event emission → agent delegation).
2. **Discoverability** — the module registers its capabilities via the
   standard `chat.actionSchemas` block, so agents can call
   `notifications.listConversations` / `notifications.getUsage` /
   `notifications.checkLimit` without hard-coded integrations.
3. **Swappability** — adding a new channel provider (e.g. `@oven/notifications-twilio`)
   is a new package, not a change to this one.
4. **Tenant safety** — every query filters by `tenantId`; every event
   payload carries `tenantId`; webhook routes are the only public
   endpoints and they do HMAC verification before touching the database.

---

## Architectural Position

```
                               +----------------------+
                               |   External users     |
                               |   (phone, email)     |
                               +----------+-----------+
                                          |
                  Meta WhatsApp / Twilio SMS / Resend email
                                          |
                                          v
+----------------+    HMAC verify   +----------------------+
| Adapter pkg    | ---------------> |   module-notifications|
| (meta/twilio/  |                  |   ingest pipeline    |
|  resend)       | <---outbound---- +----------+-----------+
+----------------+                             |
                                                |
    +-------------------+------------------+----+----+----------------+
    |                   |                  |         |                |
    v                   v                  v         v                v
module-tenants    module-agent-core   module-      module-        module-
(tenant lookup)   (conversation-to-   config       subscriptions  roles
                   session bridge)    (fallback    (primary limit (permission
                                       limit)      source)         seeding)
```

Adapter packages are **never** imported by `@oven/module-notifications`
itself. They are registered at app startup from
`apps/dashboard/src/lib/modules.ts`:

```typescript
import { registerNotificationAdapter } from '@oven/module-notifications';
import { metaAdapter } from '@oven/notifications-meta';
registerNotificationAdapter(metaAdapter);
```

---

## Quick Start

```typescript
// Resolve a tenant's current usage against its plan quota.
import { checkUsageLimit } from '@oven/module-notifications/services';
const { allowed, remaining, limit, used } = await checkUsageLimit(tenantId, 'whatsapp');
if (!allowed) {
  // short-circuit to escalation response with contact info
}
```

```typescript
// Discover the actions via the module registry (from an agent).
import { registry } from '@oven/module-registry';
const module = registry.getModule('notifications');
const actions = module?.chat?.actionSchemas ?? [];
```

---

## Related Docs

- [`architecture.md`](./architecture.md) — ingest pipeline, adapter
  lifecycle, usage limit resolution, rule-13 resolution
- [`module-design.md`](./module-design.md) — file layout, public surface,
  internal modules
- [`database.md`](./database.md) — the five tables + indexes
- [`api.md`](./api.md) — REST contract, webhook contract, chat block
- [`UI.md`](./UI.md) — React Admin resources and custom pages
- [`detailed-requirements.md`](./detailed-requirements.md) — functional
  requirements traced back to spec + `business-owner.md`
- [`prompts.md`](./prompts.md) — build prompts for TDD sprint execution
- [`references.md`](./references.md) — upstream SDKs, docs, reference
  implementations
- [`secure.md`](./secure.md) — threat model, webhook verification, secrets
  handling, RLS considerations
- [`use-case-compliance.md`](./use-case-compliance.md) — mapping to
  `docs/use-cases.md`

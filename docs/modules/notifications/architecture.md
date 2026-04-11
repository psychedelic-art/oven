# Architecture — module-notifications

## Layering

```
HTTP layer          src/api/*.handler.ts
   |
Service layer       src/services/{conversation-pipeline,usage-metering,usage-limit-resolver}.ts
   |
Schema + types      src/schema.ts, src/types.ts, src/events.ts
   |
Adapter surface     src/adapters/{types,registry}.ts  (interface only)
   |
External adapters   packages/notifications-{meta,twilio,resend}/  (separate packages)
```

No upward imports. Adapters never import services. Services never import
handlers. Handlers never `import` adapters directly — they resolve via
`registry.getAdapter(name)`.

## Inbound Ingest Pipeline

```
1. POST /api/notifications/{channel}/webhook arrives
2. Handler calls raw = await request.text()             // MUST precede any parsing
3. Handler resolves adapter name from the route slug
4. adapter.verifyWebhookSignature(req, channel.webhookVerifyToken)
       - reads the signature header (X-Hub-Signature-256 for Meta)
       - HMAC-SHA256(raw, appSecret)
       - constant-time compare via crypto.timingSafeEqual
       - returns false on mismatch → handler returns 401
5. message = adapter.parseInboundWebhook(req)
6. conversation-pipeline.ingestInboundMessage({ channelId, message })
     a. find-or-create notification_conversations row
     b. insert notification_messages row (direction='inbound')
     c. usage-metering.incrementUsage(tenantId, channelType)
     d. if just crossed USAGE_WARNING_THRESHOLD:
          emit notifications.usage.limitWarning
     e. if usage >= limit:
          insert notification_escalations (reason='limit-exceeded')
          emit notifications.usage.limitExceeded
          short-circuit: do NOT delegate to agent
     f. else: delegate to module-agent-core session (resolved via registry)
7. emit notifications.message.received
8. handler returns 200
```

The handler **never** calls `request.json()` directly — the body is
consumed once via `request.text()` and then parsed with `JSON.parse(raw)`
after signature verification. This is non-negotiable: once the body is
consumed as JSON you cannot recover the exact byte stream the HMAC was
computed over.

## Outbound Send Pipeline

```
1. Agent pipeline produces a reply (text or template)
2. conversation-pipeline.sendOutboundMessage({ conversationId, content })
     a. load channel + resolve adapter
     b. adapter.sendMessage(channel.config, externalUserId, content)
     c. insert notification_messages row (direction='outbound',
        externalMessageId from SendResult, status from SendResult)
     d. emit notifications.message.sent
3. Later: delivery status webhook updates notification_messages.status
          via adapter.parseDeliveryStatus
```

## Adapter Lifecycle

```
App boot (apps/dashboard/src/lib/modules.ts):
  import { registerNotificationAdapter } from '@oven/module-notifications';
  import { metaAdapter } from '@oven/notifications-meta';
  registerNotificationAdapter(metaAdapter);
  // … more adapters
  registry.register(notificationsModule);
```

The adapter registry is a plain in-memory `Map<string, NotificationAdapter>`
inside the package. It exposes:

- `registerNotificationAdapter(adapter)` — throws if the name is already
  registered (fail-fast on duplicate wiring)
- `getAdapter(name)` — returns `NotificationAdapter | null`
- `getAdapterForChannelType(channelType)` — returns the first adapter
  whose `channelType` matches; used for seeding default adapter preference
- `listAdapters()` — returns a frozen snapshot for the dashboard UI
- `clearAdapters()` — test-only

## Usage Limit Resolution

This section is the authoritative fix for the Rule 13 drift described in
[`../todo/notifications/CODE-REVIEW.md`](../todo/notifications/CODE-REVIEW.md#drift-1-usage-limits-referenced-as-tenant-columns-rule-13-violation).

The spec file `15-notifications.md` section 6 reads as if limits live on
`tenants.whatsappLimit`. They do not. `module-tenants` is a slim identity
table per Rule 13. Limits are resolved as follows (sprint-03 ships this):

```
usageLimitResolver.resolve(tenantId, channelType):

  serviceSlug = {
    whatsapp: 'notifications-whatsapp',
    sms:      'notifications-sms',
    email:    'notifications-email',
  }[channelType]

  // Tier 1: subscriptions plan quota
  const subs = await lazyRequire('@oven/module-subscriptions/engine')
  if (subs) {
    try {
      const quota = await subs.checkQuota({ tenantId, serviceSlug })
      if (quota) return { source: 'subscriptions', limit: quota.limit, used: quota.used }
    } catch { /* fall through */ }
  }

  // Tier 2: module-config default
  const key = {
    whatsapp: 'DEFAULT_WHATSAPP_LIMIT',
    sms:      'DEFAULT_SMS_LIMIT',
    email:    'DEFAULT_EMAIL_LIMIT',
  }[channelType]
  const res = await fetch(
    `/api/module-configs/resolve?moduleName=notifications&key=${key}&tenantId=${tenantId}`
  )
  if (res.ok) {
    const { value } = await res.json()
    return { source: 'config', limit: Number(value), used: await readCurrentUsage(...) }
  }

  // Tier 3: fail-safe
  return { source: 'failsafe', limit: 0, used: 0 }
```

The `source` field is preserved on the metered usage row so operators can
see exactly which tier resolved the limit when debugging.

## Registration Order

```typescript
// apps/dashboard/src/lib/modules.ts  (sprint-04 / sprint-05)
registry.register(configModule);
registry.register(rolesModule);
registry.register(tenantsModule);
registry.register(subscriptionsModule);       // optional — see Rule 3.2
registry.register(aiModule);
registry.register(knowledgeBaseModule);
registry.register(agentCoreModule);
registry.register(notificationsModule);       // <-- here
```

## No-Import Invariant (test-enforced)

Sprint-01 ships `src/__tests__/no-cross-module-imports.test.ts` which
greps the package sources for any `from '@oven/notifications-*'` or
direct `@oven/module-*` business-logic imports (allow-list:
`@oven/module-registry`, `@oven/module-config`). A failure here means
someone broke Rule 3.1.

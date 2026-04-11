# API — module-notifications

All routes live under `apps/dashboard/src/app/api/…` and are declared by
the `apiHandlers` map in `src/index.ts`. Every handler uses
`parseListParams` + `listResponse` from `@oven/module-registry/api-utils`
(Rule 10.1) and the `withHandler` error matcher pattern (Rule 10.4).

All non-webhook routes require authentication via `module-auth`. Webhook
routes are marked public in `api_endpoint_permissions` by the seed
function (Rule 10.5).

---

## REST Endpoints

| Method | Route | Purpose | Auth | Permission |
|---|---|---|:-:|---|
| GET | `/api/notification-channels` | List channels, filtered by active tenant | yes | `notification-channels.read` |
| POST | `/api/notification-channels` | Create a channel | yes | `notification-channels.create` |
| GET | `/api/notification-channels/[id]` | Get a channel | yes | `notification-channels.read` |
| PUT | `/api/notification-channels/[id]` | Update a channel | yes | `notification-channels.update` |
| DELETE | `/api/notification-channels/[id]` | Delete a channel | yes | `notification-channels.delete` |
| GET | `/api/notification-conversations` | List conversations | yes | `notification-conversations.read` |
| GET | `/api/notification-conversations/[id]` | Get conversation + messages | yes | `notification-conversations.read` |
| GET | `/api/notification-escalations` | List escalations | yes | `notification-escalations.read` |
| GET | `/api/notification-escalations/[id]` | Get a single escalation | yes | `notification-escalations.read` |
| PUT | `/api/notification-escalations/[id]` | Resolve an escalation | yes | `notification-escalations.resolve` |
| GET | `/api/notifications/usage` | Usage summary per channel for a tenant | yes | `notification-usage.read` |
| GET | `/api/notifications/whatsapp/webhook` | Meta webhook verification challenge | **public** | — |
| POST | `/api/notifications/whatsapp/webhook` | Meta inbound webhook | **public** | — (HMAC verified) |

---

## List Contract (example)

```typescript
// GET /api/notification-conversations?_sort=updatedAt&_order=DESC&_start=0&_end=25
// Headers: X-Tenant-Id: 5
// Response headers: Content-Range: notification-conversations 0-24/142
{
  "data": [ { "id": 42, "tenantId": 5, "channelType": "whatsapp", /* … */ } ],
  "total": 142
}
```

The handler mirrors the shape in `15-notifications.md` section 13:

```typescript
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { withHandler } from '@oven/module-registry/api-errors';

export const GET = withHandler(async (request) => {
  const params = parseListParams(request);
  const tenantId = Number(request.headers.get('x-tenant-id'));
  // Rule 5.2: filter by tenant
  const where = and(
    eq(notificationConversations.tenantId, tenantId),
    params.filter?.channelType && eq(notificationConversations.channelType, params.filter.channelType),
    params.filter?.status && eq(notificationConversations.status, params.filter.status),
  );
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(notificationConversations).where(where)
      .orderBy(desc(notificationConversations.updatedAt))
      .offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(notificationConversations).where(where),
  ]);
  return listResponse(rows, 'notification-conversations', params, Number(count));
});
```

---

## Webhook Contract — Meta WhatsApp

### GET (verification handshake)

```
GET /api/notifications/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=XYZ&hub.challenge=ABCD
```

Handler behavior:

1. Read `hub.mode`, `hub.verify_token`, `hub.challenge` from the query.
2. Look up the matching `notification_channels` row by
   `adapter_name='meta'` AND `webhook_verify_token = hub.verify_token`.
3. If a row is found → return `hub.challenge` as the body with status 200.
4. Otherwise → return 403.

### POST (inbound event)

```
POST /api/notifications/whatsapp/webhook
Headers: X-Hub-Signature-256: sha256=<hex>
Body: { "entry": [ { "changes": [ { "value": { /* messages */ } } ] } ] }
```

Handler order of operations (**critical — do not reorder**):

```typescript
export const POST = withHandler(async (req) => {
  const raw = await req.text();                              // 1. RAW BODY FIRST
  const sig = req.headers.get('x-hub-signature-256');
  const adapter = getAdapter('meta');
  const valid = await adapter.verifyWebhookSignature({       // 2. HMAC verify
    rawBody: raw, signatureHeader: sig, appSecret: process.env.META_APP_SECRET!,
  });
  if (!valid) return new Response('invalid signature', { status: 401 });

  const parsed = JSON.parse(raw);                            // 3. parse only after verify
  const message = await adapter.parseInboundWebhook(parsed);
  await ingestInboundMessage({ adapterName: 'meta', message });
  return new Response('ok', { status: 200 });
});
```

---

## `chat.actionSchemas` (Module Registry Discovery)

The module exposes four discoverable actions through `chat.actionSchemas`.
These are the canonical shapes agents and the Tool Wrapper see when they
call `registry.getAll()`.

| Name | Endpoint | Permissions |
|---|---|---|
| `notifications.listConversations` | `GET notification-conversations` | `notification-conversations.read` |
| `notifications.getUsage` | `GET notifications/usage` | `notification-usage.read` |
| `notifications.listEscalations` | `GET notification-escalations` | `notification-escalations.read` |
| `notifications.checkLimit` | (internal service — no REST endpoint) | `notification-usage.read` |

`notifications.checkLimit` is special: it is an **in-process** action
that the agent pipeline invokes synchronously via the Tool Wrapper. It
does not have a REST endpoint because it would only re-do work the
module already does during ingest. It is still listed in the action
catalog so agents can use it in their own plans.

---

## Events

| Event | Payload shape | Emitted by |
|---|---|---|
| `notifications.message.received` | `{ conversationId, tenantId, channelType, from, messageType }` | webhook POST handler, after insert |
| `notifications.message.sent` | `{ conversationId, tenantId, channelType, to, messageType }` | outbound send service |
| `notifications.message.delivered` | `{ messageId, tenantId, externalMessageId }` | delivery-status webhook |
| `notifications.message.failed` | `{ messageId, tenantId, error }` | delivery-status webhook / send failure |
| `notifications.conversation.created` | `{ id, tenantId, channelType, externalUserId }` | pipeline, on first message |
| `notifications.conversation.escalated` | `{ id, tenantId, reason, userMessage }` | pipeline or workflow node |
| `notifications.usage.limitWarning` | `{ tenantId, channelType, used, limit, percentage }` | usage-metering, on crossing |
| `notifications.usage.limitExceeded` | `{ tenantId, channelType, used, limit }` | usage-metering, on crossing |

Every payload carries `tenantId` per Rule 5.6.

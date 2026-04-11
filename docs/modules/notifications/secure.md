# Security — module-notifications

## Threat model (brief)

| Threat | Mitigation |
|---|---|
| Forged inbound webhook (attacker posts fake user messages) | HMAC-SHA256 signature verification against raw body with Meta App Secret; constant-time compare; reject on mismatch before any DB write |
| Leaked access tokens from DB dump | Sensitive `config` fields (Meta access token, Twilio auth token, Resend API key) encrypted before insert; decrypted only at send time |
| Cross-tenant data leak via list endpoints | Every handler filters by `tenantId` (Rule 5.2); RLS policies additionally restrict at the DB layer |
| Cross-tenant data leak via shared conversation ids | `ConversationShow` fetches messages filtered by both `conversationId` **and** the conversation's `tenantId` |
| Replay attacks on inbound webhooks | Meta webhook payloads carry `entry[].id` and timestamps; pipeline inserts are idempotent via the `(conversationId, externalMessageId)` composite uniqueness added in sprint-02 |
| Denial-of-service by flooding a public webhook | Usage metering terminates processing before any AI call once the tenant's limit is reached; additionally, the webhook handler fast-paths unknown `phoneNumberId` lookups to a 404 without DB writes |
| Unauthorized resolution of escalations | `notification-escalations.resolve` permission enforced by the standard auth middleware; front-desk staff must have the role that grants it |
| Agent tool misuse to read other tenants' conversations | `notifications.listConversations` requires `notification-conversations.read`; handler additionally filters by tenant context |
| Data exfiltration via logging | Never log the raw webhook body beyond `debug` level; `error` log entries redact signature headers and access tokens |

## Webhook signature verification (Meta WhatsApp)

Implementation in `packages/notifications-meta/src/signature.ts` (sprint-02):

```typescript
import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader?.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest();
  const received = Buffer.from(signatureHeader.slice(7), 'hex');
  if (received.length !== expected.length) return false;
  return timingSafeEqual(expected, received);
}
```

- Raw body is `await request.text()` **before** any JSON parsing.
- `sha256=` prefix is explicit; non-prefixed or absent header → reject.
- `timingSafeEqual` guards against timing oracles; equal-length check
  keeps it from throwing on tampered payloads.
- The App Secret is read from `process.env.META_APP_SECRET` — **not**
  from the DB — so a SQL read cannot leak it to a downstream webhook.

## Config encryption

Sensitive fields in `notification_channels.config`:

| Adapter | Encrypted fields |
|---|---|
| `meta` | `accessToken` |
| `twilio` | `authToken` |
| `resend` | `apiKey` |

Sprint-02 writes an encryption helper in
`packages/module-notifications/src/services/config-encryption.ts` that:

- Reuses `packages/module-ai/src/engine/encryption` if available via
  lazy require (it already implements AES-GCM encryption for API keys)
- Falls back to a direct AES-GCM implementation using
  `process.env.NOTIFICATIONS_CONFIG_KEY` (32 bytes) if `module-ai` is
  not installed

The dashboard never returns decrypted values in API responses. Instead
`ChannelShow` renders `••••••••••••••` via `<Typography>`; decrypted
values exist only in the send path.

## RLS considerations

The existing RLS builder (Rule 5.3) can target any notification table.
Recommended default policies for tenant isolation:

```sql
-- notification_channels
CREATE POLICY nc_tenant_isolation ON notification_channels
  USING (tenant_id = current_setting('app.current_tenant_id')::int);

-- notification_conversations, notification_messages (via conversation),
-- notification_escalations, notification_usage — same pattern
```

Platform-admin roles may bypass with `USING (true)` policies keyed on
`current_setting('app.current_role') = 'platform-admin'`.

## Public endpoints

Only the webhook routes are public. Marked by `seedNotifications()`:

```typescript
const publicEndpoints = [
  { module: 'notifications', route: 'notifications/whatsapp/webhook', method: 'GET', isPublic: true },
  { module: 'notifications', route: 'notifications/whatsapp/webhook', method: 'POST', isPublic: true },
];
```

The seed function uses `onConflictDoNothing()` to stay idempotent
(Rule 12.1). Future adapters add one row pair per public route.

## Secrets-handling rules

- **Never** log `accessToken`, `authToken`, `apiKey`, `webhookVerifyToken`,
  or the full `X-Hub-Signature-256` header.
- Outbound requests to Meta / Twilio / Resend include the token in an
  `Authorization` header; the request builder scrubs tokens from any
  error messages before surfacing them to the UI.
- Environment variables consumed by this module:
  - `META_APP_SECRET` — Meta App Secret for signature verification
  - `NOTIFICATIONS_CONFIG_KEY` — 32-byte AES-GCM key (optional, falls
    back to module-ai's encryption helper)

## Incident playbook (abbreviated)

1. **Suspected forged inbound** — check `notification_messages` for
   rows with `externalMessageId` matching Meta's logs; if none, the
   signature rejection worked. If rows exist without a Meta-side match,
   rotate `META_APP_SECRET` and re-verify.
2. **Suspected token leak** — rotate the adapter's access token in the
   Meta / Twilio / Resend console, then re-enter it in the dashboard's
   `ChannelEdit` form. The re-encryption happens on save.
3. **Usage anomaly** — inspect `notification_usage` rows for the affected
   tenant; the `metadata.source` field shows which limit-resolution
   tier answered, which narrows the investigation.

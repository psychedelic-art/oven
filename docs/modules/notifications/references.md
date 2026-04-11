# References — module-notifications

## Upstream SDKs & APIs

| Topic | Link | Notes |
|---|---|---|
| Meta WhatsApp Business Cloud API — webhook endpoint | https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint/ | Verification flow + payload shape |
| Meta Graph API — send message | https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages | `POST /{apiVersion}/{phoneNumberId}/messages` |
| GitHub docs — validating webhook deliveries (HMAC-SHA256 pattern) | https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries | Same `X-Hub-Signature-256` pattern, good reference implementation |
| Hookdeck — Implementing SHA256 webhook signature verification | https://hookdeck.com/webhooks/guides/how-to-implement-sha256-webhook-signature-verification | Cross-language verification patterns, constant-time compare |
| Next.js 15 — Route Handlers | https://nextjs.org/docs/app/api-reference/file-conventions/route | `Request.text()` raw-body contract |
| Makerkit — Next.js Route Handlers guide | https://makerkit.dev/blog/tutorials/nextjs-api-best-practices | App Router webhook patterns |
| Kitson Broadhurst — Next.js App Router + Stripe webhook signature verification | https://kitson-broadhurst.medium.com/next-js-app-router-stripe-webhook-signature-verification-ea9d59f3593f | Walk-through of the `request.text()` → verify → parse order |

## Internal references

| File | Why it matters |
|---|---|
| `docs/module-rules.md` | Ground truth; see rules 1, 2.1, 2.3, 3.1, 3.3, 4.3, 5.1, 5.6, 8, 10, 11, 12, 13 |
| `docs/modules/15-notifications.md` | The module spec (stale in section 6 — see DRIFT-1) |
| `docs/modules/13-tenants.md` | Tenant identity contract; limits are NOT columns here |
| `docs/modules/20-module-config.md` | 5-tier config cascade used for `DEFAULT_WHATSAPP_LIMIT` fallback |
| `docs/modules/21-module-subscriptions.md` | `checkQuota()` contract for the primary limit source |
| `docs/modules/17-auth.md` | Auth middleware, public endpoint handling |
| `docs/CLAUDE.md` root | Styling + type-import + zustand rules |
| `packages/module-tenants/src/index.ts` | Reference `ModuleDefinition` shape |
| `packages/module-ai/src/__tests__/cost-calculator.test.ts` | Reference vitest shape + mocking patterns |
| `packages/module-ai/src/engine/encryption.ts` | Reusable AES-GCM helper for config encryption |
| `docs/modules/ai/Readme.md` | Reference doc-set tone |

## Prior art (rejected or deferred)

| Project | Why considered | Why rejected / deferred |
|---|---|---|
| A single `module-messaging` covering WhatsApp + in-app chat + email | Fewer packages | Violates `module-rules.md` separation of concerns — chat has its own module (`08-chat.md`) and already graduated |
| Storing adapters inside `module-notifications/adapters/*.ts` | Fewer files | Violates Rule 3.3 adapter pattern — adapters must live in separate packages so modules can be added without touching core |
| Using Drizzle `references()` on foreign keys | Compile-time safety | Violates Rule 4.3 — schema-level coupling prevents arbitrary module registration order |
| Adding `whatsappLimit` / `webLimit` columns to `tenants` (the spec's implied design) | Simpler lookup | Violates Rule 13.1 — explicit `Wrong` example in module-rules; resolved via subscriptions + config |
| Cron-based period rollover for `notification_usage` | Predictable | Unnecessary — upsert creates the row lazily on the first inbound message of a new month |

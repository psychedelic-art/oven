# Detailed Requirements — module-notifications

Each requirement is tagged `R-NN` and traced back to its source:
the spec section (`spec:NN`), the business owner doc (`bo:<section>`), or
ground-truth rules (`rule:NN`). Sprint column indicates which sprint
delivers it.

---

## Functional requirements

| ID | Requirement | Source | Sprint |
|---|---|---|---|
| R-01 | Platform supports configuring WhatsApp, SMS, and email channels per tenant. | spec:1 | 01 (schema) / 02 (WhatsApp) / later (SMS, email) |
| R-02 | Channel configs are adapter-specific and stored as JSONB. | spec:4 | 01 |
| R-03 | Sensitive config fields (access tokens, API keys) are encrypted before insert. | rule:secure | 02 |
| R-04 | Inbound webhook verifies HMAC signature against raw body before any parsing. | spec:5 + research | 02 |
| R-05 | Webhook POST returns 401 on signature mismatch and emits no events. | rule:secure | 02 |
| R-06 | Webhook GET handles the Meta verification challenge (`hub.mode=subscribe`). | spec:5 | 02 |
| R-07 | On valid inbound, the pipeline finds-or-creates a conversation keyed by `(tenantId, channelId, externalUserId)`. | spec:5 | 02 |
| R-08 | Each message is persisted with direction, type, content, and external message id. | spec:4 | 02 |
| R-09 | Usage is counted per tenant per channel per month; counter is atomic. | spec:6 | 03 |
| R-10 | Limit source resolution: subscriptions → module-config → fail-safe zero. | bo:success + rule:13 | 03 |
| R-11 | Warning event fires exactly once when crossing `USAGE_WARNING_THRESHOLD`. | spec:11 | 03 |
| R-12 | Exceeded event fires exactly once when crossing 100% in a period. | spec:9 | 03 |
| R-13 | On limit exceeded, inbound messages auto-escalate with reason `limit-exceeded`. | spec:1 + bo:success | 03 |
| R-14 | A `notifications.checkLimit` workflow node is registered with module-workflow-agents. | spec:6 | 03 |
| R-15 | Conversations can attach to a `module-agent-core` session for AI replies. | spec:10 | 02 |
| R-16 | Outbound messages are persisted with `externalMessageId` from the adapter. | spec:5 | 02 |
| R-17 | Delivery status webhooks update `notification_messages.status` through the adapter's `parseDeliveryStatus`. | spec:5 | 02/later |
| R-18 | Escalations carry the last user message for context. | spec:4 | 02 |
| R-19 | Escalations can be resolved by a user with `notification-escalations.resolve`. | spec:7 | 02 |
| R-20 | Dashboard exposes Channels, Conversations, and Escalations as React Admin resources. | spec:8 | 04 |
| R-21 | Dashboard exposes a per-tenant Usage custom page with bar/line charts or a gauge fallback. | spec:8 | 04 |
| R-22 | All dashboard styling uses MUI `sx` — no inline `style={}`, no hand-written CSS. | claude.md | 04 |
| R-23 | Menu items appear under a `Notifications` section with a styled label + divider. | rule:6.2 | 04 |
| R-24 | Create forms auto-assign `tenantId` from the active tenant context. | rule:6.4 | 04 |
| R-25 | List views filter by the active tenant. | rule:6.3 | 04 |
| R-26 | Dental FAQ agent end-to-end answers at least one inbound WhatsApp text. | bo:success | 05 |

## Non-functional requirements

| ID | Requirement | Source |
|---|---|---|
| N-01 | Signature verification uses `crypto.timingSafeEqual` on equal-length buffers. | research |
| N-02 | Handlers call `parseListParams` + `listResponse` from `@oven/module-registry/api-utils`. | rule:10 |
| N-03 | Webhook routes are marked `is_public=true` in `api_endpoint_permissions` via seed. | rule:10.5 |
| N-04 | Every tenant-scoped table has a `tenant_id` column and a `_tenant_id_idx` index. | rule:5.1 |
| N-05 | Foreign keys are `integer()` — no Drizzle `references()`. | rule:4.3 |
| N-06 | Event payloads include `tenantId`. | rule:5.6 |
| N-07 | Seed function is idempotent (second call is a no-op). | rule:12.1 |
| N-08 | Adapter packages are separate workspace packages; module never imports them. | rule:3.3 |
| N-09 | Type-only imports use `import type`. | claude.md |
| N-10 | Zustand stores (if any) use the factory + context pattern, not singletons. | claude.md |
| N-11 | Error handling at system boundaries only (webhook, public API). | claude.md |
| N-12 | `pnpm --filter @oven/module-notifications test` runs green. | project-convention |

## Explicit non-goals

| ID | Non-goal | Reason |
|---|---|---|
| NG-01 | Marketing broadcasts / outbound campaigns | business-owner.md |
| NG-02 | Opt-in / consent management UI | legal review deferred |
| NG-03 | Voice / video messaging | out of roadmap |
| NG-04 | CRM funnel tracking | belongs in future `module-crm` |
| NG-05 | Adding a `whatsappLimit` column to `tenants` | Rule 13 — see architecture.md usage resolver |

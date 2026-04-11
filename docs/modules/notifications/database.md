# Database Schema — module-notifications

All five tables defined by the spec live in `packages/module-notifications/src/schema.ts`
and are composed into the global Drizzle schema via
`registry.getComposedSchema()` (Rule 3.4).

Foreign keys are plain `integer()` per Rule 4.3. Every tenant-scoped
table has a `tenantId` column and an index on it per Rule 5.1. Every
table has `id` / `createdAt` / `updatedAt` per Rule 11.2.

---

## `notification_channels`

Per-tenant configured channel endpoints.

| Column | Type | Nullable | Notes |
|---|---|:-:|---|
| `id` | `serial` PK | | |
| `tenant_id` | `integer` | | indexed (`nc_tenant_id_idx`) |
| `channel_type` | `varchar(50)` | | `whatsapp` \| `sms` \| `email`; indexed |
| `adapter_name` | `varchar(50)` | | `meta` \| `twilio` \| `resend`; indexed |
| `name` | `varchar(255)` | | display name |
| `config` | `jsonb` | | adapter-specific; **sensitive fields must be encrypted before insert** (see [`secure.md`](./secure.md)) |
| `webhook_verify_token` | `varchar(255)` | ✓ | nullable for adapters that don't need it |
| `enabled` | `boolean` | | default `true`; indexed |
| `created_at` | `timestamp` | | default now |
| `updated_at` | `timestamp` | | default now |

Adapter-specific `config` shapes:

| Adapter | Required fields |
|---|---|
| `meta` | `phoneNumberId`, `businessAccountId`, `accessToken` (encrypted), `apiVersion` |
| `twilio` | `accountSid`, `authToken` (encrypted), `phoneNumber`, `webhookUrl` |
| `resend` | `apiKey` (encrypted), `fromEmail`, `fromName`, `replyTo` |

---

## `notification_conversations`

Threaded exchanges between a channel and an external user.

| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PK | |
| `tenant_id` | `integer` | indexed |
| `channel_id` | `integer` | indexed |
| `channel_type` | `varchar(50)` | denormalized for faster list filtering |
| `external_user_id` | `varchar(255)` | phone number or email; indexed |
| `agent_session_id` | `integer` nullable | FK → `agent_sessions.id` (plain int) |
| `status` | `varchar(50)` | `active` \| `escalated` \| `closed`; indexed |
| `metadata` | `jsonb` nullable | free-form |
| `created_at` / `updated_at` | `timestamp` | |

No unique constraint on `(tenantId, channelId, externalUserId)` —
conversations can rotate (closed → new active one) for the same external
user. Find-or-create logic picks the latest `active` row or opens a new
one.

---

## `notification_messages`

Individual messages within a conversation.

| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PK | |
| `conversation_id` | `integer` | indexed |
| `direction` | `varchar(20)` | `inbound` \| `outbound`; indexed |
| `message_type` | `varchar(50)` | `text` \| `template` \| `interactive` \| `image` \| `audio` |
| `content` | `jsonb` | `{ text, mediaUrl, templateName, templateParams }` |
| `external_message_id` | `varchar(255)` nullable | the Meta / Twilio / Resend message id; indexed for delivery-status lookups |
| `status` | `varchar(50)` | `sent` \| `delivered` \| `read` \| `failed`; indexed |
| `error` | `text` nullable | error detail when `status='failed'` |
| `created_at` | `timestamp` | indexed (for recent-message queries) |

No `updated_at` because message rows are immutable except for the status
lifecycle, which can be tracked via delivery-status events.

---

## `notification_usage`

Per-tenant, per-channel, per-period inbound message counter.

| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PK | |
| `tenant_id` | `integer` | indexed |
| `channel_type` | `varchar(50)` | indexed |
| `period` | `varchar(20)` | default `monthly` |
| `period_start` | `date` | indexed |
| `period_end` | `date` | |
| `message_count` | `integer` | default `0` |
| `limit` | `integer` | snapshot of the resolved limit at period start |
| `metadata` | `jsonb` | `{ source: 'subscriptions' \| 'config' \| 'failsafe' }` |
| `created_at` / `updated_at` | `timestamp` | |

Composite unique constraint `(tenant_id, channel_type, period_start)` —
one row per tenant per channel per month. Atomic increments use
`ON CONFLICT ... DO UPDATE SET message_count = message_count + 1`.

Limits are resolved via the three-tier resolver in
[`architecture.md`](./architecture.md#usage-limit-resolution); the `metadata.source`
field records which tier answered, so operators can debug without
cross-referencing config + subscriptions by hand.

---

## `notification_escalations`

Escalation records when a conversation cannot be handled automatically.

| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PK | |
| `tenant_id` | `integer` | indexed |
| `channel_type` | `varchar(50)` | |
| `conversation_id` | `integer` | indexed |
| `reason` | `varchar(100)` | `out-of-scope` \| `clinical` \| `user-requested` \| `limit-exceeded`; indexed |
| `user_message` | `text` nullable | last inbound message text at time of escalation |
| `status` | `varchar(50)` | `pending` \| `resolved`; indexed |
| `resolved_by` | `integer` nullable | `users.id` (plain int) |
| `resolved_at` | `timestamp` nullable | |
| `created_at` | `timestamp` | |

Escalations are insert-mostly; updates only set `status`, `resolved_by`,
`resolved_at` when front-desk staff resolve them.

---

## Indexes — Summary

| Table | Index | Purpose |
|---|---|---|
| `notification_channels` | `nc_tenant_id_idx` | tenant list view |
| | `nc_channel_type_idx` | channel-type filter |
| | `nc_adapter_name_idx` | adapter lookup during ingest |
| | `nc_enabled_idx` | filter toggles |
| `notification_conversations` | `nconv_tenant_id_idx` | tenant list |
| | `nconv_channel_id_idx` | channel drill-down |
| | `nconv_external_user_idx` | find-or-create lookup |
| | `nconv_agent_session_idx` | agent-session bridge |
| | `nconv_status_idx` | active vs closed |
| `notification_messages` | `nmsg_conversation_id_idx` | thread rendering |
| | `nmsg_direction_idx` | analytics |
| | `nmsg_status_idx` | delivery tracking |
| | `nmsg_external_msg_id_idx` | delivery-status webhook match |
| | `nmsg_created_at_idx` | recency ordering |
| `notification_usage` | `nu_tenant_id_idx` | dashboard rollup |
| | `nu_channel_type_idx` | per-channel gauge |
| | `nu_period_start_idx` | trend chart |
| | `nu_tenant_channel_period` (unique) | atomic upsert |
| `notification_escalations` | `nesc_tenant_id_idx` | tenant list |
| | `nesc_conversation_id_idx` | drill-down |
| | `nesc_status_idx` | pending queue |
| | `nesc_reason_idx` | reason filter |

---

## Migration Notes

No Drizzle `references()` anywhere (Rule 4.3). Tables are created by the
standard `pnpm db:push` path since the schema is composed at registry
boot and `apps/dashboard` runs Drizzle Kit against the composed schema
object. Sprint-01 adds no migration file on its own — the composition
mechanism handles the table creation.

## Out of Scope

- No `_versions` companion table. The spec does not mark any
  notifications entity as versioned JSON definition (Rule 7.2). If that
  changes (e.g. versioned template content) a follow-up sprint adds
  `notification_template_versions`.
- No `hierarchyNodeId` column. If a tenant wants group-level scoping of
  channels (e.g. branch A has its own phone number), use an RLS policy
  against `current_hierarchy_path` (Rule 5.4 option B) rather than
  adding a column.

# Module: Notifications

> **Package**: `packages/module-notifications/`
> **Name**: `@oven/module-notifications`
> **Dependencies**: `module-registry`, `module-tenants`, `module-agent-core`
> **Status**: Planned

---

## 1. Overview

Notifications is a **multi-channel messaging module** that handles inbound and outbound communication across WhatsApp Business, email, and SMS. It provides a unified conversation abstraction across channels, with per-channel delivery tracking, usage metering, and escalation handling.

The module starts with **WhatsApp Business Cloud API** as the primary channel, designed to extend to email (via Resend/SendGrid adapter) and SMS (via Twilio adapter) using the adapter pattern from `module-rules.md` Rule 3.3.

### Key Design Decision: Usage Enforcement

Usage metering is tracked within this module (each channel counts messages independently), but **enforcement happens at the workflow level**, not at the API endpoint level. Agent workflow nodes call `notifications.checkUsageLimit()` before processing — if the limit is exceeded, the workflow short-circuits to an escalation/contact-info response. This keeps API endpoints simple and enforcement configurable.

---

## 2. Core Concepts

### Channel
A configured communication endpoint for a tenant — a WhatsApp phone number, an email address, or an SMS number. Each channel has its own configuration (API keys, phone number IDs) and usage tracking.

### Conversation
A threaded exchange between a tenant's channel and an external user (patient, customer). Conversations are identified by channel type + external user ID (phone number, email address). A conversation can optionally be backed by an agent session from `module-agent-core`.

### Usage Tracking
Per-tenant, per-channel, per-period message counting. Monthly periods track inbound message count against the tenant's limit. Limits are resolved via a three-tier cascade: (1) `module-subscriptions` plan quotas keyed by service slugs `notifications-whatsapp`, `notifications-sms`, `notifications-email`; (2) `module-config` fallback defaults (`DEFAULT_WHATSAPP_LIMIT`, `DEFAULT_SMS_LIMIT`, `DEFAULT_EMAIL_LIMIT`); (3) fail-safe deny (limit=0).

### Escalation
When a conversation cannot be handled by the AI agent — due to clinical/out-of-scope questions, user request, or usage limit exceeded — the system creates an escalation record and provides human contact information instead.

### Adapter Interface
External channel integrations follow the adapter pattern. The module defines a `NotificationAdapter` interface; separate packages implement it for WhatsApp (Meta Cloud API), email (Resend), SMS (Twilio), etc.

---

## 3. Adapter Interface

```typescript
// packages/module-notifications/src/adapters/types.ts
export interface NotificationAdapter {
  name: string;
  channelType: 'whatsapp' | 'email' | 'sms';
  sendMessage(channel: ChannelConfig, to: string, content: MessageContent): Promise<SendResult>;
  sendInteractive?(channel: ChannelConfig, to: string, interactive: InteractiveMessage): Promise<SendResult>;
  parseInboundWebhook(req: NextRequest): Promise<InboundMessage>;
  verifyWebhookSignature(req: NextRequest, verifyToken: string): Promise<boolean>;
  handleWebhookVerification?(req: NextRequest, verifyToken: string): Response;
  parseDeliveryStatus?(req: NextRequest): Promise<DeliveryStatus | null>;
}

export interface MessageContent {
  type: 'text' | 'image' | 'audio' | 'document' | 'template';
  text?: string;
  mediaUrl?: string;
  templateName?: string;
  templateParams?: Record<string, string>;
}

export interface SendResult {
  externalMessageId: string;
  status: 'sent' | 'queued' | 'failed';
  error?: string;
}

export interface InboundMessage {
  from: string;              // external user identifier (phone number, email)
  content: MessageContent;
  externalMessageId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}
```

---

## 4. Database Schema

### Tables

**`notification_channels`** — Channel configurations per tenant
```typescript
export const notificationChannels = pgTable('notification_channels', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  channelType: varchar('channel_type', { length: 50 }).notNull(), // whatsapp | email | sms
  adapterName: varchar('adapter_name', { length: 50 }).notNull(), // 'twilio' | 'meta' | 'resend'
  name: varchar('name', { length: 255 }).notNull(),
  config: jsonb('config').notNull(),                                // adapter-specific (encrypted sensitive fields)
  webhookVerifyToken: varchar('webhook_verify_token', { length: 255 }),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('nc_tenant_id_idx').on(table.tenantId),
  index('nc_channel_type_idx').on(table.channelType),
  index('nc_adapter_name_idx').on(table.adapterName),
  index('nc_enabled_idx').on(table.enabled),
]);
```

**Adapter-specific config shapes**:

| Adapter | Config Fields |
|---------|--------------|
| **Twilio** (WhatsApp/SMS) | `accountSid`, `authToken`, `phoneNumber`, `webhookUrl` (auto-generated) |
| **Meta** (WhatsApp Cloud API) | `phoneNumberId`, `businessAccountId`, `accessToken`, `apiVersion`, `webhookVerifyToken` |
| **Resend** (Email) | `apiKey`, `fromEmail`, `fromName`, `replyTo` |

```json
// Example: Meta WhatsApp channel config
{
  "phoneNumberId": "123456789",
  "businessAccountId": "987654321",
  "accessToken": "EAAxxxxx...",
  "apiVersion": "v21.0"
}
```

### Adapter Resolution Flow

When a webhook arrives, the system resolves the adapter from the channel's `adapterName`:

```
Webhook arrives → identify tenant by phone/email mapping
  → lookup notification_channels WHERE config->>'phoneNumber' = :fromNumber
  → get adapterName from channel record
  → resolve adapter: adapterRegistry.get(adapterName)
  → call adapter.parseInboundWebhook(req)
  → process message through agent pipeline
  → call adapter.sendMessage(channel.config, to, response)
```

**`notification_conversations`** — Threaded conversations
```typescript
export const notificationConversations = pgTable('notification_conversations', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  channelId: integer('channel_id').notNull(),
  channelType: varchar('channel_type', { length: 50 }).notNull(),
  externalUserId: varchar('external_user_id', { length: 255 }).notNull(), // phone number, email
  agentSessionId: integer('agent_session_id'),                             // FK → agent_sessions (nullable)
  status: varchar('status', { length: 50 }).notNull().default('active'),   // active | escalated | closed
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('nconv_tenant_id_idx').on(table.tenantId),
  index('nconv_channel_id_idx').on(table.channelId),
  index('nconv_external_user_idx').on(table.externalUserId),
  index('nconv_agent_session_idx').on(table.agentSessionId),
  index('nconv_status_idx').on(table.status),
]);
```

**`notification_messages`** — Individual messages within conversations
```typescript
export const notificationMessages = pgTable('notification_messages', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').notNull(),
  direction: varchar('direction', { length: 20 }).notNull(),       // inbound | outbound
  messageType: varchar('message_type', { length: 50 }).notNull(),  // text | template | interactive | image | audio
  content: jsonb('content').notNull(),
  externalMessageId: varchar('external_message_id', { length: 255 }),
  status: varchar('status', { length: 50 }).notNull().default('sent'), // sent | delivered | read | failed
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('nmsg_conversation_id_idx').on(table.conversationId),
  index('nmsg_direction_idx').on(table.direction),
  index('nmsg_status_idx').on(table.status),
  index('nmsg_external_msg_id_idx').on(table.externalMessageId),
  index('nmsg_created_at_idx').on(table.createdAt),
]);
```

**`notification_usage`** — Per-channel, per-period usage tracking
```typescript
export const notificationUsage = pgTable('notification_usage', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  channelType: varchar('channel_type', { length: 50 }).notNull(),
  period: varchar('period', { length: 20 }).notNull().default('monthly'),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  messageCount: integer('message_count').notNull().default(0),
  limit: integer('limit').notNull(),                                // from tenant config
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('nu_tenant_id_idx').on(table.tenantId),
  index('nu_channel_type_idx').on(table.channelType),
  index('nu_period_start_idx').on(table.periodStart),
  unique('nu_tenant_channel_period').on(table.tenantId, table.channelType, table.periodStart),
]);
```

**`notification_escalations`** — Escalation records
```typescript
export const notificationEscalations = pgTable('notification_escalations', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  channelType: varchar('channel_type', { length: 50 }).notNull(),
  conversationId: integer('conversation_id').notNull(),
  reason: varchar('reason', { length: 100 }).notNull(),             // out-of-scope | clinical | user-requested | limit-exceeded
  userMessage: text('user_message'),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending | resolved
  resolvedBy: integer('resolved_by'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('nesc_tenant_id_idx').on(table.tenantId),
  index('nesc_conversation_id_idx').on(table.conversationId),
  index('nesc_status_idx').on(table.status),
  index('nesc_reason_idx').on(table.reason),
]);
```

---

## 5. WhatsApp Integration

### Webhook Verification

```
GET /api/notifications/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=xxx&hub.challenge=yyy
```

Meta sends a challenge request. The handler verifies `hub.verify_token` matches the channel's `webhookVerifyToken` and returns `hub.challenge`.

### Inbound Message Flow

```
POST /api/notifications/whatsapp/webhook
```

1. Verify webhook signature (`X-Hub-Signature-256`)
2. Parse Meta webhook payload — extract message, sender phone, timestamp
3. Identify tenant by matching `phoneNumberId` against `notification_channels` config
4. Find or create conversation by `tenantId` + `externalUserId` (phone number)
5. Store inbound message in `notification_messages`
6. Increment `notification_usage.messageCount`
7. Delegate to agent session (create new or continue existing via `agentSessionId`)
8. Send agent response via WhatsApp outbound API
9. Store outbound message in `notification_messages`

### Outbound Messaging

```typescript
// Send text message via Meta Graph API
POST https://graph.facebook.com/v21.0/{phoneNumberId}/messages
{
  "messaging_product": "whatsapp",
  "to": "573001234567",
  "type": "text",
  "text": { "body": "¡Hola! Nuestro horario es de lunes a viernes 8am-6pm." }
}
```

### Delivery Status Updates

Meta sends status webhooks (sent → delivered → read → failed). The handler updates `notification_messages.status` accordingly.

---

## 6. Usage Tracking

### Counting Logic

- Counts **inbound** messages per tenant per channel per month
- Period resets on the 1st of each month
- Limit resolved via three-tier cascade (see `packages/module-notifications/src/services/usage-limit-resolver.ts`):
  1. `module-subscriptions` plan quota for service slugs `notifications-whatsapp` / `notifications-sms` / `notifications-email` (HTTP, Rule 3.1)
  2. `module-config` fallback: `DEFAULT_WHATSAPP_LIMIT` (300), `DEFAULT_SMS_LIMIT` (200), `DEFAULT_EMAIL_LIMIT` (1000)
  3. Fail-safe: limit=0, deny all (prevents unlimited messaging on misconfigured install)

### Check Usage Limit Utility

```typescript
export async function checkUsageLimit(
  tenantId: number,
  channelType: string
): Promise<{ allowed: boolean; remaining: number; limit: number; used: number }> {
  const periodStart = getMonthStart();
  const usage = await db.select().from(notificationUsage)
    .where(and(
      eq(notificationUsage.tenantId, tenantId),
      eq(notificationUsage.channelType, channelType),
      eq(notificationUsage.periodStart, periodStart),
    ))
    .limit(1);

  const used = usage[0]?.messageCount ?? 0;
  const limit = usage[0]?.limit ?? getDefaultLimit(channelType);
  const remaining = Math.max(0, limit - used);

  return { allowed: remaining > 0, remaining, limit, used };
}
```

### Workflow Node Integration

A registered workflow node type `notifications.checkLimit` is available for agent workflows. The dental assistant workflow includes this node before processing — if the limit is exceeded, it short-circuits to an escalation response with contact info.

---

## 7. API Endpoints

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| GET/POST | `/api/notification-channels` | List and create channels | Authenticated |
| GET/PUT/DELETE | `/api/notification-channels/[id]` | Channel CRUD | Authenticated |
| GET | `/api/notification-conversations` | List conversations (filterable) | Authenticated |
| GET | `/api/notification-conversations/[id]` | Get conversation with messages | Authenticated |
| GET | `/api/notifications/whatsapp/webhook` | WhatsApp webhook verification | **Public** |
| POST | `/api/notifications/whatsapp/webhook` | WhatsApp inbound webhook | **Public** |
| GET | `/api/notifications/usage` | Usage reports | Authenticated |
| GET | `/api/notification-escalations` | List escalations | Authenticated |
| GET/PUT | `/api/notification-escalations/[id]` | View and resolve escalation | Authenticated |

---

## 8. Dashboard UI

### React Admin Resources

- **Notification Channels** — List, Create, Edit, Show
  - List: Datagrid with tenant, channel type badge, adapter name, phone/email, enabled toggle
  - Create: Tenant (dropdown) → Channel type selector → Adapter selector → adapter-specific config via `<AdapterConfigFields>` dynamic form
  - Edit: Same as create + "Test Connection" button
  - Show: Config summary, recent conversations, usage gauge

- **Conversations** — List, Show
  - List: Datagrid with tenant filter, channel type filter, status filter, external user ID, last message timestamp
  - Show: Full message history (WhatsApp-style chat bubbles: inbound left, outbound right, delivery status icons ✓ sent / ✓✓ delivered / ✓✓ read). Escalation banner if escalated

- **Escalations** — List, Edit, Show
  - List: Filterable by tenant, status, reason. Columns: tenant, channel, reason, user message (truncated), status, created
  - Edit: View full context + "Mark Resolved" button with resolution notes
  - Show: Full conversation context, escalation reason, user message, resolution history

### Files to Create

```
apps/dashboard/src/components/notifications/
  ChannelList.tsx           — Columns: tenant, type (WhatsApp/Email/SMS), adapter (twilio/meta/resend), enabled, phone/email
  ChannelCreate.tsx         — Tenant (dropdown) → Channel type → Adapter selector → adapter-specific config
  ChannelEdit.tsx           — Same as create + "Test Connection" button
  ChannelShow.tsx           — Config summary, recent conversations, usage gauge
  ConversationList.tsx      — Columns: tenant, channel, external user (phone/email), status, message count, last activity
  ConversationShow.tsx      — Message thread: inbound (left), outbound (right), timestamps, delivery status icons
  EscalationList.tsx        — Columns: tenant, channel, reason, user message (truncated), status (pending/resolved), created
  EscalationEdit.tsx        — View full context + "Mark Resolved" button with resolution notes
  EscalationShow.tsx        — Full conversation context, escalation reason, resolution history
  UsageDashboard.tsx        — Per-tenant: bar chart (messages vs limit), line chart (daily count), table (tenant, channel, count, limit, %)
  AdapterConfigFields.tsx   — Dynamic form fields based on selected adapter (see table below)
```

### AdapterConfigFields — Dynamic Config per Adapter

| Adapter | Config Fields | Input Type |
|---------|--------------|------------|
| **Twilio** (WhatsApp/SMS) | accountSid, authToken (password), phoneNumber, webhookUrl (auto-generated, read-only) | TextInput, PasswordInput |
| **Meta** (WhatsApp Cloud API) | phoneNumberId, businessAccountId, accessToken (password), webhookVerifyToken | TextInput, PasswordInput |
| **Resend** (Email) | apiKey (password), fromEmail, fromName, replyTo | TextInput, PasswordInput |

### Custom Pages

- **Usage Dashboard** (`/notifications/usage`) — Per-tenant usage charts, limit utilization gauges, monthly trend graphs

### Menu Section

```
──── Notifications ────
Channels
Conversations
Escalations
Usage
```

---

## 9. Events

| Event | Payload |
|-------|---------|
| `notifications.message.received` | conversationId, tenantId, channelType, from, messageType |
| `notifications.message.sent` | conversationId, tenantId, channelType, to, messageType |
| `notifications.message.delivered` | messageId, tenantId, externalMessageId |
| `notifications.message.failed` | messageId, tenantId, error |
| `notifications.conversation.created` | id, tenantId, channelType, externalUserId |
| `notifications.conversation.escalated` | id, tenantId, reason, userMessage |
| `notifications.usage.limitWarning` | tenantId, channelType, used, limit, percentage |
| `notifications.usage.limitExceeded` | tenantId, channelType, used, limit |

---

## 10. Integration Points

| Module | Integration |
|--------|-------------|
| **module-tenants** | Channel configs and usage limits are tenant-scoped; business hours determine welcome messages |
| **module-roles** | Permission-based access to manage channels, view conversations, resolve escalations |
| **module-agent-core** | Conversations delegate to agent sessions for AI-powered responses |
| **module-workflow-agents** | `notifications.checkLimit` workflow node for usage enforcement |
| **module-ai** | AI-powered response generation via agent pipeline |
| **module-knowledge-base** | Agent searches KB for FAQ answers to respond to user messages |
| **module-files** | Media messages (images, audio) stored via module-files |
| **module-chat** | Web chat widget messages can share agent sessions with WhatsApp conversations |

---

## 11. ModuleDefinition

```typescript
export const notificationsModule: ModuleDefinition = {
  name: 'notifications',
  dependencies: ['tenants', 'agent-core'],
  description: 'Multi-channel messaging with WhatsApp Business, usage metering, and escalation handling',
  capabilities: [
    'send WhatsApp messages',
    'receive WhatsApp messages',
    'track message usage',
    'handle escalations',
    'manage channels',
  ],
  schema: {
    notificationChannels,
    notificationConversations,
    notificationMessages,
    notificationUsage,
    notificationEscalations,
  },
  seed: seedNotifications,
  resources: [
    {
      name: 'notification-channels',
      list: ChannelList,
      create: ChannelCreate,
      edit: ChannelEdit,
      show: ChannelShow,
      icon: ChatBubbleIcon,
      options: { label: 'Channels' },
    },
    {
      name: 'notification-conversations',
      list: ConversationList,
      show: ConversationShow,
      icon: ForumIcon,
      options: { label: 'Conversations' },
    },
    {
      name: 'notification-escalations',
      list: EscalationList,
      show: EscalationShow,
      icon: WarningIcon,
      options: { label: 'Escalations' },
    },
  ],
  customRoutes: [
    { path: '/notifications/usage', component: UsageDashboardPage },
  ],
  menuItems: [
    { label: 'Channels', to: '/notification-channels' },
    { label: 'Conversations', to: '/notification-conversations' },
    { label: 'Escalations', to: '/notification-escalations' },
    { label: 'Usage', to: '/notifications/usage' },
  ],
  apiHandlers: {
    'notification-channels': { GET: listChannels, POST: createChannel },
    'notification-channels/[id]': { GET: getChannel, PUT: updateChannel, DELETE: deleteChannel },
    'notification-conversations': { GET: listConversations },
    'notification-conversations/[id]': { GET: getConversation },
    'notifications/whatsapp/webhook': { GET: verifyWhatsAppWebhook, POST: handleWhatsAppWebhook },
    'notifications/usage': { GET: getUsageReport },
    'notification-escalations': { GET: listEscalations },
    'notification-escalations/[id]': { GET: getEscalation, PUT: resolveEscalation },
  },
  configSchema: [
    {
      key: 'WHATSAPP_API_VERSION',
      type: 'string',
      description: 'Meta Graph API version for WhatsApp',
      defaultValue: 'v21.0',
      instanceScoped: false,
    },
    {
      key: 'USAGE_WARNING_THRESHOLD',
      type: 'number',
      description: 'Percentage of usage limit that triggers a warning event',
      defaultValue: 80,
      instanceScoped: true,
    },
    {
      key: 'AUTO_CLOSE_CONVERSATION_HOURS',
      type: 'number',
      description: 'Hours of inactivity before auto-closing a conversation',
      defaultValue: 24,
      instanceScoped: true,
    },
    {
      key: 'ESCALATION_NOTIFY_OFFICE',
      type: 'boolean',
      description: 'Send notification to office on escalation',
      defaultValue: true,
      instanceScoped: true,
    },
  ],
  events: {
    emits: [
      'notifications.message.received',
      'notifications.message.sent',
      'notifications.message.delivered',
      'notifications.message.failed',
      'notifications.conversation.created',
      'notifications.conversation.escalated',
      'notifications.usage.limitWarning',
      'notifications.usage.limitExceeded',
    ],
    schemas: {
      'notifications.message.received': {
        conversationId: { type: 'number', description: 'Conversation DB ID', required: true },
        tenantId: { type: 'number', description: 'Tenant DB ID', required: true },
        channelType: { type: 'string', description: 'Channel type (whatsapp/email/sms)' },
        from: { type: 'string', description: 'External user identifier' },
        messageType: { type: 'string', description: 'Message content type' },
      },
      'notifications.message.sent': {
        conversationId: { type: 'number', description: 'Conversation DB ID', required: true },
        tenantId: { type: 'number', description: 'Tenant DB ID', required: true },
        channelType: { type: 'string', description: 'Channel type' },
        to: { type: 'string', description: 'External user identifier' },
        messageType: { type: 'string', description: 'Message content type' },
      },
      'notifications.conversation.created': {
        id: { type: 'number', description: 'Conversation DB ID', required: true },
        tenantId: { type: 'number', description: 'Tenant DB ID', required: true },
        channelType: { type: 'string', description: 'Channel type' },
        externalUserId: { type: 'string', description: 'External user identifier' },
      },
      'notifications.conversation.escalated': {
        id: { type: 'number', description: 'Conversation DB ID', required: true },
        tenantId: { type: 'number', description: 'Tenant DB ID', required: true },
        reason: { type: 'string', description: 'Escalation reason' },
        userMessage: { type: 'string', description: 'Last user message before escalation' },
      },
      'notifications.usage.limitExceeded': {
        tenantId: { type: 'number', description: 'Tenant DB ID', required: true },
        channelType: { type: 'string', description: 'Channel type' },
        used: { type: 'number', description: 'Messages used this period' },
        limit: { type: 'number', description: 'Period limit' },
      },
    },
  },
  chat: {
    description: 'Multi-channel messaging with WhatsApp Business, usage metering, and escalation handling. Tracks conversations and enforces message limits.',
    capabilities: [
      'list conversations',
      'check usage limits',
      'view escalations',
      'resolve escalations',
    ],
    actionSchemas: [
      {
        name: 'notifications.listConversations',
        description: 'List notification conversations with filtering',
        parameters: {
          tenantId: { type: 'number' },
          channelType: { type: 'string' },
          status: { type: 'string' },
        },
        returns: { data: { type: 'array' }, total: { type: 'number' } },
        requiredPermissions: ['notification-conversations.read'],
        endpoint: { method: 'GET', path: 'notification-conversations' },
      },
      {
        name: 'notifications.getUsage',
        description: 'Get usage report for a tenant and channel',
        parameters: {
          tenantId: { type: 'number', required: true },
          channelType: { type: 'string' },
        },
        returns: { used: { type: 'number' }, limit: { type: 'number' }, remaining: { type: 'number' } },
        requiredPermissions: ['notification-usage.read'],
        endpoint: { method: 'GET', path: 'notifications/usage' },
      },
      {
        name: 'notifications.listEscalations',
        description: 'List escalations for a tenant',
        parameters: {
          tenantId: { type: 'number' },
          status: { type: 'string' },
        },
        returns: { data: { type: 'array' }, total: { type: 'number' } },
        requiredPermissions: ['notification-escalations.read'],
        endpoint: { method: 'GET', path: 'notification-escalations' },
      },
    ],
  },
};
```

---

## 12. Seed Data

```typescript
export async function seedNotifications(db: any) {
  const modulePermissions = [
    { resource: 'notification-channels', action: 'read', slug: 'notification-channels.read', description: 'View notification channels' },
    { resource: 'notification-channels', action: 'create', slug: 'notification-channels.create', description: 'Create notification channels' },
    { resource: 'notification-channels', action: 'update', slug: 'notification-channels.update', description: 'Edit notification channels' },
    { resource: 'notification-channels', action: 'delete', slug: 'notification-channels.delete', description: 'Delete notification channels' },
    { resource: 'notification-conversations', action: 'read', slug: 'notification-conversations.read', description: 'View conversations' },
    { resource: 'notification-escalations', action: 'read', slug: 'notification-escalations.read', description: 'View escalations' },
    { resource: 'notification-escalations', action: 'resolve', slug: 'notification-escalations.resolve', description: 'Resolve escalations' },
    { resource: 'notification-usage', action: 'read', slug: 'notification-usage.read', description: 'View usage reports' },
  ];

  for (const perm of modulePermissions) {
    await db.insert(permissions).values(perm).onConflictDoNothing();
  }

  // Mark public endpoints
  const publicEndpoints = [
    { module: 'notifications', route: 'notifications/whatsapp/webhook', method: 'GET', isPublic: true },
    { module: 'notifications', route: 'notifications/whatsapp/webhook', method: 'POST', isPublic: true },
  ];

  for (const ep of publicEndpoints) {
    await db.insert(apiEndpointPermissions).values(ep).onConflictDoNothing();
  }
}
```

---

## 13. API Handler Example

```typescript
// GET /api/notification-conversations — List handler with tenant filtering
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const tenantId = request.headers.get('x-tenant-id');

  const conditions = [];
  if (tenantId) conditions.push(eq(notificationConversations.tenantId, Number(tenantId)));
  if (params.filter?.channelType) conditions.push(eq(notificationConversations.channelType, params.filter.channelType));
  if (params.filter?.status) conditions.push(eq(notificationConversations.status, params.filter.status));

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ count }]] = await Promise.all([
    db.select().from(notificationConversations).where(where)
      .orderBy(desc(notificationConversations.updatedAt))
      .offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(notificationConversations).where(where),
  ]);

  return listResponse(rows, 'notification-conversations', params, Number(count));
}
```

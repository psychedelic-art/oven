# Module Design — module-notifications

## Package layout

```
packages/module-notifications/
  package.json
  tsconfig.json
  src/
    index.ts                          # ModuleDefinition export
    schema.ts                         # Drizzle tables + notificationsSchema object
    types.ts                          # public types (Channel, Message, Conversation, …)
    events.ts                         # event name constants + schema map
    seed.ts                           # idempotent seedNotifications()
    adapters/
      types.ts                        # NotificationAdapter interface
      registry.ts                     # in-memory registry, register/get/list/clear
    services/
      conversation-pipeline.ts        # ingestInboundMessage, sendOutboundMessage
      usage-metering.ts               # incrementUsage, checkUsageLimit, rollover helpers
      usage-limit-resolver.ts         # three-tier resolve(), fail-safe
    api/                              # (sprint-02)
      notification-channels.handler.ts
      notification-channels-by-id.handler.ts
      notification-conversations.handler.ts
      notification-conversations-by-id.handler.ts
      notification-escalations.handler.ts
      notification-escalations-by-id.handler.ts
      notifications-usage.handler.ts
      notifications-whatsapp-webhook.handler.ts
    __tests__/
      schema.test.ts                  # (sprint-01)
      adapter-registry.test.ts        # (sprint-01)
      module-definition.test.ts       # (sprint-01)
      seed.test.ts                    # (sprint-01)
      no-cross-module-imports.test.ts # (sprint-01)
      webhook-handler.test.ts         # (sprint-02)
      conversation-pipeline.test.ts   # (sprint-02)
      usage-limit-resolver.test.ts    # (sprint-03)
      usage-metering.test.ts          # (sprint-03)
      notifications-usage-handler.test.ts # (sprint-03)
```

## Public surface

Exports from `@oven/module-notifications`:

```typescript
export { notificationsModule } from './index';
export { notificationsSchema } from './schema';
export { seedNotifications } from './seed';
export {
  registerNotificationAdapter,
  getAdapter,
  getAdapterForChannelType,
  listAdapters,
} from './adapters/registry';
export type { NotificationAdapter, MessageContent, SendResult, InboundMessage, DeliveryStatus, ChannelType, EscalationReason } from './types';
export {
  checkUsageLimit,
  incrementUsage,
  resolveUsageLimit,
} from './services/usage-metering';
```

Exports from `@oven/module-notifications/adapters` (subpath):

```typescript
export type { NotificationAdapter, MessageContent, SendResult, InboundMessage } from '../types';
```

Adapter packages consume only this subpath so the dependency graph stays
one-way (adapter → module, never module → adapter).

## `ModuleDefinition` shape

See [`api.md`](./api.md) for the full `apiHandlers` map and
[`../15-notifications.md`](../15-notifications.md) section 11 for the
spec-level shape. Sprint-01 implements the subset that does not depend
on handlers; sprint-02 fills in `apiHandlers`; sprint-04 fills in
`resources`, `customRoutes`, `menuItems`.

```typescript
export const notificationsModule: ModuleDefinition = {
  name: 'notifications',
  dependencies: ['config', 'tenants', 'agent-core'],
  description: 'Multi-channel messaging with WhatsApp Business, usage metering, and escalation handling',
  capabilities: [
    'send WhatsApp messages',
    'receive WhatsApp messages',
    'track message usage',
    'handle escalations',
    'manage channels',
  ],
  schema: notificationsSchema,
  seed: seedNotifications,
  resources: [],        // sprint-04
  menuItems: [],        // sprint-04
  customRoutes: [],     // sprint-04
  apiHandlers: {},      // sprint-02
  configSchema: [ /* see configSchema section below */ ],
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
    schemas: eventSchemas,
  },
  chat: { /* description, capabilities, actionSchemas */ },
};
```

## `configSchema`

| Key | Type | Default | Instance-scoped | Purpose |
|---|---|---|:-:|---|
| `WHATSAPP_API_VERSION` | `string` | `v21.0` | no | Meta Graph API version |
| `USAGE_WARNING_THRESHOLD` | `number` | `80` | yes | Percent of limit that fires the warning event |
| `AUTO_CLOSE_CONVERSATION_HOURS` | `number` | `24` | yes | Inactivity before auto-closing a conversation |
| `ESCALATION_NOTIFY_OFFICE` | `boolean` | `true` | yes | Fire extra notify event on escalation |
| `DEFAULT_WHATSAPP_LIMIT` | `number` | `300` | yes | Tier-2 fallback limit when no subscription is attached |
| `DEFAULT_SMS_LIMIT` | `number` | `200` | yes | Tier-2 fallback limit for SMS |
| `DEFAULT_EMAIL_LIMIT` | `number` | `1000` | yes | Tier-2 fallback limit for email |

The last three keys are the Rule 13 resolution for the missing
`tenant.whatsappLimit` / `tenant.webLimit` references in the spec.

## Internal contracts

### `conversationPipeline.ingestInboundMessage`

```typescript
interface IngestInput {
  adapterName: string;              // 'meta' | 'twilio' | 'resend'
  channelId: number;                // resolved from the webhook before this call
  message: InboundMessage;          // adapter-parsed
}

interface IngestResult {
  conversationId: number;
  messageId: number;
  createdConversation: boolean;
  shortCircuitReason?: 'limit-exceeded';
}
```

### `usageMetering.checkUsageLimit`

```typescript
interface CheckUsageLimitResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  source: 'subscriptions' | 'config' | 'failsafe';
}
```

### `adapters.NotificationAdapter`

```typescript
export interface NotificationAdapter {
  name: string;
  channelType: ChannelType;
  sendMessage(channel: ChannelConfig, to: string, content: MessageContent): Promise<SendResult>;
  sendInteractive?(channel: ChannelConfig, to: string, interactive: InteractiveMessage): Promise<SendResult>;
  parseInboundWebhook(payload: unknown): Promise<InboundMessage>;
  verifyWebhookSignature(input: { rawBody: string; signatureHeader: string | null; appSecret: string }): Promise<boolean>;
  handleWebhookVerification?(req: Request, verifyToken: string): Response;
  parseDeliveryStatus?(payload: unknown): Promise<DeliveryStatus | null>;
}
```

Note the verify signature signature differs slightly from the spec — it
takes the `rawBody` as a string rather than a `NextRequest`, to make
unit testing trivial and to enforce that the handler reads the raw body
exactly once before verification.

## Dependency wiring

Declared dependencies (validated at `registry.register()` time):

- `config` — for the resolve-batch endpoint
- `tenants` — for slim tenant lookup
- `agent-core` — for conversation → agent session delegation

Soft dependencies (lazy-resolved per Rule 3.2):

- `subscriptions` — primary source of usage limits; missing on platforms
  that don't meter notifications
- `workflow-agents` — the node registry where `notifications.checkLimit`
  is registered; missing on platforms without workflow agents
- `roles` — used for permission seeding, but the module does not depend
  on it at the registration level; seeding runs after roles registers

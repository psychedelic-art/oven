# Chat Module — Hook System

> Specification for the lifecycle hook system in module-chat.
> Inspired by Claude Code's hook architecture.

---

## Overview

Hooks allow extending chat behavior at key lifecycle points without modifying the core message processing flow. They enable content moderation, audit logging, tool approval, and escalation routing.

## Hook Events

| Event | When Fired | Can Modify |
|-------|-----------|-----------|
| `session-start` | When new session created | Initial context, welcome message |
| `pre-message` | Before processing user message | Message content, abort processing |
| `post-message` | After generating response | Response content |
| `pre-tool-use` | Before executing a tool | Tool params, approve/block |
| `post-tool-use` | After tool execution | Tool result |
| `on-error` | When an error occurs | Error handling, retry |
| `on-escalation` | When agent escalates to human | Escalation routing, notification |
| `session-end` | When session archived | Cleanup actions |

## Hook Handler Types

```typescript
type HookHandler =
  | { type: 'condition'; expression: string; action: 'approve' | 'block' | 'modify'; modification?: string }
  | { type: 'api'; endpoint: string; method: string; headers?: Record<string, string>; transform?: string }
  | { type: 'event'; eventName: string; payload?: Record<string, string> }
  | { type: 'guardrail'; guardrailId: number }

interface HookResult {
  continue: boolean;       // false = abort processing
  modified?: unknown;      // modified content (if applicable)
  systemMessage?: string;  // inject into next prompt
  reason?: string;         // explanation for block/modify
}
```

### Handler: `condition`
Evaluates a `$.path` expression against the current context and takes an action.

```typescript
// Example: Block messages containing certain words
{
  type: 'condition',
  expression: '$.message.content.includes("password")',
  action: 'block',
}
```

### Handler: `api`
Calls an external API endpoint and uses the response.

```typescript
// Example: Log to external audit service
{
  type: 'api',
  endpoint: 'https://audit.example.com/log',
  method: 'POST',
  transform: '{ sessionId: $.sessionId, message: $.message.content }',
}
```

### Handler: `event`
Emits an event on the EventBus.

```typescript
// Example: Notify on escalation
{
  type: 'event',
  eventName: 'chat.escalation.requested',
  payload: { sessionId: '$.sessionId', reason: '$.escalationReason' },
}
```

### Handler: `guardrail`
Applies an existing AI guardrail (from module-ai) to the content.

```typescript
// Example: Apply input content filter
{
  type: 'guardrail',
  guardrailId: 5,  // references ai_guardrails table
}
```

## Execution Order

1. Hooks execute in priority order (lower number = higher priority)
2. Multiple hooks on the same event run sequentially
3. If any hook returns `continue: false`, processing stops
4. Hook results are accumulated and passed to subsequent hooks

```typescript
// Example execution for pre-message event:
const hooks = await db.select().from(chatHooks)
  .where(and(
    eq(chatHooks.event, 'pre-message'),
    eq(chatHooks.enabled, true),
    or(isNull(chatHooks.tenantId), eq(chatHooks.tenantId, tenantId))
  ))
  .orderBy(asc(chatHooks.priority));

for (const hook of hooks) {
  const result = await executeHookHandler(hook.handler, context);
  if (!result.continue) {
    return { blocked: true, reason: result.reason };
  }
  if (result.modified) {
    context = { ...context, ...result.modified };
  }
}
```

## Use Cases

### Content Moderation
```typescript
// pre-message hook: filter profanity
{ event: 'pre-message', handler: { type: 'guardrail', guardrailId: 1 }, priority: 10 }
```

### Audit Logging
```typescript
// post-message hook: log to external service
{ event: 'post-message', handler: { type: 'api', endpoint: 'https://audit.example.com/log', method: 'POST' }, priority: 100 }
```

### Tool Approval
```typescript
// pre-tool-use hook: block data deletion tools for certain tenants
{ event: 'pre-tool-use', handler: { type: 'condition', expression: '$.toolName.endsWith(".delete")', action: 'block' }, priority: 50 }
```

### Escalation Routing
```typescript
// on-escalation hook: notify on-call team
{ event: 'on-escalation', handler: { type: 'event', eventName: 'notifications.message.send', payload: { to: '$.tenantConfig.onCallPhone' } }, priority: 10 }
```

## Database

Uses the `chat_hooks` table defined in `08-chat.md` section 5.

## API

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/chat-hooks` | List hooks (filtered by tenant) |
| POST | `/api/chat-hooks` | Create hook |
| GET | `/api/chat-hooks/[id]` | Get hook details |
| PUT | `/api/chat-hooks/[id]` | Update hook |
| DELETE | `/api/chat-hooks/[id]` | Delete hook |

## Tests

```
hook-manager.test.ts — 12 tests:
  - loads hooks for event + tenant
  - executes hooks in priority order
  - condition handler: evaluates expression and blocks
  - condition handler: evaluates expression and approves
  - api handler: calls external endpoint
  - event handler: emits event on EventBus
  - guardrail handler: applies AI guardrail
  - stops on first hook that returns continue=false
  - passes modified context to subsequent hooks
  - handles hook execution errors gracefully
  - skips disabled hooks
  - platform hooks (tenantId=null) apply to all tenants
```

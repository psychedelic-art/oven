# Subscriptions — Agent Prompts

The subscriptions module is discoverable by agents per
`docs/module-rules.md` Rule 2.3. This file captures the chat-facing
prompt contract and the `events.schemas` shape that the Tool Wrapper
reads at runtime.

## Capabilities surfaced to the chat runtime

```ts
chat: {
  description:
    'Manage billing plans, tenant subscriptions, and per-service quotas. ' +
    'Exposes read-only effective limits and a quota check primitive.',
  capabilities: [
    'subscriptions.listPlans',
    'subscriptions.getEffectiveLimits',
    'subscriptions.checkQuota',
  ],
  actionSchemas: [
    {
      name: 'subscriptions.listPlans',
      description: 'List all public billing plans.',
      input: { type: 'object', properties: {} },
    },
    {
      name: 'subscriptions.getEffectiveLimits',
      description:
        'Return the effective per-service quota for a tenant. ' +
        'Walks subscription → override → plan-quota → zero.',
      input: {
        type: 'object',
        required: ['tenantId'],
        properties: { tenantId: { type: 'integer' } },
      },
    },
    {
      name: 'subscriptions.checkQuota',
      description:
        'Return { allowed, remaining, quota } for a tenant+service pair. ' +
        'Middleware calls this before every metered upstream request.',
      input: {
        type: 'object',
        required: ['tenantId', 'serviceSlug'],
        properties: {
          tenantId:    { type: 'integer' },
          serviceSlug: { type: 'string', pattern: '^[a-z0-9-]+$' },
        },
      },
    },
  ],
},
```

`subscriptions.trackUsage` is NOT exposed to the chat runtime. It is
a middleware primitive that must only be called from inside the
trusted server process — exposing it to a chat tool would let an LLM
fake usage.

## Events emitted by this module

Per Rule 2.3, `events.schemas` lists each emitted event with its
field shape. The Tool Wrapper reads this at startup to generate
event filters without hardcoded references.

```ts
events: {
  emits: [
    'subscription.activated',
    'subscription.canceled',
    'subscription.quota.exceeded',
    'usage.tracked',
    'usage.threshold.crossed',
  ],
  schemas: {
    'subscription.activated': {
      tenantId: { type: 'integer', required: true },
      planId:   { type: 'integer', required: true },
    },
    'subscription.canceled': {
      tenantId: { type: 'integer', required: true },
      planId:   { type: 'integer', required: true },
    },
    'subscription.quota.exceeded': {
      tenantId:    { type: 'integer', required: true },
      serviceSlug: { type: 'string',  required: true },
    },
    'usage.tracked': {
      tenantId:    { type: 'integer', required: true },
      serviceSlug: { type: 'string',  required: true },
      amount:      { type: 'integer', required: true },
    },
    'usage.threshold.crossed': {
      tenantId:    { type: 'integer', required: true },
      serviceSlug: { type: 'string',  required: true },
      percent:     { type: 'integer', required: true },
    },
  },
},
```

## Events consumed from other modules

Subscriptions currently consumes no events from sibling modules.
It is purely a producer and a query target. Future sprints may
consume `tenant.deleted` from `module-tenants` to archive the
tenant's usage records — see `references.md`.

## Agent-facing copy

When an agent asks "what plans are available?", the Tool Wrapper
invokes `subscriptions.listPlans` → `GET /api/billing-plans/public`.
The response is rendered to the user via the chat runtime's
existing table formatter. No module-specific copy is injected.

When an agent asks "does tenant X have WhatsApp quota remaining?",
the Tool Wrapper invokes `subscriptions.checkQuota(tenantId, 'whatsapp')`
and renders the three fields (allowed, remaining, quota) inline.

## No prompt-templates are shipped from this module

Per Rule 6.1, prompt templates belong in `module-ai` and in
`module-agent-core`. Subscriptions has no prompt library — it is a
data module, not a content module.

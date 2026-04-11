# Subscriptions — Architecture

## Package boundary

```
apps/dashboard
  └─ src/lib/modules.ts     ← registers subscriptionsModule

packages/module-subscriptions  ← this package
  ├─ src/index.ts              (ModuleDefinition)
  ├─ src/schema.ts             (9 Drizzle tables)
  ├─ src/types.ts              (TS types, public surface types)
  ├─ src/seed.ts               (idempotent seed)
  ├─ src/engine/
  │   └─ usage-metering.ts     (UsageMeteringService)
  └─ src/api/                  (23 REST handlers)

packages/module-registry       ← DI + db + event bus (imported)
packages/module-config         ← config cascade (imported)
packages/module-tenants        ← tenant scoping (imported)
```

Per `docs/package-composition.md`, a module package is allowed to
import from lower-layer module packages (registry, config, tenants)
but MUST NOT import from sibling modules (ai, notifications, chat).
That rule is enforced at review time — see `CODE-REVIEW.md` Rule 3.

## Layer responsibilities

| Layer          | Responsibility                                                        |
|----------------|-----------------------------------------------------------------------|
| `schema.ts`    | Drizzle table definitions only. No runtime logic.                      |
| `types.ts`     | TypeScript types and the public `PublicBillingPlan` projection shape. |
| `seed.ts`      | Platform catalog bootstrap. Idempotent. No tenant data.                |
| `engine/`      | Pure business logic: limit resolver, usage aggregation. No HTTP.       |
| `api/`         | HTTP boundary only. Validates input, calls engine, returns JSON.       |
| `resources/` (sprint-04) | React Admin dashboard wiring.                              |

## Request flow: `POST /api/usage/track`

```
1. Next.js route              → packages/module-subscriptions/src/api/usage-track.handler.ts
2. Parse + validate body      → 400 on bad input
3. Check X-Usage-Idempotency-Key → if present and seen, return 200
4. engine.trackUsage(...)     → src/engine/usage-metering.ts
5. DB insert                  → sub_usage_records via getDb()
6. eventBus.emit('usage.tracked', {...})
7. Return 201 + row
```

No cross-module HTTP calls. The engine is called directly from the
handler within the same Node process.

## Request flow: middleware `checkQuota` call from `module-ai`

```
apps/dashboard/.../ai-playground-executions.handler.ts
  │
  ├─ ai middleware: beforeRequest()
  │    ├─ resolve tenantId from auth context
  │    └─ call subscriptions.checkQuota(tenantId, 'ai-chat')
  │         │
  │         └── packages/module-subscriptions/src/engine/usage-metering.ts
  │              ├─ getEffectiveLimit(tenantId, 'ai-chat')   ← 5-step resolver
  │              ├─ sum usage for current period
  │              └─ return { allowed: boolean, remaining: number }
  │
  ├─ if !allowed → return 422 quota_exceeded
  ├─ else        → proceed with AI request
  │
  └─ ai middleware: afterRequest()
       └─ subscriptions.trackUsage(tenantId, 'ai-chat', tokens, idempotencyKey)
```

`checkQuota` and `trackUsage` are the load-bearing primitives. Every
other module's middleware talks to subscriptions through these two
functions — they are the module's public contract.

## Limit resolver (§5 of top-level spec)

```text
getEffectiveLimit(tenantId, serviceSlug):
  1. SELECT active subscription for tenant  →  subscriptionId, planId
     If none → return { quota: 0, source: 'no-subscription' }
  2. SELECT service id by slug              →  serviceId
     If none → return { quota: 0, source: 'unknown-service' }
  3. SELECT override for (subscriptionId, serviceId)
     If found → return { quota: override.quota, source: 'override' }
  4. SELECT plan quota for (planId, serviceId)
     If found → return { quota: plan.quota, source: 'plan' }
  5. return { quota: 0, source: 'not-in-plan' }
```

This algorithm is asserted in `src/__tests__/limit-resolver.test.ts`
(sprint-01).

## Event emission

| Event                            | When                                               | Payload                     |
|----------------------------------|----------------------------------------------------|-----------------------------|
| `subscription.activated`         | `POST /api/tenant-subscriptions` 201               | `{ tenantId, planId }`      |
| `subscription.canceled`          | `PUT /api/tenant-subscriptions/[id]` status→canceled | `{ tenantId, planId }`    |
| `subscription.quota.exceeded`    | `checkQuota` returns `allowed:false`               | `{ tenantId, serviceSlug }` |
| `usage.tracked`                  | `POST /api/usage/track` 201                        | `{ tenantId, serviceSlug, amount }` |
| `usage.threshold.crossed`        | A roll-up crosses 80% / 100% of quota              | `{ tenantId, serviceSlug, percent }` |

Event schemas are declared on `ModuleDefinition.events.schemas` per
`docs/module-rules.md` Rule 2.3.

## Usage buffering (reference, not yet implemented)

For high-volume tenants, the 2026 SaaS metering guidance (Stripe,
OpenMeter) recommends buffering usage events in the app layer and
flushing a single aggregated event per minute. OVEN currently writes
every event directly — this is acceptable at current volume but the
engine exposes a pluggable `UsageBuffer` interface so a Redis-backed
buffer can be dropped in without handler changes.

When the buffer lands, the architecture becomes:

```
POST /api/usage/track
  └─ UsageBuffer.enqueue(...)   ← in-memory or Redis
          │
          └─ flush every 60s
                 └─ batched INSERT into sub_usage_records
```

See `references.md` for the Stripe + OpenMeter citations.

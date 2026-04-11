# Subscriptions — Module Design

## ModuleDefinition

```ts
export const subscriptionsModule: ModuleDefinition = {
  name: 'subscriptions',
  dependencies: ['registry', 'config', 'tenants'],
  schema: {
    serviceCategories,
    services,
    providers,
    providerServices,
    billingPlans,
    planQuotas,
    tenantSubscriptions,
    subscriptionQuotaOverrides,
    usageRecords,
  },
  seed,
  resources: [
    serviceCategoryResource,
    serviceResource,
    providerResource,
    providerServiceResource,
    billingPlanResource,
    tenantSubscriptionResource,
  ],
  apiHandlers: {
    'service-categories': serviceCategoriesHandler,
    'service-categories/[id]': serviceCategoriesByIdHandler,
    // ... 21 more
  },
  description:
    'Dynamic billing, service catalog, and usage-metering. Packages upstream ' +
    'providers into plans with per-service quotas, then meters tenant usage ' +
    'against those quotas.',
  capabilities: [
    'billing-catalog',
    'quota-enforcement',
    'usage-metering',
    'plan-management',
  ],
  chat: {
    description: 'Manage billing plans, tenant subscriptions, and per-service quotas.',
    capabilities: ['subscriptions.listPlans', 'subscriptions.getEffectiveLimits', 'subscriptions.checkQuota'],
    actionSchemas: [
      {
        name: 'subscriptions.getEffectiveLimits',
        description: 'Get all effective per-service limits for a tenant.',
        input: { type: 'object', required: ['tenantId'], properties: { tenantId: { type: 'integer' } } },
      },
      {
        name: 'subscriptions.checkQuota',
        description: 'Check whether a tenant has quota remaining for a service.',
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
  events: {
    emits: [
      'subscription.activated',
      'subscription.canceled',
      'subscription.quota.exceeded',
      'usage.tracked',
      'usage.threshold.crossed',
    ],
    schemas: {
      'subscription.activated':       { tenantId: { type: 'integer', required: true }, planId: { type: 'integer', required: true } },
      'subscription.canceled':        { tenantId: { type: 'integer', required: true }, planId: { type: 'integer', required: true } },
      'subscription.quota.exceeded':  { tenantId: { type: 'integer', required: true }, serviceSlug: { type: 'string', required: true } },
      'usage.tracked':                { tenantId: { type: 'integer', required: true }, serviceSlug: { type: 'string', required: true }, amount: { type: 'integer', required: true } },
      'usage.threshold.crossed':      { tenantId: { type: 'integer', required: true }, serviceSlug: { type: 'string', required: true }, percent: { type: 'integer', required: true } },
    },
  },
};
```

Fields are satisfied against `docs/module-rules.md` Rule 1 and
Rule 2.3. The exact shape is asserted in
`packages/module-subscriptions/src/__tests__/module-definition.test.ts`
(sprint-01).

## Limit resolver

See `architecture.md` for the five-step diagram. The algorithm is
copy-verbatim from `docs/modules/21-module-subscriptions.md` §5. Any
divergence is a drift and must be filed as `DRIFT-X`.

Key invariants:

1. The resolver is **pure**: same inputs → same output given the
   same DB snapshot. No hidden state in closures, no caching at
   this layer (caching lives in the engine level, sprint-02).
2. The resolver **never returns `null` or `undefined`** — service
   not in plan returns `{ quota: 0, source: 'not-in-plan' }` so
   callers never have to null-check.
3. The resolver is **case-insensitive for slugs** by design —
   service slugs are normalised to lower-case on insert and on
   query. Enforced via a `CHECK (slug = lower(slug))` database
   constraint (sprint-02 hardening).

## UsageMeteringService

```ts
interface UsageMeteringService {
  checkQuota(tenantId: number, serviceSlug: string):
    Promise<{ allowed: boolean; remaining: number; quota: number; source: ResolverSource }>;

  trackUsage(tenantId: number, serviceSlug: string, amount: number, options?: {
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ recordId: number; deduplicated: boolean }>;

  getUsageSummary(tenantId: number, period: 'current' | 'previous'):
    Promise<Array<{ service: string; used: number; quota: number; percent: number }>>;
}
```

Key design decisions:

1. **`checkQuota` returns both `remaining` and `quota`.** Callers
   can choose to warn the user at 80% vs block at 100%.
2. **`trackUsage` returns `deduplicated: boolean`.** When an
   idempotency key collides with an existing row, the engine
   returns the existing row and sets `deduplicated: true` so the
   middleware can skip the downstream event emission.
3. **`getUsageSummary` accepts `'current' | 'previous'`** so the
   dashboard can show "this month" and "last month" side-by-side
   without custom SQL.

## Seed design

`src/seed.ts` uses `INSERT … ON CONFLICT DO UPDATE` across every
catalog table, keyed on `slug`. Running `pnpm db:seed` twice in a
row produces the same row count on both runs — the cycle-1 refactor
was the biggest reliability fix for the deploy pipeline.

The seed is **platform-wide only**. It must not create any
`sub_tenant_subscriptions`, `sub_quota_overrides`, or
`sub_usage_records` rows — tenant data is tenant-owned.

## Type imports

Per `CLAUDE.md`, every type-only import uses `import type`:

```ts
import type { PgColumn } from 'drizzle-orm/pg-core';
import type { ModuleDefinition } from '@oven/module-registry';
import { getDb, eventBus, type DbLike } from '@oven/module-registry';
```

The engine defines a narrow `DbLike` interface so tests can swap in
a mock without depending on the runtime `getDb()` returning `any`.

## Zustand

This module ships **no zustand stores**. The dashboard UI (sprint-04)
consumes data via the React Admin data provider, which is the right
abstraction for a server-paged resource list. If local state ever
becomes necessary (e.g. a wizard for creating a new plan), the store
will be created via the factory + React context pattern documented
in `CLAUDE.md`.

## Error handling

Per `CLAUDE.md`, error handling lives **only at system boundaries**.
The engine throws on unexpected state (e.g. an orphaned subscription
pointing at a deleted plan — data-integrity bug, not a user error)
and the API handler catches at its boundary, maps to the right HTTP
status, and returns the module error code from `api.md`.

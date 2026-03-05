# Module: Subscriptions

> **Package**: `packages/module-subscriptions/`
> **Name**: `@oven/module-subscriptions`
> **Dependencies**: `module-registry`, `module-config`, `module-tenants`
> **Status**: Planned

---

## 1. Overview

Subscriptions is the **dynamic billing, service catalog, and usage limit module** for the OVEN platform. It models the platform as a **service reseller** — packaging upstream provider services (Twilio for WhatsApp, OpenAI for AI, Resend for email, etc.) into billing plans sold to tenants.

The system is fully dynamic: providers, services, service categories, and limits are all registerable via CRUD APIs. Nothing is hardcoded. New services and providers can be added at runtime without code changes.

### Key Design Decisions

- **Service reseller model**: We contract with upstream providers and resell their services to tenants at the same or increased price.
- **Dynamic catalog**: Providers, services, and categories are DB entities — not enums or constants.
- **Plan-based quotas**: Billing plans define per-service usage quotas. Tenants subscribe to a plan to receive those quotas.
- **Per-tenant overrides**: VIP tenants can have custom quota overrides that exceed their plan limits.
- **Credential split**: Provider registration metadata lives in `sub_provider_services.configSchema`. Actual API keys/secrets are stored as tenant-scoped entries in `module-config` (see [module-config spec](./20-module-config.md)).

---

## 2. Core Concepts

### Service Category
Top-level groupings for services: messaging, AI, storage, analytics. Used for organizing the service catalog in the dashboard.

### Service
A concrete capability the platform offers: WhatsApp messaging, SMS, email, AI chat, file storage. Each service has a measurable `unit` (messages, tokens, GB, requests).

### Provider
An upstream vendor that implements one or more services: Twilio, Meta Business, OpenAI, Resend, AWS S3.

### Provider Service
A junction record linking a provider to a service, with cost information and required credential schema. Multiple providers can offer the same service (e.g., Twilio and Meta both offer WhatsApp). One provider-service pair is marked `isDefault` per service.

### Billing Plan
A public pricing tier sold to tenants: Free, Starter, Pro, Enterprise. Each plan defines a set of per-service quotas and non-metered features.

### Plan Quota
A per-service usage limit included in a billing plan (e.g., "Starter plan includes 300 WhatsApp messages/month").

### Tenant Subscription
A tenant's active subscription to a billing plan, with status tracking (active, trial, past_due, cancelled, expired).

### Quota Override
A per-tenant override to a plan quota (e.g., "VIP tenant gets 1000 WhatsApp messages instead of the plan's 300").

---

## 3. Database Schema

### Tables

**`sub_service_categories`** — Top-level service groupings
```typescript
export const serviceCategories = pgTable('sub_service_categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  description: text('description'),
  icon: varchar('icon', { length: 64 }),                  // MUI icon name
  order: integer('order').notNull().default(0),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**`sub_services`** — Concrete services offered
```typescript
export const services = pgTable('sub_services', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').notNull(),            // → sub_service_categories
  name: varchar('name', { length: 128 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  description: text('description'),
  unit: varchar('unit', { length: 64 }).notNull(),         // "messages", "tokens", "gb", "requests"
  enabled: boolean('enabled').notNull().default(true),
  metadata: jsonb('metadata'),                              // service-specific config
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('sub_services_category_idx').on(table.categoryId),
  index('sub_services_slug_idx').on(table.slug),
]);
```

**`sub_providers`** — Upstream vendors
```typescript
export const providers = pgTable('sub_providers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  description: text('description'),
  website: varchar('website', { length: 500 }),
  logo: varchar('logo', { length: 500 }),
  enabled: boolean('enabled').notNull().default(true),
  metadata: jsonb('metadata'),                              // provider-level config
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**`sub_provider_services`** — Provider-service junction with cost
```typescript
export const providerServices = pgTable('sub_provider_services', {
  id: serial('id').primaryKey(),
  providerId: integer('provider_id').notNull(),             // → sub_providers
  serviceId: integer('service_id').notNull(),               // → sub_services
  costPerUnit: integer('cost_per_unit'),                    // our cost in cents (what we pay upstream)
  currency: varchar('currency', { length: 10 }).default('USD'),
  isDefault: boolean('is_default').notNull().default(false), // default provider for this service
  enabled: boolean('enabled').notNull().default(true),
  configSchema: jsonb('config_schema'),                     // required credential fields: [{ key, label, type }]
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('sub_ps_provider_idx').on(table.providerId),
  index('sub_ps_service_idx').on(table.serviceId),
  unique('sub_ps_unique').on(table.providerId, table.serviceId),
]);
```

**`sub_billing_plans`** — Public plans sold to tenants
```typescript
export const billingPlans = pgTable('sub_billing_plans', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  description: text('description'),
  price: integer('price'),                                  // monthly price in cents
  currency: varchar('currency', { length: 10 }).default('COP'),
  billingCycle: varchar('billing_cycle', { length: 32 }).default('monthly'), // monthly | yearly
  features: jsonb('features'),                              // non-metered features: { maxMembers, customDomain, ... }
  isPublic: boolean('is_public').notNull().default(true),
  isSystem: boolean('is_system').notNull().default(false),
  enabled: boolean('enabled').notNull().default(true),
  order: integer('order').notNull().default(0),             // display order on pricing page
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**`sub_plan_quotas`** — Per-service limits included in a plan
```typescript
export const planQuotas = pgTable('sub_plan_quotas', {
  id: serial('id').primaryKey(),
  planId: integer('plan_id').notNull(),                     // → sub_billing_plans
  serviceId: integer('service_id').notNull(),               // → sub_services
  quota: integer('quota').notNull(),                        // limit per period
  period: varchar('period', { length: 32 }).notNull().default('monthly'), // monthly | daily | yearly
  pricePerUnit: integer('price_per_unit'),                  // our selling price per overage unit (cents)
  currency: varchar('currency', { length: 10 }).default('COP'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('sub_pq_plan_idx').on(table.planId),
  index('sub_pq_service_idx').on(table.serviceId),
  unique('sub_pq_unique').on(table.planId, table.serviceId),
]);
```

**`sub_tenant_subscriptions`** — Active tenant subscriptions
```typescript
export const tenantSubscriptions = pgTable('sub_tenant_subscriptions', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  planId: integer('plan_id').notNull(),                     // → sub_billing_plans
  status: varchar('status', { length: 50 }).notNull().default('active'),
    // active | trial | past_due | cancelled | expired
  startsAt: timestamp('starts_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
  trialEndsAt: timestamp('trial_ends_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('sub_ts_tenant_idx').on(table.tenantId),
  index('sub_ts_plan_idx').on(table.planId),
  index('sub_ts_status_idx').on(table.status),
]);
```

**`sub_quota_overrides`** — Per-tenant quota overrides
```typescript
export const subscriptionQuotaOverrides = pgTable('sub_quota_overrides', {
  id: serial('id').primaryKey(),
  subscriptionId: integer('subscription_id').notNull(),     // → sub_tenant_subscriptions
  serviceId: integer('service_id').notNull(),               // → sub_services
  quota: integer('quota').notNull(),                        // overridden limit
  reason: text('reason'),                                   // why this override exists
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('sub_qo_sub_idx').on(table.subscriptionId),
  unique('sub_qo_unique').on(table.subscriptionId, table.serviceId),
]);
```

---

## 4. API Endpoints

### Service Catalog

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| GET/POST | `/api/service-categories` | List/create service categories | Authenticated |
| GET/PUT/DELETE | `/api/service-categories/[id]` | Category CRUD | Authenticated |
| GET/POST | `/api/services` | List/create services | Authenticated |
| GET/PUT/DELETE | `/api/services/[id]` | Service CRUD | Authenticated |
| GET/POST | `/api/providers` | List/create providers | Authenticated |
| GET/PUT/DELETE | `/api/providers/[id]` | Provider CRUD | Authenticated |
| GET/POST | `/api/provider-services` | List/create provider-service mappings | Authenticated |
| GET/PUT/DELETE | `/api/provider-services/[id]` | Provider-service CRUD | Authenticated |

### Billing Plans

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| GET/POST | `/api/billing-plans` | List/create billing plans | Authenticated |
| GET/PUT/DELETE | `/api/billing-plans/[id]` | Plan CRUD | Authenticated |
| GET | `/api/billing-plans/public` | Public pricing page data | **Public** |
| GET/POST | `/api/billing-plans/[id]/quotas` | List/add plan quotas | Authenticated |
| PUT/DELETE | `/api/billing-plans/[id]/quotas/[quotaId]` | Update/remove plan quota | Authenticated |

### Tenant Subscriptions

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| GET/POST | `/api/tenant-subscriptions` | List/create subscriptions | Authenticated |
| GET/PUT | `/api/tenant-subscriptions/[id]` | Subscription CRUD | Authenticated |
| GET | `/api/tenant-subscriptions/by-tenant/[tenantId]` | Active subscription for tenant | Authenticated |
| GET | `/api/tenant-subscriptions/[tenantId]/limits` | All effective limits for tenant | Authenticated |
| GET | `/api/tenant-subscriptions/[tenantId]/limits/[serviceSlug]` | Single service limit | Authenticated |
| GET/POST | `/api/tenant-subscriptions/[id]/overrides` | List/add quota overrides | Authenticated |
| PUT/DELETE | `/api/tenant-subscriptions/[id]/overrides/[overrideId]` | Override CRUD | Authenticated |

---

## 5. Limit Resolution Algorithm

```
function getEffectiveLimit(tenantId, serviceSlug):
  1. Get tenant's active subscription
     SELECT ts.*, bp.* FROM sub_tenant_subscriptions ts
       JOIN sub_billing_plans bp ON ts.plan_id = bp.id
       WHERE ts.tenant_id = tenantId AND ts.status = 'active'
       LIMIT 1
     → subscriptionId, planId

  2. Resolve service ID
     SELECT id FROM sub_services WHERE slug = serviceSlug
     → serviceId

  3. Check subscription_quota_overrides
     SELECT quota FROM sub_quota_overrides
       WHERE subscription_id = subscriptionId AND service_id = serviceId
     If found → return override.quota

  4. Check plan_quotas
     SELECT quota FROM sub_plan_quotas
       WHERE plan_id = planId AND service_id = serviceId
     If found → return planQuota.quota

  5. Service not included in plan → return 0
```

### Effective Limits Response

`GET /api/tenant-subscriptions/[tenantId]/limits` returns all service limits for a tenant:

```json
{
  "tenantId": 5,
  "planName": "Starter",
  "planSlug": "starter",
  "limits": [
    { "service": "whatsapp", "unit": "messages", "quota": 300, "period": "monthly", "source": "plan" },
    { "service": "web-chat", "unit": "messages", "quota": 1000, "period": "monthly", "source": "override" },
    { "service": "ai-chat", "unit": "tokens", "quota": 100, "period": "monthly", "source": "plan" },
    { "service": "email", "unit": "messages", "quota": 500, "period": "monthly", "source": "plan" }
  ]
}
```

---

## 6. Provider Resolution

Other modules (e.g., `module-notifications`) need to know which provider to use for a given service and tenant.

```
function getProviderForService(tenantId, serviceSlug):
  1. Check module-config for tenant-specific provider preference:
     resolve(moduleName='subscriptions', key='PROVIDER_OVERRIDE_{serviceSlug}', tenantId=T)
  2. If override → look up provider by slug, return provider details
  3. Otherwise → return default provider:
     SELECT p.* FROM sub_providers p
       JOIN sub_provider_services ps ON p.id = ps.provider_id
       JOIN sub_services s ON ps.service_id = s.id
       WHERE s.slug = serviceSlug AND ps.is_default = true AND ps.enabled = true
```

### Credential Storage

Provider credentials (API keys, account SIDs) are stored in **module-config** as tenant-scoped entries:

| Config Key | Module | Example Value |
|---|---|---|
| `subscriptions.TWILIO_ACCOUNT_SID` | subscriptions | `"ACxxxxxxxxxxxxxxxx"` |
| `subscriptions.TWILIO_AUTH_TOKEN` | subscriptions | `"token_xxx"` |
| `subscriptions.OPENAI_API_KEY` | subscriptions | `"sk-xxx"` |
| `subscriptions.RESEND_API_KEY` | subscriptions | `"re_xxx"` |

The `providerServices.configSchema` JSONB field documents which credential keys are required for each provider-service combination:

```json
[
  { "key": "TWILIO_ACCOUNT_SID", "label": "Account SID", "type": "string", "required": true },
  { "key": "TWILIO_AUTH_TOKEN", "label": "Auth Token", "type": "secret", "required": true },
  { "key": "TWILIO_PHONE_NUMBER", "label": "Phone Number", "type": "string", "required": true }
]
```

---

## 7. Dashboard UI

### React Admin Resources

- **Service Categories** — List, Create, Edit
  - List: Datagrid with name, slug, icon, order, enabled
  - Create/Edit: Simple form with name, slug, description, icon picker, order

- **Services** — List, Create, Edit
  - List: Datagrid with name, slug, category (reference), unit, enabled
  - Create/Edit: Form with name, slug, categoryId (dropdown), unit, description

- **Providers** — List, Create, Edit
  - List: Datagrid with name, slug, website, logo, enabled
  - Create/Edit: Form with name, slug, description, website, logo

- **Provider Services** — List, Create, Edit
  - List: Datagrid with provider (reference), service (reference), costPerUnit, isDefault, enabled
  - Create/Edit: Form with providerId + serviceId dropdowns, costPerUnit, currency, isDefault, configSchema (JSON editor)

- **Billing Plans** — List, Create, Edit, Show
  - List: Datagrid with name, price, billingCycle, isPublic, enabled, order
  - Create/Edit: Form with name, slug, price, currency, billingCycle, features (JSON), isPublic
  - Show: Plan details + inline quotas editor
  - **Quota editor** (inline on Show/Edit): Datagrid of services with quota, period, pricePerUnit. Add/remove services.

- **Tenant Subscriptions** — List, Create, Edit, Show
  - List: Datagrid with tenant (reference), plan (reference), status, startsAt, expiresAt
  - Create: Form with tenantId, planId, status, startsAt, expiresAt
  - Show: Subscription details + effective limits + override editor
  - **Override editor** (inline on Show): Datagrid of overrides with service (reference), quota, reason. Add/remove overrides.

### Files to Create

```
apps/dashboard/src/components/subscriptions/
  ServiceCategoryList.tsx       — Category CRUD
  ServiceCategoryCreate.tsx
  ServiceCategoryEdit.tsx
  ServiceList.tsx               — Service CRUD
  ServiceCreate.tsx
  ServiceEdit.tsx
  ProviderList.tsx              — Provider CRUD
  ProviderCreate.tsx
  ProviderEdit.tsx
  ProviderServiceList.tsx       — Provider-service mapping CRUD
  ProviderServiceCreate.tsx
  ProviderServiceEdit.tsx
  BillingPlanList.tsx           — Plan CRUD
  BillingPlanCreate.tsx
  BillingPlanEdit.tsx
  BillingPlanShow.tsx           — Plan details + quota editor
  PlanQuotaEditor.tsx           — Inline quota management
  TenantSubscriptionList.tsx    — Subscription CRUD
  TenantSubscriptionCreate.tsx
  TenantSubscriptionEdit.tsx
  TenantSubscriptionShow.tsx    — Subscription + limits + overrides
  QuotaOverrideEditor.tsx       — Inline override management
  PublicPricingPage.tsx         — Public pricing page component
```

### Menu Section

```
──── Subscriptions ────
Service Categories
Services
Providers
Billing Plans
Subscriptions
```

---

## 8. Events

| Event | Payload |
|-------|---------|
| `subscriptions.category.created` | id, name, slug |
| `subscriptions.category.updated` | id, name, slug |
| `subscriptions.category.deleted` | id, slug |
| `subscriptions.service.created` | id, name, slug, categoryId, unit |
| `subscriptions.service.updated` | id, name, slug |
| `subscriptions.service.deleted` | id, slug |
| `subscriptions.provider.created` | id, name, slug |
| `subscriptions.provider.updated` | id, name, slug |
| `subscriptions.provider.deleted` | id, slug |
| `subscriptions.plan.created` | id, name, slug, price |
| `subscriptions.plan.updated` | id, name, slug, price |
| `subscriptions.plan.deleted` | id, slug |
| `subscriptions.subscription.created` | id, tenantId, planId, status |
| `subscriptions.subscription.updated` | id, tenantId, planId, status |
| `subscriptions.subscription.cancelled` | id, tenantId, planId |
| `subscriptions.quota.exceeded` | tenantId, serviceSlug, currentUsage, quota |

---

## 9. Integration Points

| Module | Integration |
|--------|-------------|
| **module-config** | Provider credentials stored as tenant-scoped config entries; provider preference overrides via config cascade |
| **module-tenants** | Tenants subscribe to billing plans; usage limits replace the old whatsappLimit/webLimit columns |
| **module-notifications** | Reads service limits for WhatsApp/SMS/email before sending; resolves provider for each service |
| **module-agent-core** | Reads AI service limits (tokens) before agent execution |
| **module-knowledge-base** | May read storage limits for file-based KB entries |
| **module-files** | Reads storage limits for file uploads |
| **module-workflows** | Workflow nodes can check usage limits as conditions |

---

## 10. ModuleDefinition

```typescript
export const subscriptionsModule: ModuleDefinition = {
  name: 'subscriptions',
  dependencies: ['config', 'tenants'],
  description: 'Dynamic billing, service catalog, and usage limit module. Models the platform as a service reseller with providers, services, plans, and tenant subscriptions.',
  capabilities: [
    'manage service catalog',
    'manage providers',
    'create billing plans',
    'manage tenant subscriptions',
    'check usage limits',
    'resolve provider for service',
  ],
  schema: {
    serviceCategories,
    services,
    providers,
    providerServices,
    billingPlans,
    planQuotas,
    tenantSubscriptions,
    subscriptionQuotaOverrides,
  },
  seed: seedSubscriptions,
  resources: [
    { name: 'service-categories', options: { label: 'Categories' } },
    { name: 'services', options: { label: 'Services' } },
    { name: 'providers', options: { label: 'Providers' } },
    { name: 'provider-services', options: { label: 'Provider Services' } },
    { name: 'billing-plans', options: { label: 'Billing Plans' } },
    { name: 'tenant-subscriptions', options: { label: 'Subscriptions' } },
  ],
  menuItems: [
    { label: 'Categories', to: '/service-categories' },
    { label: 'Services', to: '/services' },
    { label: 'Providers', to: '/providers' },
    { label: 'Plans', to: '/billing-plans' },
    { label: 'Subscriptions', to: '/tenant-subscriptions' },
  ],
  apiHandlers: {
    // Service Catalog
    'service-categories': { GET: listServiceCategories, POST: createServiceCategory },
    'service-categories/[id]': { GET: getServiceCategory, PUT: updateServiceCategory, DELETE: deleteServiceCategory },
    'services': { GET: listServices, POST: createService },
    'services/[id]': { GET: getService, PUT: updateService, DELETE: deleteService },
    'providers': { GET: listProviders, POST: createProvider },
    'providers/[id]': { GET: getProvider, PUT: updateProvider, DELETE: deleteProvider },
    'provider-services': { GET: listProviderServices, POST: createProviderService },
    'provider-services/[id]': { GET: getProviderService, PUT: updateProviderService, DELETE: deleteProviderService },
    // Billing Plans
    'billing-plans': { GET: listBillingPlans, POST: createBillingPlan },
    'billing-plans/[id]': { GET: getBillingPlan, PUT: updateBillingPlan, DELETE: deleteBillingPlan },
    'billing-plans/public': { GET: getPublicBillingPlans },
    'billing-plans/[id]/quotas': { GET: listPlanQuotas, POST: addPlanQuota },
    'billing-plans/[id]/quotas/[quotaId]': { PUT: updatePlanQuota, DELETE: removePlanQuota },
    // Tenant Subscriptions
    'tenant-subscriptions': { GET: listTenantSubscriptions, POST: createTenantSubscription },
    'tenant-subscriptions/[id]': { GET: getTenantSubscription, PUT: updateTenantSubscription },
    'tenant-subscriptions/by-tenant/[tenantId]': { GET: getSubscriptionByTenant },
    'tenant-subscriptions/[tenantId]/limits': { GET: getTenantLimits },
    'tenant-subscriptions/[tenantId]/limits/[serviceSlug]': { GET: getTenantServiceLimit },
    'tenant-subscriptions/[id]/overrides': { GET: listQuotaOverrides, POST: addQuotaOverride },
    'tenant-subscriptions/[id]/overrides/[overrideId]': { PUT: updateQuotaOverride, DELETE: removeQuotaOverride },
  },
  configSchema: [
    {
      key: 'DEFAULT_PLAN_SLUG',
      type: 'string',
      description: 'Default billing plan assigned to new tenants',
      defaultValue: 'free',
      instanceScoped: false,
    },
    {
      key: 'TRIAL_DURATION_DAYS',
      type: 'number',
      description: 'Default trial period in days for new subscriptions',
      defaultValue: 14,
      instanceScoped: false,
    },
    {
      key: 'OVERAGE_ENABLED',
      type: 'boolean',
      description: 'Allow tenants to exceed plan quotas (billed per-unit)',
      defaultValue: false,
      instanceScoped: true,
    },
  ],
  events: {
    emits: [
      'subscriptions.category.created',
      'subscriptions.category.updated',
      'subscriptions.category.deleted',
      'subscriptions.service.created',
      'subscriptions.service.updated',
      'subscriptions.service.deleted',
      'subscriptions.provider.created',
      'subscriptions.provider.updated',
      'subscriptions.provider.deleted',
      'subscriptions.plan.created',
      'subscriptions.plan.updated',
      'subscriptions.plan.deleted',
      'subscriptions.subscription.created',
      'subscriptions.subscription.updated',
      'subscriptions.subscription.cancelled',
      'subscriptions.quota.exceeded',
    ],
    schemas: {
      'subscriptions.category.created': {
        id: { type: 'number', description: 'Category DB ID', required: true },
        name: { type: 'string', description: 'Category name' },
        slug: { type: 'string', description: 'Category slug' },
      },
      'subscriptions.service.created': {
        id: { type: 'number', description: 'Service DB ID', required: true },
        name: { type: 'string', description: 'Service name' },
        slug: { type: 'string', description: 'Service slug' },
        categoryId: { type: 'number', description: 'Parent category ID' },
        unit: { type: 'string', description: 'Measurement unit' },
      },
      'subscriptions.provider.created': {
        id: { type: 'number', description: 'Provider DB ID', required: true },
        name: { type: 'string', description: 'Provider name' },
        slug: { type: 'string', description: 'Provider slug' },
      },
      'subscriptions.plan.created': {
        id: { type: 'number', description: 'Plan DB ID', required: true },
        name: { type: 'string', description: 'Plan name' },
        slug: { type: 'string', description: 'Plan slug' },
        price: { type: 'number', description: 'Monthly price in cents' },
      },
      'subscriptions.subscription.created': {
        id: { type: 'number', description: 'Subscription DB ID', required: true },
        tenantId: { type: 'number', description: 'Tenant DB ID', required: true },
        planId: { type: 'number', description: 'Plan DB ID', required: true },
        status: { type: 'string', description: 'Subscription status' },
      },
      'subscriptions.subscription.updated': {
        id: { type: 'number', description: 'Subscription DB ID', required: true },
        tenantId: { type: 'number', description: 'Tenant DB ID', required: true },
        planId: { type: 'number', description: 'Plan DB ID', required: true },
        status: { type: 'string', description: 'New status' },
      },
      'subscriptions.subscription.cancelled': {
        id: { type: 'number', description: 'Subscription DB ID', required: true },
        tenantId: { type: 'number', description: 'Tenant DB ID', required: true },
        planId: { type: 'number', description: 'Plan DB ID', required: true },
      },
      'subscriptions.quota.exceeded': {
        tenantId: { type: 'number', description: 'Tenant DB ID', required: true },
        serviceSlug: { type: 'string', description: 'Service slug', required: true },
        currentUsage: { type: 'number', description: 'Current period usage', required: true },
        quota: { type: 'number', description: 'Effective quota limit', required: true },
      },
    },
  },
  chat: {
    description: 'Dynamic billing and usage limit module. Manages service catalog (categories, services, providers), billing plans with per-service quotas, tenant subscriptions, and quota overrides.',
    capabilities: [
      'list services and providers',
      'check tenant usage limits',
      'get effective limit for a service',
      'resolve provider for a service',
      'list billing plans',
    ],
    actionSchemas: [
      {
        name: 'subscriptions.getTenantLimits',
        description: 'Get all effective usage limits for a tenant',
        parameters: {
          tenantId: { type: 'number', description: 'Tenant ID', required: true },
        },
        returns: { limits: { type: 'array' }, planName: { type: 'string' } },
        requiredPermissions: ['tenant-subscriptions.read'],
        endpoint: { method: 'GET', path: 'tenant-subscriptions/[tenantId]/limits' },
      },
      {
        name: 'subscriptions.getServiceLimit',
        description: 'Get effective limit for a specific service and tenant',
        parameters: {
          tenantId: { type: 'number', description: 'Tenant ID', required: true },
          serviceSlug: { type: 'string', description: 'Service slug', required: true },
        },
        returns: { quota: { type: 'number' }, source: { type: 'string' } },
        requiredPermissions: ['tenant-subscriptions.read'],
        endpoint: { method: 'GET', path: 'tenant-subscriptions/[tenantId]/limits/[serviceSlug]' },
      },
      {
        name: 'subscriptions.listPlans',
        description: 'List available billing plans',
        parameters: {
          isPublic: { type: 'boolean', description: 'Filter to public plans only' },
        },
        returns: { data: { type: 'array' }, total: { type: 'number' } },
        requiredPermissions: ['billing-plans.read'],
        endpoint: { method: 'GET', path: 'billing-plans' },
      },
    ],
  },
};
```

---

## 11. Seed Data

```typescript
export async function seedSubscriptions(db: any) {
  // ─── Permissions ────────────────────────────────────────
  const modulePermissions = [
    { resource: 'service-categories', action: 'read', slug: 'service-categories.read', description: 'View service categories' },
    { resource: 'service-categories', action: 'create', slug: 'service-categories.create', description: 'Create service categories' },
    { resource: 'service-categories', action: 'update', slug: 'service-categories.update', description: 'Edit service categories' },
    { resource: 'service-categories', action: 'delete', slug: 'service-categories.delete', description: 'Delete service categories' },
    { resource: 'services', action: 'read', slug: 'services.read', description: 'View services' },
    { resource: 'services', action: 'create', slug: 'services.create', description: 'Create services' },
    { resource: 'services', action: 'update', slug: 'services.update', description: 'Edit services' },
    { resource: 'services', action: 'delete', slug: 'services.delete', description: 'Delete services' },
    { resource: 'providers', action: 'read', slug: 'providers.read', description: 'View providers' },
    { resource: 'providers', action: 'create', slug: 'providers.create', description: 'Create providers' },
    { resource: 'providers', action: 'update', slug: 'providers.update', description: 'Edit providers' },
    { resource: 'providers', action: 'delete', slug: 'providers.delete', description: 'Delete providers' },
    { resource: 'provider-services', action: 'read', slug: 'provider-services.read', description: 'View provider-service mappings' },
    { resource: 'provider-services', action: 'create', slug: 'provider-services.create', description: 'Create provider-service mappings' },
    { resource: 'provider-services', action: 'update', slug: 'provider-services.update', description: 'Edit provider-service mappings' },
    { resource: 'provider-services', action: 'delete', slug: 'provider-services.delete', description: 'Delete provider-service mappings' },
    { resource: 'billing-plans', action: 'read', slug: 'billing-plans.read', description: 'View billing plans' },
    { resource: 'billing-plans', action: 'create', slug: 'billing-plans.create', description: 'Create billing plans' },
    { resource: 'billing-plans', action: 'update', slug: 'billing-plans.update', description: 'Edit billing plans' },
    { resource: 'billing-plans', action: 'delete', slug: 'billing-plans.delete', description: 'Delete billing plans' },
    { resource: 'tenant-subscriptions', action: 'read', slug: 'tenant-subscriptions.read', description: 'View tenant subscriptions' },
    { resource: 'tenant-subscriptions', action: 'create', slug: 'tenant-subscriptions.create', description: 'Create tenant subscriptions' },
    { resource: 'tenant-subscriptions', action: 'update', slug: 'tenant-subscriptions.update', description: 'Edit tenant subscriptions' },
  ];

  for (const perm of modulePermissions) {
    await db.insert(permissions).values(perm).onConflictDoNothing();
  }

  // ─── Public endpoints ───────────────────────────────────
  await db.insert(apiEndpointPermissions).values({
    module: 'subscriptions', route: 'billing-plans/public', method: 'GET', isPublic: true,
  }).onConflictDoNothing();

  // ─── Default service categories ─────────────────────────
  const existingCategories = await db.select().from(serviceCategories).limit(1);
  if (existingCategories.length > 0) return;

  const [messaging, ai, storage] = await db.insert(serviceCategories).values([
    { name: 'Messaging', slug: 'messaging', icon: 'Chat', order: 1 },
    { name: 'AI', slug: 'ai', icon: 'Psychology', order: 2 },
    { name: 'Storage', slug: 'storage', icon: 'CloudUpload', order: 3 },
  ]).returning();

  // ─── Default services ──────────────────────────────────
  const [whatsapp, sms, email, webChat, aiChat, fileStorage] = await db.insert(services).values([
    { categoryId: messaging.id, name: 'WhatsApp', slug: 'whatsapp', unit: 'messages' },
    { categoryId: messaging.id, name: 'SMS', slug: 'sms', unit: 'messages' },
    { categoryId: messaging.id, name: 'Email', slug: 'email', unit: 'messages' },
    { categoryId: messaging.id, name: 'Web Chat', slug: 'web-chat', unit: 'messages' },
    { categoryId: ai.id, name: 'AI Chat', slug: 'ai-chat', unit: 'tokens' },
    { categoryId: storage.id, name: 'File Storage', slug: 'file-storage', unit: 'gb' },
  ]).returning();

  // ─── Default providers ─────────────────────────────────
  const [twilio, meta, resend, openai] = await db.insert(providers).values([
    { name: 'Twilio', slug: 'twilio', website: 'https://twilio.com' },
    { name: 'Meta Business', slug: 'meta', website: 'https://business.facebook.com' },
    { name: 'Resend', slug: 'resend', website: 'https://resend.com' },
    { name: 'OpenAI', slug: 'openai', website: 'https://openai.com' },
  ]).returning();

  // ─── Default provider-service mappings ─────────────────
  await db.insert(providerServices).values([
    {
      providerId: twilio.id, serviceId: whatsapp.id, isDefault: true,
      configSchema: [
        { key: 'TWILIO_ACCOUNT_SID', label: 'Account SID', type: 'string', required: true },
        { key: 'TWILIO_AUTH_TOKEN', label: 'Auth Token', type: 'secret', required: true },
        { key: 'TWILIO_PHONE_NUMBER', label: 'Phone Number', type: 'string', required: true },
      ],
    },
    {
      providerId: twilio.id, serviceId: sms.id, isDefault: true,
      configSchema: [
        { key: 'TWILIO_ACCOUNT_SID', label: 'Account SID', type: 'string', required: true },
        { key: 'TWILIO_AUTH_TOKEN', label: 'Auth Token', type: 'secret', required: true },
        { key: 'TWILIO_PHONE_NUMBER', label: 'Phone Number', type: 'string', required: true },
      ],
    },
    { providerId: resend.id, serviceId: email.id, isDefault: true,
      configSchema: [
        { key: 'RESEND_API_KEY', label: 'API Key', type: 'secret', required: true },
        { key: 'RESEND_FROM_EMAIL', label: 'From Email', type: 'string', required: true },
      ],
    },
    { providerId: openai.id, serviceId: aiChat.id, isDefault: true,
      configSchema: [
        { key: 'OPENAI_API_KEY', label: 'API Key', type: 'secret', required: true },
        { key: 'OPENAI_MODEL', label: 'Model', type: 'string', required: false },
      ],
    },
  ]);

  // ─── Default billing plan: Free ────────────────────────
  const [freePlan] = await db.insert(billingPlans).values([
    { name: 'Free', slug: 'free', price: 0, currency: 'COP', isSystem: true, order: 0,
      features: { maxMembers: 3 } },
  ]).returning();

  // ─── Free plan quotas ──────────────────────────────────
  await db.insert(planQuotas).values([
    { planId: freePlan.id, serviceId: whatsapp.id, quota: 300, period: 'monthly' },
    { planId: freePlan.id, serviceId: webChat.id, quota: 500, period: 'monthly' },
    { planId: freePlan.id, serviceId: aiChat.id, quota: 50, period: 'monthly' },
  ]);
}
```

---

## Module Rules Compliance

> Added per [`module-rules.md`](../module-rules.md) — 7 required items.

### A. Schema Updates — tenantId + Indexes

Tenant-scoped tables have `tenantId` with indexes:

```typescript
// sub_tenant_subscriptions — tenant-scoped
tenantId: integer('tenant_id').notNull(),
}, (table) => [
  index('sub_ts_tenant_idx').on(table.tenantId),
  index('sub_ts_plan_idx').on(table.planId),
  index('sub_ts_status_idx').on(table.status),
]);

// sub_quota_overrides — linked to subscriptions (indirectly tenant-scoped)
subscriptionId: integer('subscription_id').notNull(),
}, (table) => [
  index('sub_qo_sub_idx').on(table.subscriptionId),
  unique('sub_qo_unique').on(table.subscriptionId, table.serviceId),
]);
```

Platform-global catalog tables (categories, services, providers, plans) have slug indexes and appropriate unique constraints.

### B. Chat Block

See Section 10 — full `chat` block with description, 5 capabilities, and 3 actionSchemas (getTenantLimits, getServiceLimit, listPlans).

### C. configSchema

See Section 10 — 3 config keys: `DEFAULT_PLAN_SLUG`, `TRIAL_DURATION_DAYS`, `OVERAGE_ENABLED`.

### D. Typed Event Schemas

See Section 10 — 16 events with typed schemas. Key events include subscription lifecycle (`created`, `updated`, `cancelled`) and `quota.exceeded` for usage limit alerts.

### E. Seed Function

See Section 11 — idempotent seed function that:
1. Registers 23 permissions across 7 resources
2. Marks 1 public endpoint (`billing-plans/public`)
3. Seeds default service categories (messaging, AI, storage)
4. Seeds default services (WhatsApp, SMS, email, web chat, AI chat, file storage)
5. Seeds default providers (Twilio, Meta, Resend, OpenAI)
6. Seeds default provider-service mappings with configSchema
7. Seeds Free billing plan with quotas

### F. API Handler Example

```typescript
// GET /api/tenant-subscriptions/[tenantId]/limits — Effective limits for a tenant
import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { tenantSubscriptions, billingPlans, planQuotas, services, subscriptionQuotaOverrides } from '../schema';

export async function GET(request: NextRequest, { params }: { params: { tenantId: string } }) {
  const db = getDb();
  const tenantId = parseInt(params.tenantId, 10);

  // Get active subscription
  const [subscription] = await db.select()
    .from(tenantSubscriptions)
    .innerJoin(billingPlans, eq(tenantSubscriptions.planId, billingPlans.id))
    .where(and(
      eq(tenantSubscriptions.tenantId, tenantId),
      eq(tenantSubscriptions.status, 'active')
    ))
    .limit(1);

  if (!subscription) return notFound();

  // Get plan quotas with service details
  const quotas = await db.select()
    .from(planQuotas)
    .innerJoin(services, eq(planQuotas.serviceId, services.id))
    .where(eq(planQuotas.planId, subscription.sub_tenant_subscriptions.planId));

  // Get overrides for this subscription
  const overrides = await db.select()
    .from(subscriptionQuotaOverrides)
    .where(eq(subscriptionQuotaOverrides.subscriptionId, subscription.sub_tenant_subscriptions.id));

  const overrideMap = new Map(overrides.map(o => [o.serviceId, o.quota]));

  // Build effective limits
  const limits = quotas.map(q => {
    const overrideQuota = overrideMap.get(q.sub_services.id);
    return {
      service: q.sub_services.slug,
      unit: q.sub_services.unit,
      quota: overrideQuota ?? q.sub_plan_quotas.quota,
      period: q.sub_plan_quotas.period,
      source: overrideQuota !== undefined ? 'override' : 'plan',
    };
  });

  return NextResponse.json({
    tenantId,
    planName: subscription.sub_billing_plans.name,
    planSlug: subscription.sub_billing_plans.slug,
    limits,
  });
}
```

---

## See Also

- [Admin Use Cases](../use-cases.md) — cross-module workflow guide. Relevant use cases:
  - **UC 1**: Initial Platform Setup (Config + Subscriptions)
  - **UC 5**: Create a Billing Plan (Subscriptions)
  - **UC 6**: Upgrade/Downgrade a Plan (Subscriptions)
  - **UC 7**: Add a New Service (Subscriptions)
  - **UC 12**: VIP Tenant Extra Quotas (Subscriptions)
- [Module Config Spec](./20-module-config.md) — config storage and 5-tier cascade
- [Module Tenants Spec](./13-tenants.md) — tenant identity and membership

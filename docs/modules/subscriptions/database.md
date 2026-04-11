# Subscriptions — Database Schema

> Source of truth: `packages/module-subscriptions/src/schema.ts`.
> Every table has `tenant_id` scoping where applicable; platform-wide
> catalog tables (services, providers, plans) do **not** carry
> `tenant_id` by design.

## 9 tables

| Table                     | Purpose                                         | Tenant-scoped? |
|---------------------------|-------------------------------------------------|:--------------:|
| `sub_service_categories`  | High-level category (e.g. "Messaging", "AI")    | No — platform  |
| `sub_services`            | Unit-priced service (e.g. "whatsapp", "ai-chat")| No — platform  |
| `sub_providers`           | Upstream vendor (e.g. "twilio", "openai")       | No — platform  |
| `sub_provider_services`   | Mapping of provider × service with cost         | No — platform  |
| `sub_billing_plans`       | Sellable plan (e.g. "starter", "pro")           | No — platform  |
| `sub_plan_quotas`         | Per-plan per-service quota + period             | No — platform  |
| `sub_tenant_subscriptions`| A tenant's active plan                          | **Yes**        |
| `sub_quota_overrides`     | Per-subscription per-service override           | **Yes** (via subscription) |
| `sub_usage_records`       | Usage ledger — one row per metered event        | **Yes**        |

## `sub_service_categories`

```ts
id          serial     PRIMARY KEY
slug        varchar(64) NOT NULL UNIQUE   // "messaging", "ai", "storage"
name        varchar(128) NOT NULL
description text
createdAt   timestamp with time zone DEFAULT now()
```

## `sub_services`

```ts
id          serial     PRIMARY KEY
categoryId  integer    NOT NULL REFERENCES sub_service_categories(id)
slug        varchar(64) NOT NULL UNIQUE   // "whatsapp", "ai-chat", "email"
name        varchar(128) NOT NULL
unit        varchar(32) NOT NULL          // "messages", "tokens", "gigabytes"
description text
createdAt   timestamp with time zone DEFAULT now()
```

## `sub_providers`

```ts
id          serial     PRIMARY KEY
slug        varchar(64) NOT NULL UNIQUE   // "twilio", "openai", "resend"
name        varchar(128) NOT NULL
websiteUrl  varchar(512)
createdAt   timestamp with time zone DEFAULT now()
```

## `sub_provider_services`

```ts
id            serial     PRIMARY KEY
providerId    integer    NOT NULL REFERENCES sub_providers(id)
serviceId     integer    NOT NULL REFERENCES sub_services(id)
costCents     integer    NOT NULL          // OVEN's cost per unit
isPreferred   boolean    NOT NULL DEFAULT false
createdAt     timestamp with time zone DEFAULT now()
UNIQUE(providerId, serviceId)
```

## `sub_billing_plans`

```ts
id            serial      PRIMARY KEY
slug          varchar(64) NOT NULL UNIQUE
name          varchar(128) NOT NULL
description   text
priceCents    integer     NOT NULL            // monthly price
currency      varchar(8)  NOT NULL DEFAULT 'USD'
isPublic      boolean     NOT NULL DEFAULT true
createdAt     timestamp with time zone DEFAULT now()
```

## `sub_plan_quotas`

```ts
id        serial     PRIMARY KEY
planId    integer    NOT NULL REFERENCES sub_billing_plans(id)
serviceId integer    NOT NULL REFERENCES sub_services(id)
quota     integer    NOT NULL            // units per period
period    varchar(16) NOT NULL           // 'daily' | 'monthly' | 'yearly'
UNIQUE(planId, serviceId)
```

## `sub_tenant_subscriptions`

```ts
id          serial     PRIMARY KEY
tenantId    integer    NOT NULL REFERENCES tenants(id)
planId      integer    NOT NULL REFERENCES sub_billing_plans(id)
status      varchar(16) NOT NULL          // 'active' | 'canceled' | 'past_due' | 'trial'
startedAt   timestamp with time zone NOT NULL DEFAULT now()
canceledAt  timestamp with time zone
createdAt   timestamp with time zone DEFAULT now()
INDEX (tenantId, status)
```

## `sub_quota_overrides`

```ts
id             serial     PRIMARY KEY
subscriptionId integer    NOT NULL REFERENCES sub_tenant_subscriptions(id)
serviceId      integer    NOT NULL REFERENCES sub_services(id)
quota          integer    NOT NULL
reason         text
createdAt      timestamp with time zone DEFAULT now()
UNIQUE(subscriptionId, serviceId)
```

## `sub_usage_records`

```ts
id              bigserial  PRIMARY KEY
tenantId        integer    NOT NULL REFERENCES tenants(id)
serviceId       integer    NOT NULL REFERENCES sub_services(id)
amount          integer    NOT NULL           // units consumed
metadata        jsonb
idempotencyKey  varchar(64)                   // sprint-02 — nullable
recordedAt      timestamp with time zone NOT NULL DEFAULT now()
INDEX (tenantId, serviceId, recordedAt)
PARTIAL UNIQUE INDEX (tenantId, idempotencyKey) WHERE idempotencyKey IS NOT NULL
```

The partial unique index is what makes `POST /api/usage/track`
idempotent per tenant (sprint-02). Without an idempotency key, the
row lands normally — retries from middleware are what need the key.

## Row-level security

All tenant-scoped tables (`sub_tenant_subscriptions`,
`sub_quota_overrides`, `sub_usage_records`) must have RLS policies
that limit `SELECT` / `UPDATE` / `DELETE` to rows where `tenant_id`
matches the `app.tenant_ids` session GUC set by `module-tenants`.
Catalog tables (services, providers, plans, plan quotas) are
platform-wide and have no RLS.

RLS policies are sibling to the `module-tenants` patterns — see
`docs/modules/tenants/secure.md` for the exact `CREATE POLICY …
USING (tenant_id = ANY(current_setting('app.tenant_ids')::int[]))`
template.

## Indices

- `sub_usage_records (tenant_id, service_id, recorded_at)` —
  primary query path for `GET /api/tenant-subscriptions/[tenantId]/usage`.
- `sub_tenant_subscriptions (tenant_id, status)` — primary path for
  the "active subscription" lookup.
- `sub_plan_quotas (plan_id, service_id)` unique — enforces one
  quota per `(plan, service)`.
- `sub_quota_overrides (subscription_id, service_id)` unique —
  enforces one override per `(subscription, service)`.

## Relationships

```
tenants.id
  ↖ sub_tenant_subscriptions.tenantId
       ↖ sub_quota_overrides.subscriptionId
  ↖ sub_usage_records.tenantId

sub_service_categories.id
  ↖ sub_services.categoryId
       ↖ sub_provider_services.serviceId
       ↖ sub_plan_quotas.serviceId
       ↖ sub_quota_overrides.serviceId
       ↖ sub_usage_records.serviceId

sub_providers.id
  ↖ sub_provider_services.providerId

sub_billing_plans.id
  ↖ sub_plan_quotas.planId
  ↖ sub_tenant_subscriptions.planId
```

Foreign keys are plain integers per `docs/module-rules.md` Rule 4.3.

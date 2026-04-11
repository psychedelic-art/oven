# Subscriptions — API

> Source: `packages/module-subscriptions/src/api/*.handler.ts` (23 files).
> All routes are auth-required unless marked Public.

## Service catalog

| Method          | Route                                | Purpose                                 | Auth         |
|-----------------|--------------------------------------|-----------------------------------------|--------------|
| GET / POST      | `/api/service-categories`            | List / create categories                | Authenticated |
| GET / PUT / DELETE | `/api/service-categories/[id]`    | Category CRUD                           | Authenticated |
| GET / POST      | `/api/services`                      | List / create services                  | Authenticated |
| GET / PUT / DELETE | `/api/services/[id]`              | Service CRUD                            | Authenticated |
| GET / POST      | `/api/providers`                     | List / create providers                 | Authenticated |
| GET / PUT / DELETE | `/api/providers/[id]`             | Provider CRUD                           | Authenticated |
| GET / POST      | `/api/provider-services`             | List / create provider-service mappings | Authenticated |
| GET / PUT / DELETE | `/api/provider-services/[id]`     | Provider-service CRUD                   | Authenticated |

## Billing plans

| Method          | Route                                | Purpose                    | Auth         |
|-----------------|--------------------------------------|----------------------------|--------------|
| GET / POST      | `/api/billing-plans`                 | List / create plans        | Authenticated |
| GET / PUT / DELETE | `/api/billing-plans/[id]`         | Plan CRUD                  | Authenticated |
| GET             | `/api/billing-plans/public`          | Public pricing page data   | **Public**    |
| GET / POST      | `/api/plan-quotas`                   | List / add plan quotas     | Authenticated |
| GET / PUT / DELETE | `/api/plan-quotas/[id]`           | Plan quota CRUD            | Authenticated |

### Public surface

`GET /api/billing-plans/public` is the only public route in the
module. It returns **exactly** this shape — never more:

```json
{
  "plans": [
    {
      "id": 2,
      "slug": "starter",
      "name": "Starter",
      "priceCents": 2900,
      "currency": "USD",
      "quotas": [
        { "service": "whatsapp", "unit": "messages", "quota": 300, "period": "monthly" },
        { "service": "ai-chat",  "unit": "tokens",   "quota": 100,  "period": "monthly" }
      ]
    }
  ]
}
```

No `costCents`, `providerId`, `marginPercent`, or any internal
column. The projection is asserted in `sprint-03-public-pricing.md`
acceptance tests.

## Tenant subscriptions

| Method          | Route                                              | Purpose                          | Auth         |
|-----------------|----------------------------------------------------|----------------------------------|--------------|
| GET / POST      | `/api/tenant-subscriptions`                        | List / create subscriptions      | Authenticated |
| GET / PUT       | `/api/tenant-subscriptions/[id]`                   | Subscription read / update       | Authenticated |
| GET             | `/api/tenant-subscriptions/by-tenant/[tenantId]`   | Active subscription for tenant   | Authenticated |
| GET             | `/api/tenant-subscriptions/[tenantId]/limits`      | All effective limits             | Authenticated |
| GET             | `/api/tenant-subscriptions/[tenantId]/limits/[serviceSlug]` | Single service effective limit | Authenticated |
| GET / POST      | `/api/quota-overrides`                             | List / create overrides          | Authenticated |
| GET / PUT / DELETE | `/api/quota-overrides/[id]`                     | Override CRUD                    | Authenticated |

### `GET /api/tenant-subscriptions/[tenantId]/limits`

Returns the effective limit for every service in the tenant's plan.
Response shape:

```json
{
  "tenantId": 5,
  "planName": "Starter",
  "planSlug": "starter",
  "limits": [
    { "service": "whatsapp",     "unit": "messages", "quota": 300,  "period": "monthly", "source": "plan" },
    { "service": "web-chat",     "unit": "messages", "quota": 1000, "period": "monthly", "source": "override" },
    { "service": "ai-chat",      "unit": "tokens",   "quota": 100,  "period": "monthly", "source": "plan" },
    { "service": "email",        "unit": "messages", "quota": 500,  "period": "monthly", "source": "plan" }
  ]
}
```

`source` is `override` when an active `sub_quota_overrides` row
wins, `plan` when the `sub_plan_quotas` row applies, and `zero` when
the service is not in the plan at all.

### `GET /api/tenant-subscriptions/[tenantId]/limits/[serviceSlug]`

Returns the effective limit for a single service. `serviceSlug` MUST
match `^[a-z0-9-]+$` — asserted at the handler boundary (sprint-02).

```json
{
  "tenantId": 5,
  "service": "whatsapp",
  "unit": "messages",
  "quota": 300,
  "period": "monthly",
  "source": "plan"
}
```

## Usage metering

Three routes, all auth-required:

| Method | Route                                           | Purpose                                                         | Auth         |
|--------|-------------------------------------------------|-----------------------------------------------------------------|--------------|
| POST   | `/api/usage/track`                              | Insert a usage record (idempotent via `X-Usage-Idempotency-Key`) | Authenticated |
| GET    | `/api/usage/summary`                            | Rolled-up current-period usage for the caller's tenant          | Authenticated |
| GET    | `/api/tenant-subscriptions/[tenantId]/usage`    | Rolled-up usage for a specific tenant                            | Authenticated |

### `POST /api/usage/track`

Request headers:

```
Authorization: Bearer <token>
Content-Type:  application/json
X-Usage-Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000   (OPTIONAL but recommended)
```

Request body:

```json
{
  "serviceSlug": "whatsapp",
  "amount": 1,
  "metadata": { "messageId": "wamid.HB…" }
}
```

Behaviour:

1. Validate `serviceSlug` against `^[a-z0-9-]+$`.
2. If `X-Usage-Idempotency-Key` is present, check
   `sub_usage_records (tenant_id, idempotency_key)` — if a row exists,
   return the existing row and a `200 OK`.
3. Otherwise, insert a new row and return `201 Created`.

Retries from middleware with the same key collapse to a single row
via the partial unique index. This is the fix for crosscheck §6.3
item #3 (the missing idempotency guarantee that `module-ai`
middleware needs).

### `GET /api/usage/summary`

Rolled-up usage for the caller's tenant for the current period.
Returns:

```json
{
  "tenantId": 5,
  "period": "2026-04",
  "usage": [
    { "service": "whatsapp", "used": 147, "quota": 300, "percent": 49 },
    { "service": "ai-chat",  "used": 62,  "quota": 100, "percent": 62 }
  ]
}
```

### `GET /api/tenant-subscriptions/[tenantId]/usage`

Identical shape to `/api/usage/summary` but keyed on an explicit
`tenantId` path parameter. Requires `platform.admin` or
`tenant.admin` on the target tenant.

## Error codes

| HTTP | Meaning                                                    | Module code               |
|------|------------------------------------------------------------|---------------------------|
| 400  | Validation error (bad `serviceSlug`, missing field)        | `subscriptions.bad_input` |
| 401  | Unauthenticated                                            | (platform)                |
| 403  | Authenticated but not authorised for the target tenant    | `subscriptions.forbidden` |
| 404  | Unknown tenant or plan                                     | `subscriptions.not_found` |
| 409  | Override conflicts with an existing row                    | `subscriptions.conflict`  |
| 422  | Quota exceeded (from `checkQuota`)                         | `subscriptions.quota_exceeded` |

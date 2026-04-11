# Module Subscriptions — Overview

> **Package**: `packages/module-subscriptions/`
> **Name**: `@oven/module-subscriptions`
> **Dependencies**: `module-registry`, `module-config`, `module-tenants`
> **Status**: LIVE on `origin/dev` — canonical doc set graduated 2026-04-11
> **Spec**: [`docs/modules/21-module-subscriptions.md`](../21-module-subscriptions.md)

---

## What it does

`module-subscriptions` is the **dynamic billing, service catalog, and
usage-metering** module for OVEN. It models the platform as a
**service reseller**: OVEN contracts with upstream providers (Twilio,
OpenAI, Resend, etc.), packages their services into tiered billing
plans, and resells the quotas to tenant organisations.

Every noun in that sentence is a row in a DB table — providers,
services, service categories, billing plans, plan quotas, tenant
subscriptions, quota overrides, and usage records are all regular
CRUD resources. **Nothing is hardcoded.** A new upstream provider can
be added at runtime via `POST /api/providers` + `POST /api/services`
+ `POST /api/provider-services` without shipping new code.

## Key design decisions

1. **Service reseller model.** OVEN pays upstream per-unit (e.g.
   $0.0005 per WhatsApp message), bundles it into a plan (e.g. 300
   messages for $29/month), and tracks each tenant's consumption in
   `sub_usage_records`.
2. **Dynamic catalog.** Providers, services, and categories are DB
   entities, not enums. Adding "WhatsApp Cloud API v20" is one row,
   not a code change.
3. **Plan-based quotas with overrides.** A billing plan sets a
   per-service quota; an active subscription may override any quota
   per tenant (e.g. a promotional lift for an early adopter).
4. **Five-step limit resolution.** `getEffectiveLimit(tenantId, serviceSlug)`
   walks subscription → service → override → plan quota → zero, in
   that exact order. Documented in `module-design.md` and asserted
   in `src/__tests__/limit-resolver.test.ts` (sprint-01).
5. **Usage is the source of truth in our DB**, not in the upstream
   billing system. Per the Stripe 2026 guidance, internal ledger
   rows power real-time dashboards and debugging; aggregated summaries
   are pushed to billing on a fixed cadence, not per-request.

## What this module exposes

- 23 REST handlers under `src/api/` covering service catalog, billing
  plans, tenant subscriptions, overrides, limits, and usage.
- A `UsageMeteringService` engine at `src/engine/usage-metering.ts`
  exposing `checkQuota(tenantId, serviceSlug)` and
  `trackUsage(tenantId, serviceSlug, amount, idempotencyKey?)`.
- An idempotent `seed()` that populates categories, services,
  providers, provider-services, billing plans, and plan quotas from
  a seed file (refactored in cycle-1 to `INSERT … ON CONFLICT DO UPDATE`).
- A `ModuleDefinition` registered in
  `apps/dashboard/src/lib/modules.ts` in dependency order after
  `module-registry`, `module-config`, and `module-tenants`.

## Who depends on this module

| Dependent | Uses |
|---|---|
| `module-ai` | `checkQuota('ai-chat' \| 'ai-agents' \| 'ai-embeddings')` before every completion; `trackUsage` after. |
| `module-notifications` | `checkQuota('whatsapp' \| 'email' \| 'sms' \| 'web-chat')` before every send; `trackUsage` after. |
| `module-knowledge-base` | `checkQuota('ai-embeddings')` before an embedding batch. |
| `module-tenants` | `GET /api/tenant-subscriptions/[tenantId]/limits` on the tenant detail page. |

## Where to start

- To understand the data model → `database.md`.
- To call the API → `api.md`.
- To understand the limit resolver → `module-design.md` §"Limit resolver".
- To deploy securely → `secure.md`.

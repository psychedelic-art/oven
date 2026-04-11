# Module Tenants — Overview

> **Package**: `packages/module-tenants/`
> **Name**: `@oven/module-tenants`
> **Dependencies**: `module-registry`, `module-config`
> **Status**: Phase 0 (Core Infrastructure) — package implemented with slim
> identity schema, 7 handlers, seed, business-hours util; dashboard UI wired;
> **no unit tests yet** (tracked in the todo sprint plan)
> **Spec**: [`docs/modules/13-tenants.md`](../13-tenants.md)

---

## What It Does

Tenants is the **multi-tenant identity module** for OVEN. It owns the single
source of truth for *what* a client organization is: an id, a name, a slug,
an enabled flag, and an opaque metadata blob. Nothing else. Everything the
tenant can *configure* — schedule, timezone, branding, services, welcome
messages, tone, payment methods, emergency instructions — lives in
`module-config` as tenant-scoped entries. Everything the tenant can *consume*
— WhatsApp quota, web-chat quota, any other metered service — lives in
`module-subscriptions`.

This separation is enforced by [Rule 13 — Config Centralization](../module-rules.md#rule-13)
of the OVEN module rules. Columns on `tenants` that hold tenant-customizable
settings are a rule violation.

The package is a Phase 0 peer of `module-config` and `module-registry`. Every
downstream module (`auth`, `knowledge-base`, `chat`, `agent-core`,
`workflow-agents`, `ui-flows`, `notifications`, `files`, `ai`) depends on it
for tenant identity resolution.

---

## Why It Exists

Before this refactor, the `tenants` table carried 14 mixed-concern columns:
`nit`, `business_name`, `logo`, `timezone`, `locale`, `schedule`,
`authorized_services`, `payment_methods`, `tone`, `human_contact_info`,
`emergency_instructions`, `scheduling_url`, `welcome_message_business_hours`,
`welcome_message_out_of_hours`, plus the two quota columns
`whatsapp_limit` / `web_limit`. Every new tenant setting required a
migration. Every cross-tenant query had to join the tenants row just to
read a schedule. The cascade of "platform default → tenant override →
instance override" was reinvented in half the modules.

Splitting the table fixes three problems at once:

1. **Schema stability** — the `tenants` table is frozen at the identity
   shape. New settings do not require migrations.
2. **One cascade** — every setting resolves through `module-config`'s
   5-tier resolver. No more reinvented-per-module cascade.
3. **Billing decoupling** — `whatsapp_limit` and `web_limit` are now
   dynamic `plan_quotas` rows in `module-subscriptions`, which means a
   single subscription change can re-price every service the tenant uses
   without touching the tenants table.

---

## What It Owns

- **Two Postgres tables**: `tenants` (identity, 7 columns) and
  `tenant_members` (user↔tenant many-to-many, 5 columns + unique index).
- **Seven API routes** under `/api/tenants/*` — list/create, single CRUD,
  by-slug, public-by-slug (composition endpoint), members list/add,
  members remove, business-hours.
- **One pure utility**: `computeBusinessHours(schedule, timezone)` — used
  by the business-hours endpoint and by downstream chat/agent flows that
  gate responses on whether the tenant is open.
- **Seven permissions**: `tenants.read/create/update/delete`,
  `tenant-members.read/create/delete`.
- **One public endpoint** whitelisted in `api_endpoint_permissions`:
  `GET /api/tenants/[slug]/public`.
- **Fifteen `configSchema` entries** registered via `module-config` —
  one per migrated column plus `MAX_MEMBERS_PER_TENANT`.
- **Five typed events** emitted through the registry event bus.
- **Four dashboard resources** (`TenantList`, `TenantCreate`, `TenantEdit`,
  `TenantShow`) under `apps/dashboard/src/components/tenants/`.

---

## Public Surface Snapshot

```typescript
import {
  tenantsModule,        // ModuleDefinition — registered in modules.ts
  tenantsSchema,        // Drizzle tables: tenants, tenantMembers
  seedTenants,          // idempotent permission + public-endpoint seed
  computeBusinessHours, // pure util, no I/O
} from '@oven/module-tenants';
```

The package exposes **no React components** — dashboard UI lives in
`apps/dashboard/src/components/tenants/` and consumes only the API. This
keeps the package tree-shakeable and server-safe (it has no `react` dep).

---

## Integration Points

Every tenant-scoped module reads tenants through one of three surfaces:

1. **Direct SQL** via `tenantsSchema.tenants` for joined queries inside
   the same package (e.g., `module-auth` resolving tenant on a session).
2. **Public HTTP** via `GET /api/tenants/[slug]/public` for the portal,
   the chat widget, and any external client that knows the tenant slug
   but has no authenticated session.
3. **Composed config** via `module-config`'s `resolve-batch` endpoint —
   the `tenants/[slug]/public` handler uses this itself to assemble the
   backward-compatible "thick tenant" JSON for portal consumers.

---

## Quick Links

- Spec: [`../13-tenants.md`](../13-tenants.md)
- UI: [`UI.md`](./UI.md)
- API: [`api.md`](./api.md)
- Architecture: [`architecture.md`](./architecture.md)
- Database: [`database.md`](./database.md)
- Detailed requirements: [`detailed-requirements.md`](./detailed-requirements.md)
- Module design: [`module-design.md`](./module-design.md)
- Prompts: [`prompts.md`](./prompts.md)
- References: [`references.md`](./references.md)
- Security: [`secure.md`](./secure.md)
- Use-case compliance: [`use-case-compliance.md`](./use-case-compliance.md)
- Todo / sprint plan: [`../todo/tenants/README.md`](../todo/tenants/README.md)

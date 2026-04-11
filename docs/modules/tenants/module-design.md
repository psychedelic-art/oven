# Module Tenants — Module Design

## ModuleDefinition

```typescript
export const tenantsModule: ModuleDefinition = {
  name: 'tenants',
  dependencies: ['config'],
  description: 'Multi-tenant identity module with slim identity table and config-driven operational settings',
  capabilities: [
    'create tenants',
    'manage tenant members',
    'resolve tenant by slug',
    'check business hours',
  ],
  schema: tenantsSchema,
  seed: seedTenants,
  resources: [
    { name: 'tenants',        options: { label: 'Tenants' } },
    { name: 'tenant-members', options: { label: 'Tenant Members' } },
  ],
  menuItems: [{ label: 'Tenants', to: '/tenants' }],
  apiHandlers: { /* see api.md for full map */ },
  configSchema: [ /* see below */ ],
  events: { emits: [...], schemas: eventSchemas },
  chat: { description, capabilities, actionSchemas: [...] },
};
```

## Package shape

```
packages/module-tenants/
  package.json                   name: "@oven/module-tenants"
  tsconfig.json
  vitest.config.ts               (to be added in sprint-02)
  src/
    index.ts                     ModuleDefinition + public re-exports
    schema.ts                    Drizzle tables
    seed.ts                      permissions + public endpoint
    types.ts                     Tenant, TenantMember, etc.
    utils.ts                     computeBusinessHours
    api/
      tenants.handler.ts
      tenants-by-id.handler.ts
      tenants-by-slug.handler.ts
      tenants-public.handler.ts
      tenant-members.handler.ts
      tenant-members-by-id.handler.ts
      tenants-business-hours.handler.ts
    __tests__/                   (to be added in sprint-02)
      compute-business-hours.test.ts
      seed.test.ts
```

## Types (exported)

```typescript
export type TenantRole = 'owner' | 'admin' | 'member';

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  enabled: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantMember {
  id: number;
  tenantId: number;
  userId: number;
  role: TenantRole;
  createdAt: Date;
  updatedAt: Date;
}
```

`TenantRole` is the authoritative enum. Handlers validate incoming
`role` strings against it before insert.

## configSchema

Fifteen entries — all `instanceScoped: true`. Grouped by purpose:

### Business identity

| Key | Type | Default | Scope |
|---|---|---|---|
| `NIT` | string | `null` | instance |
| `BUSINESS_NAME` | string | `null` | instance |
| `LOGO` | string | `null` | instance |

### Localization

| Key | Type | Default | Scope |
|---|---|---|---|
| `TIMEZONE` | string | `"America/Bogota"` | instance |
| `LOCALE` | string | `"es"` | instance |

### Schedule

| Key | Type | Default | Scope |
|---|---|---|---|
| `SCHEDULE` | json | `null` | instance |

### Services & payments

| Key | Type | Default | Scope |
|---|---|---|---|
| `AUTHORIZED_SERVICES` | json | `[]` | instance |
| `PAYMENT_METHODS` | json | `[]` | instance |

### Communication

| Key | Type | Default | Scope |
|---|---|---|---|
| `TONE` | string | `"friendly"` | instance |
| `HUMAN_CONTACT_INFO` | json | `null` | instance |
| `EMERGENCY_INSTRUCTIONS` | string | `null` | instance |
| `SCHEDULING_URL` | string | `null` | instance |
| `WELCOME_MESSAGE_BUSINESS_HOURS` | string | `null` | instance |
| `WELCOME_MESSAGE_OUT_OF_HOURS` | string | `null` | instance |

### Platform defaults

| Key | Type | Default | Scope |
|---|---|---|---|
| `MAX_MEMBERS_PER_TENANT` | number | `50` | instance |

## Events

All five events are emitted on the registry event bus after DB commit.
Schemas are declared as a single `EventSchemaMap` object in `src/index.ts`:

```typescript
'tenants.tenant.created':  { id, name, slug }
'tenants.tenant.updated':  { id, name, slug }
'tenants.tenant.deleted':  { id, slug }
'tenants.member.added':    { tenantId, userId, role }
'tenants.member.removed':  { tenantId, userId }
```

Downstream consumers:

- `module-ai` listens to `tenants.tenant.deleted` to tombstone vector
  store rows.
- `module-knowledge-base` listens to the same to clear embedded entries
  for the tenant.
- `module-notifications` listens to `tenants.member.added` to provision
  a default notification channel for the new member.
- `module-subscriptions` listens to `tenants.tenant.created` to attach
  the free-tier billing plan.
- `module-config` listens to `tenants.tenant.deleted` to delete all
  tenant-scoped config rows.

## Chat block

```typescript
chat: {
  description: 'Multi-tenant identity module. ...',
  capabilities: [
    'list tenants',
    'get tenant config',
    'check business hours',
    'manage members',
  ],
  actionSchemas: [
    { name: 'tenants.list',              endpoint: { GET,  'tenants' } },
    { name: 'tenants.getPublic',         endpoint: { GET,  'tenants/[slug]/public' } },
    { name: 'tenants.checkBusinessHours',endpoint: { GET,  'tenants/[id]/business-hours' } },
  ],
}
```

The chat block is what the MCP server discovery endpoint scrapes. Any
change here affects every chat agent — treat as a public API.

## Error return conventions

Handlers use:

```typescript
import {
  parseListParams,
  listResponse,
  badRequest,
  notFound,
  conflict,
  unauthorized,
  forbidden,
} from '@oven/module-registry/api-utils';
```

No raw `NextResponse.json({ error: ... }, { status: 400 })` — always
go through the helpers so error envelopes stay consistent.

## Registration order in `modules.ts`

```typescript
registry.register(configModule);       // phase 0
registry.register(tenantsModule);      // phase 0 — depends on config
registry.register(subscriptionsModule);// phase 0 — depends on tenants
registry.register(authModule);         // phase 1 — depends on tenants
registry.register(filesModule);        // phase 1 — depends on tenants
// ...
```

The `dependencies: ['config']` declaration in `tenantsModule` makes the
registry throw at registration time if `configModule` is missing.

## Open design questions

1. **Tenant soft-delete cascade**. Today `DELETE /api/tenants/[id]`
   sets `enabled = false` but does not touch `tenant_members`,
   `module_configs`, or subscription rows. Consumer modules listen to
   `tenants.tenant.deleted` and do their own cleanup. Is this the
   right tradeoff, or should the tenants package fire a coordinated
   cascade? Tracked as sprint-04 discussion.

2. **RLS policy rollout**. Enabling RLS will require every caller to
   set `app.role` and `app.tenant_ids` session GUCs. Which middleware
   owns that? (Likely `module-auth` — tracked as a cross-module sprint
   once both modules are implemented.)

3. **`role` as enum vs varchar**. Today `role` is a 50-char varchar.
   Migrating to a Postgres ENUM would enforce values at the DB level
   but introduces a schema migration every time a role is added. Ship
   the handler-level validator for now; revisit if a user tries to add
   a new role and discovers it took ten steps.

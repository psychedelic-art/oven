# Module: Config

> **Package**: `packages/module-config/`
> **Name**: `@oven/module-config`
> **Dependencies**: `module-registry`
> **Status**: Planned

---

## 1. Overview

Config is the **platform-wide configuration store** that provides a tenant-aware, cascading key-value system for all modules. It replaces the config subsystem previously embedded in `module-workflows` and elevates it to a standalone, shared module that every other module can consume.

Every module that needs tenant-customizable settings (tone, schedule, API keys, thresholds, templates) declares them in its `configSchema` and reads/writes them through module-config's API. This eliminates the need for modules to define their own config columns or JSONB blobs for tenant-varying data.

### Key Design Decisions

- **Tenant-aware cascade**: Config entries are scoped per tenant via a nullable `tenantId` column. Platform-global defaults coexist with tenant-specific overrides in the same table.
- **5-tier resolution**: instance override (tenant) > module default (tenant) > instance override (platform) > module default (platform) > schema default (code).
- **RLS-protected**: Row Level Security ensures tenants can only read/write their own config entries while still reading platform-global defaults.
- **Batch resolution**: A batch-resolve endpoint enables efficient multi-key lookups (e.g., the public tenant config endpoint resolves 14 keys in one call).

---

## 2. Core Concepts

### Config Entry
A single key-value pair stored in the `module_configs` table. Identified by the tuple `(tenantId, moduleName, scope, scopeId, key)`. The value is JSONB and can hold any JSON type (string, number, boolean, object, array).

### Scope
Determines the specificity of a config entry:
- **`module`** — A default for the entire module (or for the module within a specific tenant). `scopeId` is null.
- **`instance`** — An override for a specific entity instance (e.g., a specific workflow, agent, or channel). `scopeId` identifies the instance.

### Tenant Scoping
- **`tenantId = NULL`** — Platform-global config. Visible to all tenants as a fallback.
- **`tenantId = N`** — Tenant-specific config. Only visible to tenant N (enforced by RLS).

### Cascade Resolution
The resolve endpoint walks a 5-tier priority chain to find the most specific value for a given key. See Section 5 for the full algorithm.

### Config Schema
Each module declares its configurable settings in `configSchema[]`. This serves as:
- The source of schema defaults (tier 5 in the cascade)
- A discovery mechanism for the dashboard config UI
- Documentation for agents reading config via workflow nodes

---

## 3. Database Schema

### Tables

**`module_configs`** — Configuration entries (moved from `module-workflows`, enhanced with `tenantId`)
```typescript
export const moduleConfigs = pgTable('module_configs', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id'),                                         // null = platform-global, non-null = tenant-scoped
  moduleName: varchar('module_name', { length: 64 }).notNull(),
  scope: varchar('scope', { length: 32 }).notNull().default('module'),    // 'module' | 'instance'
  scopeId: varchar('scope_id', { length: 128 }),                          // null for module scope, entity ID for instance scope
  key: varchar('key', { length: 128 }).notNull(),
  value: jsonb('value').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('module_configs_tenant_idx').on(table.tenantId),
  index('module_configs_module_idx').on(table.moduleName),
  index('module_configs_lookup_idx').on(table.moduleName, table.key),
  index('module_configs_tenant_module_idx').on(table.tenantId, table.moduleName),
]);
```

**Unique constraint** — PostgreSQL treats `NULL != NULL` in standard unique constraints, so we use a `COALESCE`-based unique index to prevent duplicate platform-global entries:

```sql
CREATE UNIQUE INDEX module_configs_unique ON module_configs (
  COALESCE(tenant_id, 0), module_name, scope, COALESCE(scope_id, ''), key
);
```

### Migration from module-workflows

The `module_configs` table already exists (created by `module-workflows`). The migration:

```sql
-- Step 1: Add nullable tenantId column
ALTER TABLE module_configs ADD COLUMN tenant_id INTEGER;

-- Step 2: Create new indexes
CREATE INDEX module_configs_tenant_idx ON module_configs(tenant_id);
CREATE INDEX module_configs_tenant_module_idx ON module_configs(tenant_id, module_name);

-- Step 3: Replace unique constraint with tenant-aware version
ALTER TABLE module_configs DROP CONSTRAINT module_configs_unique;
CREATE UNIQUE INDEX module_configs_unique ON module_configs (
  COALESCE(tenant_id, 0), module_name, scope, COALESCE(scope_id, ''), key
);
```

All existing rows remain valid with `tenant_id = NULL` (platform-global).

---

## 4. API Endpoints

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| GET/POST | `/api/module-configs` | List and upsert config entries | Authenticated |
| GET/PUT/DELETE | `/api/module-configs/[id]` | Single config entry CRUD | Authenticated |
| GET | `/api/module-configs/resolve` | Resolve a single key via 5-tier cascade | Authenticated |
| GET | `/api/module-configs/resolve-batch` | Resolve multiple keys in one call | Authenticated |

### Query Parameters

**List** (`GET /api/module-configs`):
- `filter[moduleName]` — Filter by module
- `filter[scope]` — Filter by scope (`module` | `instance`)
- `filter[key]` — Filter by key
- `filter[tenantId]` — Filter by tenant (admin only; regular users auto-filtered by RLS)

**Resolve** (`GET /api/module-configs/resolve`):
- `moduleName` (required) — Module name
- `key` (required) — Config key
- `tenantId` (optional) — Tenant ID for tenant-scoped resolution
- `scopeId` (optional) — Instance ID for instance-scoped resolution

**Batch Resolve** (`GET /api/module-configs/resolve-batch`):
- `moduleName` (required) — Module name
- `keys` (required) — Comma-separated list of keys
- `tenantId` (optional) — Tenant ID

### Upsert Semantics

The `POST /api/module-configs` endpoint uses upsert logic: if an entry with matching `(tenantId, moduleName, scope, scopeId, key)` exists, it updates the value. Otherwise, it creates a new entry.

---

## 5. Cascade Resolution Algorithm

```
resolve(moduleName, key, tenantId?, scopeId?):

  // Tier 1: Tenant-scoped instance override
  if tenantId AND scopeId:
    row = SELECT FROM module_configs
      WHERE tenant_id = tenantId AND module_name = moduleName
        AND scope = 'instance' AND scope_id = scopeId AND key = key
    if row → return { value: row.value, source: 'tenant-instance' }

  // Tier 2: Tenant-scoped module default
  if tenantId:
    row = SELECT FROM module_configs
      WHERE tenant_id = tenantId AND module_name = moduleName
        AND scope = 'module' AND scope_id IS NULL AND key = key
    if row → return { value: row.value, source: 'tenant-module' }

  // Tier 3: Platform instance override
  if scopeId:
    row = SELECT FROM module_configs
      WHERE tenant_id IS NULL AND module_name = moduleName
        AND scope = 'instance' AND scope_id = scopeId AND key = key
    if row → return { value: row.value, source: 'platform-instance' }

  // Tier 4: Platform module default
  row = SELECT FROM module_configs
    WHERE tenant_id IS NULL AND module_name = moduleName
      AND scope = 'module' AND scope_id IS NULL AND key = key
  if row → return { value: row.value, source: 'platform-module' }

  // Tier 5: Schema default from code
  mod = registry.getModule(moduleName)
  entry = mod.configSchema.find(e => e.key === key)
  if entry → return { value: entry.defaultValue, source: 'schema' }

  // Not found
  return { value: null, source: 'default' }
```

### Batch Resolve Response

```json
{
  "results": {
    "SCHEDULE": { "value": { "monday": { "open": "08:00", "close": "18:00" } }, "source": "tenant-module" },
    "TIMEZONE": { "value": "America/Bogota", "source": "schema" },
    "TONE": { "value": "friendly", "source": "tenant-module" }
  }
}
```

---

## 6. RLS Design

```sql
ALTER TABLE module_configs ENABLE ROW LEVEL SECURITY;

-- Superadmins: full access to all config entries
CREATE POLICY module_configs_admin ON module_configs
  FOR ALL
  USING (current_setting('app.current_role', true) = 'superadmin');

-- Tenants: read their own config + platform-global configs
CREATE POLICY module_configs_tenant_read ON module_configs
  FOR SELECT
  USING (
    tenant_id IS NULL
    OR tenant_id = current_setting('app.current_tenant_id', true)::int
  );

-- Tenants: create only their own tenant-scoped configs
CREATE POLICY module_configs_tenant_write ON module_configs
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::int);

-- Tenants: update only their own tenant-scoped configs
CREATE POLICY module_configs_tenant_update ON module_configs
  FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::int);

-- Tenants: delete only their own tenant-scoped configs
CREATE POLICY module_configs_tenant_delete ON module_configs
  FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::int);
```

### RLS Context Variables

The following Postgres session variables must be set by the auth middleware before queries:
- `app.current_tenant_id` — The authenticated user's active tenant ID
- `app.current_role` — The authenticated user's role (e.g., `superadmin`, `admin`, `member`)

---

## 7. Dashboard UI

### React Admin Resources

- **Module Configs** — List, Create, Edit
  - List: Datagrid with moduleName, key, scope, scopeId, tenantId (if admin), value (truncated), description
  - Create: Form with moduleName (dropdown of registered modules), key, scope, scopeId, value (JSON editor), description
  - Edit: Same as create, pre-populated

### Files to Create

```
apps/dashboard/src/components/module-configs/
  ModuleConfigList.tsx         — Filterable by module, scope, tenant
  ModuleConfigCreate.tsx       — Module selector + key + value JSON editor
  ModuleConfigEdit.tsx         — Same as create, pre-populated
```

### Menu Section

```
──── Platform ────
Module Configs
```

---

## 8. Events

| Event | Payload |
|-------|---------|
| `config.entry.created` | id, tenantId, moduleName, key, scope, scopeId |
| `config.entry.updated` | id, tenantId, moduleName, key, oldValue, newValue |
| `config.entry.deleted` | id, tenantId, moduleName, key |

---

## 9. Integration Points

| Module | Integration |
|--------|-------------|
| **module-tenants** | Tenant operational config (schedule, tone, business name, etc.) stored as config entries |
| **module-subscriptions** | Provider credentials stored as tenant-scoped config entries |
| **module-notifications** | Channel-specific config (API versions, thresholds) via config cascade |
| **module-knowledge-base** | Embedding model, max entries, and other KB settings via config |
| **module-agent-core** | Agent default settings resolved per tenant |
| **module-workflows** | Workflow execution settings; module-workflows previously owned this table |
| **module-ai** | AI provider settings (model, temperature) per tenant via config |
| **All modules** | Every module's `configSchema` settings are stored and resolved through this module |

---

## 10. Impact on module-workflows

When implemented (Sprint 2), the following changes apply to `packages/module-workflows/`:

### schema.ts
- Remove `moduleConfigs` table definition (lines 105-143)
- Remove `moduleConfigs` from `workflowsSchema` export
- Schema export becomes: `{ workflows, workflowExecutions, nodeExecutions, workflowVersions }`

### index.ts
- Remove imports: `module-configs.handler`, `module-configs-by-id.handler`, `module-configs-resolve.handler`
- Remove API routes: `'module-configs'`, `'module-configs/[id]'`, `'module-configs/resolve'`
- Remove resource: `{ name: 'module-configs', ... }`
- Remove menu item: `{ label: 'Configs', ... }`
- Add: `dependencies: ['config']`

### apps/dashboard/src/lib/modules.ts
- Add: `import { configModule } from '@oven/module-config';`
- Register before workflows: `registry.register(configModule);`

---

## 11. ModuleDefinition

```typescript
export const configModule: ModuleDefinition = {
  name: 'config',
  dependencies: [],
  description: 'Platform-wide configuration store with tenant-aware 5-tier cascade resolution',
  capabilities: [
    'store module config entries',
    'resolve config with cascade',
    'batch resolve multiple keys',
    'tenant-scoped config isolation',
  ],
  schema: { moduleConfigs },
  seed: seedConfig,
  resources: [
    {
      name: 'module-configs',
      list: ModuleConfigList,
      create: ModuleConfigCreate,
      edit: ModuleConfigEdit,
      icon: SettingsIcon,
      options: { label: 'Module Configs' },
    },
  ],
  menuItems: [
    { label: 'Configs', to: '/module-configs' },
  ],
  apiHandlers: {
    'module-configs': { GET: listModuleConfigs, POST: upsertModuleConfig },
    'module-configs/[id]': { GET: getModuleConfig, PUT: updateModuleConfig, DELETE: deleteModuleConfig },
    'module-configs/resolve': { GET: resolveConfig },
    'module-configs/resolve-batch': { GET: resolveBatchConfig },
  },
  configSchema: [],
  events: {
    emits: [
      'config.entry.created',
      'config.entry.updated',
      'config.entry.deleted',
    ],
    schemas: {
      'config.entry.created': {
        id: { type: 'number', description: 'Config entry DB ID', required: true },
        tenantId: { type: 'number', description: 'Tenant ID (null for platform-global)' },
        moduleName: { type: 'string', description: 'Module name', required: true },
        key: { type: 'string', description: 'Config key', required: true },
        scope: { type: 'string', description: 'Config scope (module/instance)' },
        scopeId: { type: 'string', description: 'Instance scope ID' },
      },
      'config.entry.updated': {
        id: { type: 'number', description: 'Config entry DB ID', required: true },
        tenantId: { type: 'number', description: 'Tenant ID (null for platform-global)' },
        moduleName: { type: 'string', description: 'Module name', required: true },
        key: { type: 'string', description: 'Config key', required: true },
        oldValue: { type: 'any', description: 'Previous value' },
        newValue: { type: 'any', description: 'New value' },
      },
      'config.entry.deleted': {
        id: { type: 'number', description: 'Config entry DB ID', required: true },
        tenantId: { type: 'number', description: 'Tenant ID (null for platform-global)' },
        moduleName: { type: 'string', description: 'Module name', required: true },
        key: { type: 'string', description: 'Config key', required: true },
      },
    },
  },
  chat: {
    description: 'Platform-wide configuration store. Manages module settings with a 5-tier tenant-aware cascade: tenant instance > tenant module > platform instance > platform module > schema default.',
    capabilities: [
      'list config entries',
      'resolve config value',
      'batch resolve config values',
      'update config entry',
    ],
    actionSchemas: [
      {
        name: 'config.resolve',
        description: 'Resolve a config value using the 5-tier cascade',
        parameters: {
          moduleName: { type: 'string', description: 'Module name', required: true },
          key: { type: 'string', description: 'Config key', required: true },
          tenantId: { type: 'number', description: 'Tenant ID for tenant-scoped resolution' },
          scopeId: { type: 'string', description: 'Instance ID for instance-scoped resolution' },
        },
        returns: { value: { type: 'any' }, source: { type: 'string' } },
        requiredPermissions: ['module-configs.read'],
        endpoint: { method: 'GET', path: 'module-configs/resolve' },
      },
      {
        name: 'config.resolveBatch',
        description: 'Resolve multiple config values in one call',
        parameters: {
          moduleName: { type: 'string', description: 'Module name', required: true },
          keys: { type: 'string', description: 'Comma-separated config keys', required: true },
          tenantId: { type: 'number', description: 'Tenant ID for tenant-scoped resolution' },
        },
        returns: { results: { type: 'object' } },
        requiredPermissions: ['module-configs.read'],
        endpoint: { method: 'GET', path: 'module-configs/resolve-batch' },
      },
      {
        name: 'config.list',
        description: 'List config entries with filtering',
        parameters: {
          moduleName: { type: 'string', description: 'Filter by module' },
          scope: { type: 'string', description: 'Filter by scope' },
          tenantId: { type: 'number', description: 'Filter by tenant' },
        },
        returns: { data: { type: 'array' }, total: { type: 'number' } },
        requiredPermissions: ['module-configs.read'],
        endpoint: { method: 'GET', path: 'module-configs' },
      },
    ],
  },
};
```

---

## 12. Seed Data

```typescript
export async function seedConfig(db: any) {
  const modulePermissions = [
    { resource: 'module-configs', action: 'read', slug: 'module-configs.read', description: 'View config entries' },
    { resource: 'module-configs', action: 'create', slug: 'module-configs.create', description: 'Create config entries' },
    { resource: 'module-configs', action: 'update', slug: 'module-configs.update', description: 'Edit config entries' },
    { resource: 'module-configs', action: 'delete', slug: 'module-configs.delete', description: 'Delete config entries' },
  ];

  for (const perm of modulePermissions) {
    await db.insert(permissions).values(perm).onConflictDoNothing();
  }
}
```

---

## Module Rules Compliance

> Added per [`module-rules.md`](../module-rules.md) — 7 required items.

### A. Schema Updates — tenantId + Indexes

The `module_configs` table has an optional `tenantId` column (nullable — platform-global entries have `tenantId = NULL`):

```typescript
tenantId: integer('tenant_id'),
// ...
}, (table) => [
  index('module_configs_tenant_idx').on(table.tenantId),
  index('module_configs_module_idx').on(table.moduleName),
  index('module_configs_lookup_idx').on(table.moduleName, table.key),
  index('module_configs_tenant_module_idx').on(table.tenantId, table.moduleName),
]);
```

### B. Chat Block

See Section 11 — full `chat` block with description, capabilities, and 3 actionSchemas (resolve, resolveBatch, list).

### C. configSchema

This module has no config settings of its own (empty `configSchema: []`). It is the config store for all other modules.

### D. Typed Event Schemas

See Section 11 — 3 events (`config.entry.created`, `config.entry.updated`, `config.entry.deleted`) with full typed schemas.

### E. Seed Function

See Section 12 — idempotent seed function that registers 4 CRUD permissions.

### F. API Handler Example

```typescript
// GET /api/module-configs/resolve — Cascade resolution handler
import { NextRequest, NextResponse } from 'next/server';
import { eq, and, isNull } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { registry } from '@oven/module-registry';
import { badRequest } from '@oven/module-registry/api-utils';
import { moduleConfigs } from '../schema';

export async function GET(request: NextRequest) {
  const db = getDb();
  const url = request.nextUrl;
  const moduleName = url.searchParams.get('moduleName');
  const key = url.searchParams.get('key');
  const tenantId = url.searchParams.get('tenantId');
  const scopeId = url.searchParams.get('scopeId');

  if (!moduleName || !key) {
    return badRequest('moduleName and key are required');
  }

  const tenantIdNum = tenantId ? parseInt(tenantId, 10) : null;

  // Tier 1: Tenant instance override
  if (tenantIdNum && scopeId) {
    const [row] = await db.select().from(moduleConfigs).where(
      and(
        eq(moduleConfigs.tenantId, tenantIdNum),
        eq(moduleConfigs.moduleName, moduleName),
        eq(moduleConfigs.scope, 'instance'),
        eq(moduleConfigs.scopeId, scopeId),
        eq(moduleConfigs.key, key)
      )
    ).limit(1);
    if (row) return NextResponse.json({ key, value: row.value, source: 'tenant-instance', tenantId: tenantIdNum, scopeId });
  }

  // Tier 2: Tenant module default
  if (tenantIdNum) {
    const [row] = await db.select().from(moduleConfigs).where(
      and(
        eq(moduleConfigs.tenantId, tenantIdNum),
        eq(moduleConfigs.moduleName, moduleName),
        eq(moduleConfigs.scope, 'module'),
        isNull(moduleConfigs.scopeId),
        eq(moduleConfigs.key, key)
      )
    ).limit(1);
    if (row) return NextResponse.json({ key, value: row.value, source: 'tenant-module', tenantId: tenantIdNum, scopeId: null });
  }

  // Tier 3: Platform instance override
  if (scopeId) {
    const [row] = await db.select().from(moduleConfigs).where(
      and(
        isNull(moduleConfigs.tenantId),
        eq(moduleConfigs.moduleName, moduleName),
        eq(moduleConfigs.scope, 'instance'),
        eq(moduleConfigs.scopeId, scopeId),
        eq(moduleConfigs.key, key)
      )
    ).limit(1);
    if (row) return NextResponse.json({ key, value: row.value, source: 'platform-instance', tenantId: null, scopeId });
  }

  // Tier 4: Platform module default
  const [platformRow] = await db.select().from(moduleConfigs).where(
    and(
      isNull(moduleConfigs.tenantId),
      eq(moduleConfigs.moduleName, moduleName),
      eq(moduleConfigs.scope, 'module'),
      isNull(moduleConfigs.scopeId),
      eq(moduleConfigs.key, key)
    )
  ).limit(1);
  if (platformRow) return NextResponse.json({ key, value: platformRow.value, source: 'platform-module', tenantId: null, scopeId: null });

  // Tier 5: Schema default
  const mod = registry.getModule(moduleName);
  if (mod?.configSchema) {
    const entry = mod.configSchema.find((e) => e.key === key);
    if (entry) return NextResponse.json({ key, value: entry.defaultValue, source: 'schema', tenantId: null, scopeId: null });
  }

  return NextResponse.json({ key, value: null, source: 'default', tenantId: null, scopeId: null });
}
```

---

## See Also

- [Admin Use Cases](../use-cases.md) — cross-module workflow guide. Relevant use cases:
  - **UC 1**: Initial Platform Setup (Config + Subscriptions)
  - **UC 4**: Set Up Provider Credentials (Config + Subscriptions)
  - **UC 8**: Override Config for One Tenant (Config)
  - **UC 11**: Manage Platform Defaults (Config)
- [Module Tenants Spec](./13-tenants.md) — tenant identity and membership
- [Module Subscriptions Spec](./21-module-subscriptions.md) — billing plans and usage limits

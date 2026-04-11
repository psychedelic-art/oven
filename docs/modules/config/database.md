# Module Config -- Database

> Schema, indexes, constraints, and migration story for the `module_configs` table.
> See [`docs/modules/20-module-config.md`](../20-module-config.md) section 3 for the authoritative DDL.

---

## Tables

### `module_configs`

Single table -- every config entry, every module, every tenant.

```typescript
// packages/module-config/src/schema.ts
export const moduleConfigs = pgTable(
  'module_configs',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id'),                                // null = platform-global
    moduleName: varchar('module_name', { length: 64 }).notNull(),
    scope: varchar('scope', { length: 32 }).notNull().default('module'),
    scopeId: varchar('scope_id', { length: 128 }),                 // null for module scope
    key: varchar('key', { length: 128 }).notNull(),
    value: jsonb('value').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('module_configs_tenant_idx').on(table.tenantId),
    index('module_configs_module_idx').on(table.moduleName),
    index('module_configs_lookup_idx').on(table.moduleName, table.key),
    index('module_configs_tenant_module_idx').on(table.tenantId, table.moduleName),
  ]
);
```

### Column Semantics

| Column | Nullable | Purpose |
|--------|:--------:|---------|
| `id` | no | Surrogate PK. Never surfaces in business logic. |
| `tenant_id` | **yes** | `NULL` = platform-global. Non-null = tenant-scoped. A nullable FK-like column is required for the cascade to co-locate platform and tenant rows in the same table. |
| `module_name` | no | The registered module slug. Must match a registered module at runtime for tier-5 fallback to work. |
| `scope` | no | `module` (entity-wide) or `instance` (single entity). Default `module`. |
| `scope_id` | yes | Entity identifier when `scope='instance'`; `NULL` when `scope='module'`. |
| `key` | no | The setting key. Conventionally SCREAMING_SNAKE_CASE. |
| `value` | no | JSONB. Any JSON scalar, array, or object. |
| `description` | yes | Free-text hint shown in the dashboard edit form. |
| `created_at` / `updated_at` | no | Standard Rule 11 columns. |

### Why Nullable `tenant_id`

The cascade needs both platform-global and tenant-specific rows in the same
table (otherwise the resolver would need a `UNION ALL` across two tables).
A nullable column is the simplest expression. The downside is that
Postgres's standard unique constraint treats `NULL` as distinct, so we need
the COALESCE unique index below.

---

## Indexes

```sql
-- B-tree on tenant_id alone
CREATE INDEX module_configs_tenant_idx ON module_configs (tenant_id);

-- B-tree on module_name alone
CREATE INDEX module_configs_module_idx ON module_configs (module_name);

-- Composite lookup index (covers the most common cascade query shape)
CREATE INDEX module_configs_lookup_idx ON module_configs (module_name, key);

-- Composite tenant+module (covers tier-2 queries)
CREATE INDEX module_configs_tenant_module_idx ON module_configs (tenant_id, module_name);
```

### Unique Index (raw SQL migration -- sprint-03)

Postgres treats `NULL != NULL` in a normal `UNIQUE` constraint, so we
cannot use a straightforward unique constraint on
`(tenant_id, module_name, scope, scope_id, key)`. Instead:

```sql
CREATE UNIQUE INDEX module_configs_unique ON module_configs (
  COALESCE(tenant_id, 0),
  module_name,
  scope,
  COALESCE(scope_id, ''),
  key
);
```

This index is ADDed by the sprint-03 migration because Drizzle cannot
express COALESCE-based indexes natively.

---

## Foreign Keys

Rule 4.3: cross-module FKs are plain integers, never Drizzle `references()`.

- `tenant_id` points at `tenants.id` **logically** but the DB has no FK
  constraint. This matches every other tenant-scoped table in OVEN.
- `module_name` is a text field, not an FK. Module slugs are validated at
  the application layer (via `registry.getModule(name)`), not at the DB.

---

## Migration from `module-workflows`

The `module_configs` table currently exists in two places:

- `packages/module-workflows/src/schema.ts` -- historical owner
- `packages/module-config/src/schema.ts` -- new owner

They produce byte-identical DDL so the database is not double-migrated.
Sprint-03 removes the `module-workflows` copy and runs a one-time migration:

```sql
-- Step 1: Add nullable tenantId column (already added if both schemas have been run)
ALTER TABLE module_configs ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

-- Step 2: Create new indexes (idempotent)
CREATE INDEX IF NOT EXISTS module_configs_tenant_idx ON module_configs (tenant_id);
CREATE INDEX IF NOT EXISTS module_configs_tenant_module_idx ON module_configs (tenant_id, module_name);

-- Step 3: Replace any pre-existing unique constraint with the COALESCE version
ALTER TABLE module_configs DROP CONSTRAINT IF EXISTS module_configs_unique;
CREATE UNIQUE INDEX IF NOT EXISTS module_configs_unique ON module_configs (
  COALESCE(tenant_id, 0), module_name, scope, COALESCE(scope_id, ''), key
);
```

All existing rows remain valid with `tenant_id = NULL` (platform-global).

---

## RLS Policies (sprint-03)

See [`secure.md`](./secure.md) for the full policy text and threat model.
Summary:

1. `module_configs_admin` -- superadmins can do anything.
2. `module_configs_tenant_read` -- tenants can `SELECT` their own rows plus
   all platform-global (`tenant_id IS NULL`) rows.
3. `module_configs_tenant_write` (`INSERT`) -- tenants can only insert their
   own rows.
4. `module_configs_tenant_update` -- tenants can only update their own rows.
5. `module_configs_tenant_delete` -- tenants can only delete their own rows.

The policies read `current_setting('app.current_tenant_id', true)::int` and
`current_setting('app.current_role', true)`. The auth middleware
(`module-auth`) sets these vars before any query runs.

---

## Example Data

```sql
-- Platform-global default: notifications send limit
INSERT INTO module_configs (tenant_id, module_name, scope, key, value, description) VALUES
  (NULL, 'notifications', 'module', 'DAILY_SEND_LIMIT', '200'::jsonb, 'Default outbound cap'),
  (NULL, 'notifications', 'module', 'TIMEZONE',         '"America/Bogota"'::jsonb, 'Platform default TZ');

-- Tenant override: tenant 42 has a higher cap and a different timezone
INSERT INTO module_configs (tenant_id, module_name, scope, key, value) VALUES
  (42,  'notifications', 'module', 'DAILY_SEND_LIMIT', '500'::jsonb),
  (42,  'notifications', 'module', 'TIMEZONE',         '"America/Mexico_City"'::jsonb);

-- Instance override: tenant 42's "sede-norte" channel uses a different cap
INSERT INTO module_configs (tenant_id, module_name, scope, scope_id, key, value) VALUES
  (42,  'notifications', 'instance', 'channel:sede-norte', 'DAILY_SEND_LIMIT', '800'::jsonb);
```

A call to `/api/module-configs/resolve?moduleName=notifications&key=DAILY_SEND_LIMIT&tenantId=42&scopeId=channel:sede-norte`
returns `{ value: 800, source: 'tenant-instance' }`.

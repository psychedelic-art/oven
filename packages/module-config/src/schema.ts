import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

// ─── module_configs ─────────────────────────────────────────────
// Platform-wide configuration store with tenant-aware cascade.
// tenantId = NULL → platform-global entry.
// tenantId = N   → tenant-scoped entry (RLS enforced).
//
// Unique constraint uses COALESCE to handle NULLs:
//   CREATE UNIQUE INDEX module_configs_unique ON module_configs (
//     COALESCE(tenant_id, 0), module_name, scope, COALESCE(scope_id, ''), key
//   );
// This must be created via raw SQL migration since Drizzle can't
// express COALESCE-based unique indexes natively.

export const moduleConfigs = pgTable(
  'module_configs',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id'),
    moduleName: varchar('module_name', { length: 64 }).notNull(),
    scope: varchar('scope', { length: 32 }).notNull().default('module'),
    scopeId: varchar('scope_id', { length: 128 }),
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

// Export all schemas for registry composition
export const configSchema = {
  moduleConfigs,
};

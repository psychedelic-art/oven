import {
  pgTable,
  serial,
  integer,
  varchar,
  boolean,
  jsonb,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core';

// ─── tenants ────────────────────────────────────────────────────
// Slim identity table. All operational config lives in module-config.
export const tenants = pgTable(
  'tenants',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 128 }).notNull().unique(),
    enabled: boolean('enabled').notNull().default(true),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('tenants_slug_idx').on(table.slug),
    index('tenants_enabled_idx').on(table.enabled),
  ]
);

// ─── tenant_members ─────────────────────────────────────────────
// User-tenant associations with roles (owner, admin, member)
export const tenantMembers = pgTable(
  'tenant_members',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id').notNull(),
    userId: integer('user_id').notNull(),
    role: varchar('role', { length: 50 }).notNull().default('member'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('tm_tenant_id_idx').on(table.tenantId),
    index('tm_user_id_idx').on(table.userId),
    unique('tm_tenant_user').on(table.tenantId, table.userId),
  ]
);

// Export all schemas for registry composition
export const tenantsSchema = {
  tenants,
  tenantMembers,
};

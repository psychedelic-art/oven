import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
  unique,
} from 'drizzle-orm/pg-core';

// ─── hierarchy_nodes ─────────────────────────────────────────────
// Flexible tree structure for companies, groups, teams, departments.
// Self-referencing parentId enables unlimited depth hierarchy.
// RLS policies attached to a node are inherited by all descendants.
export const hierarchyNodes = pgTable(
  'hierarchy_nodes',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 128 }).notNull(),
    type: varchar('type', { length: 64 }).notNull().default('group'),
    // 'company', 'group', 'team', 'department' — freeform

    // Self-referencing FK for tree structure
    parentId: integer('parent_id'),

    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('hierarchy_nodes_parent_id_idx').on(table.parentId),
    unique('hierarchy_nodes_name_parent_unique').on(table.name, table.parentId),
  ]
);

// ─── roles ────────────────────────────────────────────────────────
// Role definitions (admin, player, moderator, etc.).
// Optionally scoped to a hierarchy node (e.g., "Admin of Acme Corp").
export const roles = pgTable(
  'roles',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 128 }).notNull(),
    slug: varchar('slug', { length: 128 }).notNull().unique(),
    description: text('description'),

    // Optional: scope this role to a hierarchy node
    hierarchyNodeId: integer('hierarchy_node_id'),

    isSystem: boolean('is_system').notNull().default(false),
    enabled: boolean('enabled').notNull().default(true),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('roles_slug_idx').on(table.slug),
    index('roles_hierarchy_node_id_idx').on(table.hierarchyNodeId),
  ]
);

// ─── permissions ──────────────────────────────────────────────────
// Granular permissions following the resource.action pattern.
// e.g., "players.create", "maps.read", "sessions.delete"
export const permissions = pgTable(
  'permissions',
  {
    id: serial('id').primaryKey(),
    resource: varchar('resource', { length: 128 }).notNull(),
    action: varchar('action', { length: 64 }).notNull(),
    // 'create', 'read', 'update', 'delete', 'execute', 'manage'

    slug: varchar('slug', { length: 256 }).notNull().unique(),
    // Format: "resource.action" — e.g., "players.create"

    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('permissions_resource_action_unique').on(table.resource, table.action),
  ]
);

// ─── role_permissions ─────────────────────────────────────────────
// Many-to-many mapping between roles and permissions.
export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: serial('id').primaryKey(),
    roleId: integer('role_id').notNull(),
    permissionId: integer('permission_id').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('role_permissions_unique').on(table.roleId, table.permissionId),
    index('role_permissions_role_id_idx').on(table.roleId),
    index('role_permissions_permission_id_idx').on(table.permissionId),
  ]
);

// ─── rls_policies ─────────────────────────────────────────────────
// RLS policy definitions stored as JSON (from visual builder).
// Can be compiled to actual Postgres RLS policies and applied.
export const rlsPolicies = pgTable(
  'rls_policies',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 128 }).notNull(),
    slug: varchar('slug', { length: 128 }).notNull().unique(),
    description: text('description'),

    // Target table for the RLS policy
    targetTable: varchar('target_table', { length: 128 }).notNull(),

    // SQL command scope
    command: varchar('command', { length: 16 }).notNull().default('ALL'),
    // 'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL'

    // Visual builder definition (nodes + edges JSON from ReactFlow)
    definition: jsonb('definition').notNull(),

    // Generated SQL from the compiler
    compiledSql: text('compiled_sql'),

    // Scope: which role or hierarchy node this applies to
    roleId: integer('role_id'),
    hierarchyNodeId: integer('hierarchy_node_id'),

    status: varchar('status', { length: 32 }).notNull().default('draft'),
    // 'draft', 'applied', 'disabled'

    version: integer('version').notNull().default(1),
    enabled: boolean('enabled').notNull().default(true),

    appliedAt: timestamp('applied_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('rls_policies_slug_idx').on(table.slug),
    index('rls_policies_target_table_idx').on(table.targetTable),
    index('rls_policies_role_id_idx').on(table.roleId),
    index('rls_policies_status_idx').on(table.status),
  ]
);

// ─── rls_policy_versions ──────────────────────────────────────────
// Version history for RLS policy definitions. Created on each save.
export const rlsPolicyVersions = pgTable(
  'rls_policy_versions',
  {
    id: serial('id').primaryKey(),
    policyId: integer('policy_id').notNull(),
    version: integer('version').notNull(),
    definition: jsonb('definition').notNull(),
    compiledSql: text('compiled_sql'),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('rls_pv_policy_id_idx').on(table.policyId),
    unique('rls_pv_unique').on(table.policyId, table.version),
  ]
);

// ─── api_endpoint_permissions ────────────────────────────────────
// Maps discovered API endpoints to required permissions.
// Populated by scanning the module registry + manual assignment.
export const apiEndpointPermissions = pgTable(
  'api_endpoint_permissions',
  {
    id: serial('id').primaryKey(),
    module: varchar('module', { length: 64 }).notNull(),
    route: varchar('route', { length: 256 }).notNull(),
    method: varchar('method', { length: 16 }).notNull(),
    // 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'

    permissionId: integer('permission_id'),
    isPublic: boolean('is_public').notNull().default(false),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    unique('api_endpoint_permissions_unique').on(table.module, table.route, table.method),
    index('api_ep_module_idx').on(table.module),
    index('api_ep_permission_id_idx').on(table.permissionId),
  ]
);

// Export schema for registry composition
export const rolesSchema = {
  hierarchyNodes,
  roles,
  permissions,
  rolePermissions,
  rlsPolicies,
  rlsPolicyVersions,
  apiEndpointPermissions,
};

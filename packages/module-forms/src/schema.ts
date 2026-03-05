import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  jsonb,
  timestamp,
  boolean,
  index,
  unique,
} from 'drizzle-orm/pg-core';

// ─── forms ──────────────────────────────────────────────────────
// Core form definitions with versioned JSON schema definitions,
// data-layer and business-layer configuration.

export const forms = pgTable(
  'forms',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    description: text('description'),
    definition: jsonb('definition'),
    dataLayerConfig: jsonb('data_layer_config'),
    businessLayerConfig: jsonb('business_layer_config'),
    version: integer('version').default(1).notNull(),
    status: varchar('status', { length: 50 }).default('draft').notNull(),
    createdBy: integer('created_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('forms_tenant_id_idx').on(table.tenantId),
    index('forms_slug_idx').on(table.slug),
    index('forms_status_idx').on(table.status),
    index('forms_created_by_idx').on(table.createdBy),
  ]
);

// ─── form_versions ──────────────────────────────────────────────
// Immutable snapshots of form definitions per version number.

export const formVersions = pgTable(
  'form_versions',
  {
    id: serial('id').primaryKey(),
    formId: integer('form_id').notNull(),
    version: integer('version').notNull(),
    definition: jsonb('definition'),
    dataLayerConfig: jsonb('data_layer_config'),
    businessLayerConfig: jsonb('business_layer_config'),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('fv_form_id_idx').on(table.formId),
    unique('fv_unique').on(table.formId, table.version),
  ]
);

// ─── form_components ────────────────────────────────────────────
// Reusable UI components with data contracts and default props.

export const formComponents = pgTable(
  'form_components',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id'),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    category: varchar('category', { length: 100 }).notNull(),
    description: text('description'),
    definition: jsonb('definition'),
    defaultProps: jsonb('default_props'),
    dataContract: jsonb('data_contract'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('fc_tenant_id_idx').on(table.tenantId),
    index('fc_slug_idx').on(table.slug),
    index('fc_category_idx').on(table.category),
  ]
);

// ─── form_data_sources ──────────────────────────────────────────
// External or internal data source bindings for form fields.

export const formDataSources = pgTable(
  'form_data_sources',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id'),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    formId: integer('form_id'),
    type: varchar('type', { length: 50 }).notNull(),
    config: jsonb('config'),
    outputSchema: jsonb('output_schema'),
    cachingPolicy: varchar('caching_policy', { length: 50 }).default('none'),
    ttlSeconds: integer('ttl_seconds'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('fds_tenant_id_idx').on(table.tenantId),
    index('fds_form_id_idx').on(table.formId),
    index('fds_slug_idx').on(table.slug),
  ]
);

// ─── form_submissions ───────────────────────────────────────────
// Captured form submission data with version tracking.

export const formSubmissions = pgTable(
  'form_submissions',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id').notNull(),
    formId: integer('form_id').notNull(),
    formVersion: integer('form_version'),
    data: jsonb('data'),
    submittedBy: integer('submitted_by'),
    submittedAt: timestamp('submitted_at').defaultNow().notNull(),
    metadata: jsonb('metadata'),
  },
  (table) => [
    index('fsub_tenant_id_idx').on(table.tenantId),
    index('fsub_form_id_idx').on(table.formId),
    index('fsub_submitted_by_idx').on(table.submittedBy),
  ]
);

// Export all schemas for registry composition
export const formsSchema = {
  forms,
  formVersions,
  formComponents,
  formDataSources,
  formSubmissions,
};

import { pgTable, serial, integer, varchar, text, jsonb, timestamp, boolean, index, unique } from 'drizzle-orm/pg-core';

export const uiFlows = pgTable('ui_flows', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  description: text('description'),
  definition: jsonb('definition').notNull(),
  themeConfig: jsonb('theme_config'),
  domainConfig: jsonb('domain_config'),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  version: integer('version').notNull().default(1),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('ui_flows_tenant_id_idx').on(table.tenantId),
  index('ui_flows_slug_idx').on(table.slug),
  index('ui_flows_status_idx').on(table.status),
]);

export const uiFlowVersions = pgTable('ui_flow_versions', {
  id: serial('id').primaryKey(),
  uiFlowId: integer('ui_flow_id').notNull(),
  version: integer('version').notNull(),
  definition: jsonb('definition').notNull(),
  themeConfig: jsonb('theme_config'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('ui_fv_flow_id_idx').on(table.uiFlowId),
  unique('ui_fv_unique').on(table.uiFlowId, table.version),
]);

export const uiFlowPages = pgTable('ui_flow_pages', {
  id: serial('id').primaryKey(),
  uiFlowId: integer('ui_flow_id').notNull(),
  tenantId: integer('tenant_id').notNull(),
  slug: varchar('slug', { length: 128 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  pageType: varchar('page_type', { length: 50 }).notNull(),
  formId: integer('form_id'),
  config: jsonb('config'),
  position: integer('position').notNull().default(0),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('ui_fp_flow_id_idx').on(table.uiFlowId),
  index('ui_fp_tenant_id_idx').on(table.tenantId),
  index('ui_fp_slug_idx').on(table.slug),
  unique('ui_fp_flow_page').on(table.uiFlowId, table.slug),
]);

export const uiFlowAnalytics = pgTable('ui_flow_analytics', {
  id: serial('id').primaryKey(),
  uiFlowId: integer('ui_flow_id').notNull(),
  tenantId: integer('tenant_id').notNull(),
  pageSlug: varchar('page_slug', { length: 128 }).notNull(),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  visitorId: varchar('visitor_id', { length: 255 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('ui_fa_flow_id_idx').on(table.uiFlowId),
  index('ui_fa_tenant_id_idx').on(table.tenantId),
  index('ui_fa_created_at_idx').on(table.createdAt),
]);

export const uiFlowsSchema = { uiFlows, uiFlowVersions, uiFlowPages, uiFlowAnalytics };

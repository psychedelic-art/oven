import { pgTable, serial, integer, varchar, text, jsonb, timestamp, boolean, index } from 'drizzle-orm/pg-core';

// ─── flows ──────────────────────────────────────────────────────
// Content pipeline flow templates.
// Each flow defines a series of stages that content items move through.

export const flows = pgTable('flows', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  description: text('description'),
  definition: jsonb('definition'),
  version: integer('version').default(1).notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('flows_tenant_id_idx').on(table.tenantId),
  index('flows_slug_idx').on(table.slug),
  index('flows_enabled_idx').on(table.enabled),
]);

// ─── flow_versions ──────────────────────────────────────────────
// Versioned snapshots of flow definitions.

export const flowVersions = pgTable('flow_versions', {
  id: serial('id').primaryKey(),
  flowId: integer('flow_id').notNull(),
  version: integer('version').notNull(),
  definition: jsonb('definition'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('fver_flow_id_idx').on(table.flowId),
]);

// ─── flow_stages ────────────────────────────────────────────────
// Ordered stages within a flow pipeline.

export const flowStages = pgTable('flow_stages', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  flowId: integer('flow_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  order: integer('order').notNull(),
  stageType: varchar('stage_type', { length: 50 }).notNull(),
  allowedRoles: jsonb('allowed_roles'),
  allowedActions: jsonb('allowed_actions'),
  componentConfig: jsonb('component_config'),
  entryConditions: jsonb('entry_conditions'),
  exitConditions: jsonb('exit_conditions'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('fs_tenant_id_idx').on(table.tenantId),
  index('fs_flow_id_idx').on(table.flowId),
  index('fs_slug_idx').on(table.slug),
]);

// ─── flow_items ─────────────────────────────────────────────────
// Individual content items moving through a flow pipeline.

export const flowItems = pgTable('flow_items', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  flowId: integer('flow_id').notNull(),
  currentStageId: integer('current_stage_id'),
  contentType: varchar('content_type', { length: 100 }).notNull(),
  contentId: integer('content_id'),
  contentSnapshot: jsonb('content_snapshot'),
  metadata: jsonb('metadata'),
  status: varchar('status', { length: 50 }).default('active').notNull(),
  assignedTo: integer('assigned_to'),
  createdBy: integer('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('fi_tenant_id_idx').on(table.tenantId),
  index('fi_flow_id_idx').on(table.flowId),
  index('fi_current_stage_idx').on(table.currentStageId),
  index('fi_status_idx').on(table.status),
  index('fi_content_idx').on(table.contentType, table.contentId),
]);

// ─── flow_transitions ───────────────────────────────────────────
// Audit log of item movements between stages.

export const flowTransitions = pgTable('flow_transitions', {
  id: serial('id').primaryKey(),
  flowItemId: integer('flow_item_id').notNull(),
  fromStageId: integer('from_stage_id'),
  toStageId: integer('to_stage_id').notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  performedBy: integer('performed_by'),
  reason: text('reason'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('ft_flow_item_id_idx').on(table.flowItemId),
  index('ft_from_stage_idx').on(table.fromStageId),
  index('ft_to_stage_idx').on(table.toStageId),
]);

// ─── flow_comments ──────────────────────────────────────────────
// Discussion threads on flow items, optionally scoped to a stage.

export const flowComments = pgTable('flow_comments', {
  id: serial('id').primaryKey(),
  flowItemId: integer('flow_item_id').notNull(),
  stageId: integer('stage_id'),
  authorId: integer('author_id').notNull(),
  content: text('content').notNull(),
  type: varchar('type', { length: 50 }).default('comment').notNull(),
  parentId: integer('parent_id'),
  resolved: boolean('resolved').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('fc2_flow_item_id_idx').on(table.flowItemId),
  index('fc2_stage_id_idx').on(table.stageId),
  index('fc2_author_id_idx').on(table.authorId),
]);

// ─── flow_reviews ───────────────────────────────────────────────
// Formal review decisions on flow items.

export const flowReviews = pgTable('flow_reviews', {
  id: serial('id').primaryKey(),
  flowItemId: integer('flow_item_id').notNull(),
  stageId: integer('stage_id'),
  reviewerId: integer('reviewer_id').notNull(),
  decision: varchar('decision', { length: 50 }).notNull(),
  summary: text('summary'),
  score: integer('score'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('fr_flow_item_id_idx').on(table.flowItemId),
  index('fr_reviewer_id_idx').on(table.reviewerId),
]);

// Export all schemas for registry composition
export const flowsSchema = { flows, flowVersions, flowStages, flowItems, flowTransitions, flowComments, flowReviews };

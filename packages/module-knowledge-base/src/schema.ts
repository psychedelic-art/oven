import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  unique,
} from 'drizzle-orm/pg-core';

// ─── kb_knowledge_bases ─────────────────────────────────────

export const kbKnowledgeBases = pgTable('kb_knowledge_bases', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull(),
  description: text('description'),
  enabled: boolean('enabled').notNull().default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('kbkb_tenant_id_idx').on(table.tenantId),
  unique('kbkb_tenant_slug').on(table.tenantId, table.slug),
]);

// ─── kb_categories ──────────────────────────────────────────

export const kbCategories = pgTable('kb_categories', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  knowledgeBaseId: integer('knowledge_base_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 50 }),
  order: integer('order').notNull().default(0),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('kbc_tenant_id_idx').on(table.tenantId),
  index('kbc_kb_id_idx').on(table.knowledgeBaseId),
  index('kbc_enabled_idx').on(table.enabled),
  index('kbc_order_idx').on(table.order),
  unique('kbc_tenant_kb_slug').on(table.tenantId, table.knowledgeBaseId, table.slug),
]);

// ─── kb_entries ─────────────────────────────────────────────
// Note: The `embedding` column (vector(1536)) is created via raw SQL
// in the seed function. pgvector columns are not natively supported
// by Drizzle ORM, so we use raw SQL for vector operations.

export const kbEntries = pgTable('kb_entries', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  knowledgeBaseId: integer('knowledge_base_id').notNull(),
  categoryId: integer('category_id').notNull(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  keywords: jsonb('keywords'),
  tags: jsonb('tags'),
  priority: integer('priority').notNull().default(0),
  language: varchar('language', { length: 10 }).notNull().default('es'),
  enabled: boolean('enabled').notNull().default(true),
  version: integer('version').notNull().default(1),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('kbe_tenant_id_idx').on(table.tenantId),
  index('kbe_kb_id_idx').on(table.knowledgeBaseId),
  index('kbe_category_id_idx').on(table.categoryId),
  index('kbe_enabled_idx').on(table.enabled),
  index('kbe_language_idx').on(table.language),
  index('kbe_priority_idx').on(table.priority),
]);

// ─── kb_entry_versions ──────────────────────────────────────

export const kbEntryVersions = pgTable('kb_entry_versions', {
  id: serial('id').primaryKey(),
  entryId: integer('entry_id').notNull(),
  version: integer('version').notNull(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  keywords: jsonb('keywords'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('kbev_entry_id_idx').on(table.entryId),
  unique('kbev_entry_version').on(table.entryId, table.version),
]);

// ─── Composed Schema Export ─────────────────────────────────

export const kbSchema = {
  kbKnowledgeBases,
  kbCategories,
  kbEntries,
  kbEntryVersions,
};

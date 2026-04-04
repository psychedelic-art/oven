import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

// ─── Files ──────────────────────────────────────────────────

export const files = pgTable('files', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id'),
  filename: varchar('filename', { length: 512 }).notNull(),
  mimeType: varchar('mime_type', { length: 128 }).notNull(),
  sizeBytes: integer('size_bytes').notNull().default(0),
  publicUrl: text('public_url').notNull(),
  storageKey: varchar('storage_key', { length: 1024 }).notNull(),
  folder: varchar('folder', { length: 255 }),
  width: integer('width'),
  height: integer('height'),
  sourceModule: varchar('source_module', { length: 128 }),
  sourceId: varchar('source_id', { length: 255 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('files_tenant_idx').on(table.tenantId),
  index('files_folder_idx').on(table.folder),
  index('files_source_idx').on(table.sourceModule, table.sourceId),
  index('files_mime_idx').on(table.mimeType),
  index('files_created_idx').on(table.createdAt),
]);

// ─── Schema export ──────────────────────────────────────────

export const filesSchema = { files };

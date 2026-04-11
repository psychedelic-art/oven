# Files Module — Database

> Drizzle schema, indexes, constraints, migrations, and seed for the
> one table owned by `@oven/module-files`.

## Table: `files`

Source: `packages/module-files/src/schema.ts`.

```ts
export const files = pgTable('files', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id'),                                 // nullable — null = platform-global
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
```

### Column semantics

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | `serial` | No | Primary key. Never exposed to clients that the top-level spec §6 marks as public — sprint-02 RLS adds a `public_id` (UUID) for those use cases. |
| `tenantId` | `integer` | **Yes** | NULL = platform-global. Non-null = scoped. |
| `filename` | `varchar(512)` | No | Original filename, preserved for `Content-Disposition`. Never used as the storage key. |
| `mimeType` | `varchar(128)` | No | Validated against config allowlist on upload (sprint-01). |
| `sizeBytes` | `integer` | No (default 0) | Real size in bytes, measured after `resolveBuffer` decodes. |
| `publicUrl` | `text` | No | Full public URL from the storage adapter. May be a Vercel Blob URL or a local `/api/files/public/...` URL. |
| `storageKey` | `varchar(1024)` | No | Adapter-internal key (e.g. Vercel Blob pathname, local filesystem path). Used for deletion. |
| `folder` | `varchar(255)` | Yes | Virtual folder path (e.g. `/logos`, `/chat-attachments`). |
| `width` | `integer` | Yes | Image width in pixels (from `sharp`). NULL for non-images. |
| `height` | `integer` | Yes | Image height in pixels. NULL for non-images. |
| `sourceModule` | `varchar(128)` | Yes | The module that triggered the upload (e.g. `'tenants'`, `'chat'`). Used for auditing and event filtering. |
| `sourceId` | `varchar(255)` | Yes | The entity id within that module (string to accommodate both numeric and slug ids). |
| `metadata` | `jsonb` | Yes | Free-form per-file metadata (EXIF, PDF page count, etc.). |
| `createdAt` | `timestamp` | No | Default `now()`. No `updatedAt` — files are immutable by design; `PUT` only updates `folder` and `metadata`. |

### Indexes

| Index | Columns | Purpose |
|---|---|---|
| `files_tenant_idx` | `tenantId` | Per-tenant list and delete-on-tenant-cleanup. |
| `files_folder_idx` | `folder` | Folder browser filter. |
| `files_source_idx` | `(sourceModule, sourceId)` | Composite lookup used by consumer modules to find "all files attached to this entity". Used by the tenants handler to find a tenant's logo. |
| `files_mime_idx` | `mimeType` | MIME filter on list endpoint. |
| `files_created_idx` | `createdAt` | Default sort and pruning queries. |

### Foreign keys

**None in the current schema.** The spec notes that a future migration
may add `tenantId → tenants.id` as a nullable FK with `ON DELETE SET
NULL` so tenant deletion doesn't cascade to file rows. Tracked as
sprint-03 acceptance item.

### Constraints

Currently only `NOT NULL` on the columns marked above. Sprint-01 adds
an application-level invariant (enforced in the handler, not the DB):

- `tenantId IS NULL OR tenantId IN (SELECT id FROM tenants)` — NOT
  enforced in SQL yet because we want soft tenant references for
  platform-global files.

## RLS policies

**Not currently applied.** Sprint-03 adds PostgreSQL RLS once
`module-auth` ships the `app.tenant_ids` GUC pattern. Planned policy:

```sql
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

CREATE POLICY files_tenant_read ON files
  FOR SELECT
  USING (
    tenant_id IS NULL
    OR tenant_id = ANY(string_to_array(current_setting('app.tenant_ids', true), ',')::int[])
  );

CREATE POLICY files_tenant_write ON files
  FOR ALL
  USING (
    tenant_id IS NULL
    OR tenant_id = ANY(string_to_array(current_setting('app.tenant_ids', true), ',')::int[])
  )
  WITH CHECK (
    tenant_id IS NULL
    OR tenant_id = ANY(string_to_array(current_setting('app.tenant_ids', true), ',')::int[])
  );
```

Platform-global rows (`tenant_id IS NULL`) are readable by every
tenant but writable only by platform admins — enforced at the handler
level via role check.

## Seed

Source: `packages/module-files/src/seed.ts`. Seeds 5 permissions via
`INSERT ... ON CONFLICT DO NOTHING`:

- `files.read`
- `files.upload`
- `files.update`
- `files.delete`
- `files.download`

Plus the public endpoint registration for `GET /api/files/public/[...pathname]`
(sprint-05, not yet in seed).

Sprint-03 adds the optional seeding of a platform-global
`oven-logo.svg` into storage so dashboards have a default brand mark.

## Migrations

The `files` table migration is managed by Drizzle Kit. There is no
dedicated handwritten migration file — the schema is the source of
truth, and `pnpm db:generate` produces migration SQL from
`drizzle.config.ts`.

Breaking-change policy: the `files` table is assumed stable. Any
future column additions must be nullable or have a default so
rolling deploys do not break in-flight handlers.

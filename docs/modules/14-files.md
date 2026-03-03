# Module: Files

> **Package**: `packages/module-files/`
> **Name**: `@oven/module-files`
> **Dependencies**: `module-registry`, `module-tenants`
> **Status**: Planned

---

## 1. Overview

Files is a **centralized file storage module** that provides a unified upload, download, and management API for all modules across the platform. Built on **Vercel Blob** (already used for tile sprites at `apps/dashboard/src/app/api/tiles/upload/route.ts`), it replaces ad-hoc file handling patterns with a consistent, tenant-aware file service.

Files supports image processing (thumbnails, resize via `sharp`), content-type validation, size limits per tenant, and virtual folder organization. Other modules reference files via URL or file ID rather than managing their own upload logic.

---

## 2. Core Concepts

### File Record
A database entry tracking a file stored in Vercel Blob. Contains metadata (filename, MIME type, size, dimensions), the blob URL, and organizational info (folder, tenant, uploader).

### Virtual Folder
A logical grouping path (e.g., `/logos`, `/faq-images`, `/chat-attachments`) for organizing files within a tenant. Not a filesystem directory — just a string prefix for filtering.

### Thumbnail
An auto-generated smaller version of image files, stored as a separate blob URL. Created on upload for images above a configurable size threshold.

### Visibility
Files can be `public` (accessible via direct URL) or `private` (requires authenticated access via download endpoint).

---

## 3. Database Schema

### Tables

**`files`** — File metadata and blob references
```typescript
export const files = pgTable('files', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id'),                                   // nullable — null means platform-global
  userId: integer('user_id'),                                       // nullable — null for system-uploaded files
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 128 }).notNull(),
  size: integer('size').notNull(),                                  // bytes
  blobUrl: varchar('blob_url', { length: 1000 }).notNull(),         // Vercel Blob URL
  blobPathname: varchar('blob_pathname', { length: 500 }).notNull(),
  thumbnailUrl: varchar('thumbnail_url', { length: 1000 }),         // auto-generated for images
  metadata: jsonb('metadata'),                                       // { width, height, duration, pages, etc. }
  folder: varchar('folder', { length: 255 }),                        // virtual folder path
  visibility: varchar('visibility', { length: 20 }).notNull().default('private'), // public | private
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('files_tenant_id_idx').on(table.tenantId),
  index('files_user_id_idx').on(table.userId),
  index('files_folder_idx').on(table.folder),
  index('files_mime_type_idx').on(table.mimeType),
  index('files_created_at_idx').on(table.createdAt),
]);
```

---

## 4. Upload Engine

### Upload Flow

1. Client sends `POST /api/files/upload` with multipart form data
2. Server validates: file size (per-tenant limit), content type (allowlist), file count
3. Image files: generate thumbnail via `sharp`, extract dimensions
4. Upload to Vercel Blob via `put()` — returns permanent URL
5. If thumbnail: upload thumbnail to Vercel Blob separately
6. Create `files` record in database
7. Return file record with `blobUrl`

### Supported Processing

| MIME Type | Processing |
|-----------|-----------|
| `image/*` | Thumbnail generation (max 200x200), dimension extraction, EXIF stripping |
| `application/pdf` | Page count extraction |
| `audio/*` | Duration extraction (if `ffprobe` available) |
| `video/*` | Duration extraction, poster frame (if `ffmpeg` available) |
| Other | Stored as-is with MIME type metadata |

---

## 5. API Endpoints

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| POST | `/api/files/upload` | Upload one or more files (multipart) | Authenticated |
| GET | `/api/files` | List files (filterable by folder, mimeType, tenantId) | Authenticated |
| GET | `/api/files/[id]` | Get file metadata | Authenticated |
| PUT | `/api/files/[id]` | Update file metadata (folder, visibility) | Authenticated |
| DELETE | `/api/files/[id]` | Delete file (removes from Vercel Blob via `del()`) | Authenticated |
| GET | `/api/files/[id]/download` | Download file (signed URL or proxy) | Authenticated |
| GET | `/api/files/public/[blobPathname]` | Direct public file access | **Public** |

### Upload Request

```
POST /api/files/upload
Content-Type: multipart/form-data

file: (binary)
folder: /logos
visibility: public
tenantId: 5
```

### Upload Response

```json
{
  "id": 42,
  "filename": "logo-abc123.png",
  "originalName": "company-logo.png",
  "mimeType": "image/png",
  "size": 45230,
  "blobUrl": "https://abc123.public.blob.vercel-storage.com/logos/logo-abc123.png",
  "thumbnailUrl": "https://abc123.public.blob.vercel-storage.com/logos/logo-abc123-thumb.png",
  "metadata": { "width": 800, "height": 600 },
  "folder": "/logos",
  "visibility": "public"
}
```

---

## 6. Dashboard UI

### React Admin Resources

- **Files** — List, Show
  - List: Grid/list toggle, image previews for images, size column, MIME type badges, folder filter, upload button
  - Show: File preview (image viewer, PDF viewer, audio player), metadata, download button, delete button

### Custom Pages

- **File Browser** (`/files/browser`) — Full-page file manager with folder tree sidebar, drag-and-drop upload area, multi-select for batch operations

### Reusable Components

- **`<FileUpload />`** — Drop zone component that other modules import for file attachment UIs. Props: `tenantId`, `folder`, `accept` (MIME filter), `maxSize`, `onUpload` callback
- **`<FilePreview />`** — Inline file preview component. Shows thumbnail for images, icon for other types
- **`<FilePicker />`** — Modal picker that browses existing files or uploads new ones

### Menu Section

```
──── Files ────
Files
```

---

## 7. Events

| Event | Payload |
|-------|---------|
| `files.file.uploaded` | id, tenantId, filename, mimeType, size, folder |
| `files.file.updated` | id, tenantId, filename |
| `files.file.deleted` | id, tenantId, filename, blobUrl |

---

## 8. Integration Points

| Module | Integration |
|--------|-------------|
| **module-tenants** | Files are tenant-scoped; tenant logos stored via this module |
| **module-roles** | Permission-based access to upload, view, delete files |
| **module-forms** | Form editor's image/file upload components use this module |
| **module-knowledge-base** | FAQ entries can attach images/documents |
| **module-chat** | Chat messages can include file attachments |
| **module-ui-flows** | Portal theme logos and hero images stored here |
| **module-notifications** | Media messages (images, audio) sent via WhatsApp |

---

## 9. ModuleDefinition

```typescript
export const filesModule: ModuleDefinition = {
  name: 'files',
  dependencies: ['tenants'],
  description: 'Centralized file storage with Vercel Blob, image processing, and tenant-scoped organization',
  capabilities: [
    'upload files',
    'manage file metadata',
    'generate thumbnails',
    'organize in folders',
    'serve public files',
  ],
  schema: { files },
  seed: seedFiles,
  resources: [
    {
      name: 'files',
      list: FileList,
      show: FileShow,
      icon: FolderIcon,
      options: { label: 'Files' },
    },
  ],
  customRoutes: [
    { path: '/files/browser', component: FileBrowserPage },
  ],
  menuItems: [
    { label: 'Files', to: '/files' },
  ],
  apiHandlers: {
    'files/upload': { POST: uploadFile },
    'files': { GET: listFiles },
    'files/[id]': { GET: getFile, PUT: updateFile, DELETE: deleteFile },
    'files/[id]/download': { GET: downloadFile },
    'files/public/[...pathname]': { GET: servePublicFile },
  },
  configSchema: [
    {
      key: 'MAX_FILE_SIZE_MB',
      type: 'number',
      description: 'Maximum file size in megabytes',
      defaultValue: 10,
      instanceScoped: true,
    },
    {
      key: 'ALLOWED_MIME_TYPES',
      type: 'string',
      description: 'Comma-separated list of allowed MIME types (empty = all)',
      defaultValue: '',
      instanceScoped: true,
    },
    {
      key: 'THUMBNAIL_MAX_SIZE',
      type: 'number',
      description: 'Maximum thumbnail dimension in pixels',
      defaultValue: 200,
      instanceScoped: false,
    },
    {
      key: 'MAX_FILES_PER_TENANT',
      type: 'number',
      description: 'Maximum total files per tenant (0 = unlimited)',
      defaultValue: 0,
      instanceScoped: true,
    },
  ],
  events: {
    emits: [
      'files.file.uploaded',
      'files.file.updated',
      'files.file.deleted',
    ],
    schemas: {
      'files.file.uploaded': {
        id: { type: 'number', description: 'File DB ID', required: true },
        tenantId: { type: 'number', description: 'Owning tenant ID' },
        filename: { type: 'string', description: 'Stored filename' },
        mimeType: { type: 'string', description: 'MIME content type' },
        size: { type: 'number', description: 'File size in bytes' },
        folder: { type: 'string', description: 'Virtual folder path' },
      },
      'files.file.updated': {
        id: { type: 'number', description: 'File DB ID', required: true },
        tenantId: { type: 'number', description: 'Owning tenant ID' },
        filename: { type: 'string', description: 'Stored filename' },
      },
      'files.file.deleted': {
        id: { type: 'number', description: 'File DB ID', required: true },
        tenantId: { type: 'number', description: 'Owning tenant ID' },
        filename: { type: 'string', description: 'Stored filename' },
        blobUrl: { type: 'string', description: 'Deleted blob URL' },
      },
    },
  },
  chat: {
    description: 'Centralized file storage with upload, thumbnail generation, and folder organization. Uses Vercel Blob for storage.',
    capabilities: [
      'upload files',
      'list files',
      'delete files',
      'search by folder',
    ],
    actionSchemas: [
      {
        name: 'files.list',
        description: 'List files with filtering by folder, MIME type, and tenant',
        parameters: {
          tenantId: { type: 'number' },
          folder: { type: 'string' },
          mimeType: { type: 'string' },
        },
        returns: { data: { type: 'array' }, total: { type: 'number' } },
        requiredPermissions: ['files.read'],
        endpoint: { method: 'GET', path: 'files' },
      },
      {
        name: 'files.delete',
        description: 'Delete a file by ID',
        parameters: {
          id: { type: 'number', required: true },
        },
        requiredPermissions: ['files.delete'],
        endpoint: { method: 'DELETE', path: 'files/[id]' },
      },
    ],
  },
};
```

---

## 10. Seed Data

```typescript
export async function seedFiles(db: any) {
  const modulePermissions = [
    { resource: 'files', action: 'read', slug: 'files.read', description: 'View files' },
    { resource: 'files', action: 'upload', slug: 'files.upload', description: 'Upload files' },
    { resource: 'files', action: 'update', slug: 'files.update', description: 'Edit file metadata' },
    { resource: 'files', action: 'delete', slug: 'files.delete', description: 'Delete files' },
    { resource: 'files', action: 'download', slug: 'files.download', description: 'Download files' },
  ];

  for (const perm of modulePermissions) {
    await db.insert(permissions).values(perm).onConflictDoNothing();
  }

  // Mark public endpoints
  const publicEndpoints = [
    { module: 'files', route: 'files/public/[...pathname]', method: 'GET', isPublic: true },
  ];

  for (const ep of publicEndpoints) {
    await db.insert(apiEndpointPermissions).values(ep).onConflictDoNothing();
  }
}
```

---

## 11. API Handler Example

```typescript
// GET /api/files — List handler with tenant filtering
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const tenantId = request.headers.get('x-tenant-id');

  const conditions = [];
  if (tenantId) conditions.push(eq(files.tenantId, Number(tenantId)));
  if (params.filter?.folder) conditions.push(eq(files.folder, params.filter.folder));
  if (params.filter?.mimeType) conditions.push(like(files.mimeType, `${params.filter.mimeType}%`));

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ count }]] = await Promise.all([
    db.select().from(files).where(where)
      .orderBy(desc(files.createdAt))
      .offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(files).where(where),
  ]);

  return listResponse(rows, 'files', params, Number(count));
}
```

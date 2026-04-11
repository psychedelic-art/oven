# Files Module — Module Design

> The concrete engineering design for `@oven/module-files` — file
> layout, public API, event contracts, and module registration shape.
> Companion to `architecture.md` (which covers "why"); this document
> covers "what".

## Package layout

```
packages/module-files/
├── package.json
├── vitest.config.ts         (sprint-1)
├── src/
│   ├── index.ts             (filesModule ModuleDefinition + re-exports)
│   ├── schema.ts            (Drizzle schema — `files` table)
│   ├── seed.ts              (permissions, public endpoints)
│   ├── types.ts             (FileStorageAdapter, UploadInput, UploadResult, FileRecord)
│   ├── api/
│   │   ├── _utils/
│   │   │   └── sort.ts      (sprint-1 — F-05-01 helper, package-private)
│   │   ├── files.handler.ts          (GET /api/files — list)
│   │   ├── files-by-id.handler.ts    (GET/DELETE/PUT /api/files/[id])
│   │   └── files-upload.handler.ts   (POST /api/files/upload)
│   ├── engine/
│   │   ├── storage-adapter.ts        (factory + singleton)
│   │   ├── vercel-blob.ts            (VercelBlobAdapter)
│   │   ├── local-fs.ts               (LocalFsAdapter)
│   │   └── upload-processor.ts       (processUpload)
│   ├── components/                   (sprint-4 — new entry point)
│   │   ├── FileUpload.tsx
│   │   ├── FilePreview.tsx
│   │   └── FilePicker.tsx
│   └── __tests__/                    (sprint-1+)
│       ├── sort-guard.test.ts
│       ├── upload-processor.test.ts
│       ├── storage-adapter.test.ts
│       └── handlers/                 (sprint-3)
│           ├── upload.test.ts
│           ├── list.test.ts
│           └── delete.test.ts
```

## Public surface (what other packages can import)

From `@oven/module-files`:

- `filesModule` — `ModuleDefinition` (registered in
  `apps/dashboard/src/lib/modules.ts`).
- `filesSchema` — Drizzle schema for drizzle-kit to discover.
- `seedFiles` — seed function called from the dashboard seed
  orchestrator.
- `processUpload` — so a future migration path can call the
  upload processor without going through the HTTP layer.
- `getStorageAdapter`, `createStorageAdapter` — for modules (like
  `module-notifications`) that need to upload media directly from a
  server-side flow.
- `FileRecord`, `UploadInput`, `UploadResult`, `FileStorageAdapter`,
  `StorageAdapterType` — type exports via `export * from './types'`.

From `@oven/module-files/components` (sprint-4):

- `FileUpload`, `FilePreview`, `FilePicker` — React components used
  by the dashboard and by other modules that need file attachment
  UIs.

**Private** (must NOT be exported from `index.ts`):

- `getOrderColumn` / `SortResolution` in `api/_utils/sort.ts`. Per
  IP-4, this is copied from `module-ai` and kept local. Other
  modules must copy the pattern rather than importing from here.
- Handler modules (`files.handler.ts`, etc.). These are referenced
  only via `filesModule.apiHandlers`.

## ModuleDefinition

Source of truth: `packages/module-files/src/index.ts`. The shape
matches the top-level spec §9 except where noted:

| Field | Current | Spec target | Gap |
|---|---|---|---|
| `name` | `'files'` | `'files'` | — |
| `dependencies` | `['tenants']` | `['tenants']` | — |
| `description` | Adapter-focused | Adapter-focused | — |
| `capabilities` | 4 entries | 5 entries | `generate thumbnails` not yet claimed |
| `schema` | `filesSchema` | `{ files }` | — (equivalent) |
| `seed` | `seedFiles` | `seedFiles` | — |
| `resources` | `[{ name: 'files', options: { label: 'Files' } }]` | List/Show components | Sprint-4 adds `list: FileList, show: FileShow`. |
| `customRoutes` | — | `/files/browser` | Sprint-5. |
| `menuItems` | `[{ label: 'Files', to: '/files' }]` | Same | — |
| `apiHandlers` | 3 routes | 7 routes | Sprint-4/5 adds PUT / download / public. |
| `configSchema` | 2 entries | 4 entries | Sprint-3 adds `THUMBNAIL_MAX_SIZE`, `MAX_FILES_PER_TENANT`. |
| `events.emits` | `uploaded`, `deleted` | + `updated` | Sprint-4. |
| `events.schemas` | 2 schemas | 3 schemas | Sprint-4. |
| `chat.actionSchemas` | `upload`, `list`, `get` | `list`, `delete` | Current exceeds spec — keep the extras, they're useful. |

## Event schemas

```ts
// Emitted after a successful upload + DB insert.
'files.file.uploaded': {
  id: number;                    // FileRecord.id
  tenantId: number | null;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  publicUrl: string;
  folder: string | null;
  sourceModule: string | null;   // who triggered the upload
  sourceId: string | null;       // the entity id within sourceModule
}

// Emitted after a successful delete (DB + adapter).
'files.file.deleted': {
  id: number;
  tenantId: number | null;
  filename: string;
  publicUrl: string;
  storageKey: string;
  folder: string | null;
  sourceModule: string | null;
  sourceId: string | null;
}

// Sprint-4 — emitted after a PUT updates folder/metadata.
'files.file.updated': {
  id: number;
  tenantId: number | null;
  filename: string;              // unchanged — included for audit
  folder: string | null;         // new folder
  metadata: Record<string, unknown> | null;  // new metadata
}
```

## Sort-allowlist helper

File: `packages/module-files/src/api/_utils/sort.ts`. **Contents are
a verbatim copy of `packages/module-ai/src/api/_utils/sort.ts`**
(which is the cycle-3 F-05-01 reference implementation). IP-4
requires the copy rather than a cross-module import.

The copy must be kept in sync with the reference when the reference
evolves. This is tracked as tech debt in `secure.md` §Open items:
"promote `getOrderColumn` to `@oven/module-registry/api-utils`" is
the long-term fix, but it requires a registry package bump and
tests for every consumer.

## Upload processor refactor (sprint-1)

Current signature:

```ts
export async function processUpload(input: UploadInput): Promise<UploadResult>;
```

Sprint-1 target:

```ts
export async function processUpload(
  input: UploadInput,
  adapter?: FileStorageAdapter,
): Promise<UploadResult>;
```

- `adapter` defaults to `getStorageAdapter()` when omitted.
- No behaviour change for the existing handler call site.
- Enables unit tests to inject a stub adapter and assert against it
  without the singleton cache.

## Config binding

The handler reads config through `@oven/module-config`:

```ts
import { getConfig } from '@oven/module-config';
const cfg = await getConfig({ module: 'files', tenantId });
const maxBytes = cfg.MAX_FILE_SIZE_MB * 1024 * 1024;
const mimePatterns = cfg.ALLOWED_MIME_TYPES.split(',').map(s => s.trim());
```

The config cascade is tenant → instance → default, owned by
`module-config`. `module-files` must not re-implement the cascade.

## Error mapping

| Condition | HTTP | Body |
|---|---|---|
| Missing `filename` / `mimeType` / body | 400 | `{ error: 'filename is required' }` (etc.) |
| MIME not in allowlist (sprint-1) | 400 | `{ error: 'MIME type "x" is not allowed. Allowed: ...' }` |
| MIME/magic-byte mismatch (sprint-1) | 400 | `{ error: 'MIME type mismatch: declared image/png, actual application/zip' }` |
| Size exceeds limit (sprint-1) | 400 | `{ error: 'File size 12345678 exceeds maximum 10485760 bytes' }` |
| Invalid sort field (sprint-1) | 400 | `{ error: 'Invalid sort field "x". Allowed: id, tenantId, ...' }` |
| Cross-tenant access (sprint-2) | 404 | `{ error: 'Not found' }` |
| Cross-tenant upload (sprint-2) | 403 | `{ error: 'Cannot upload on behalf of tenant x' }` |
| Storage adapter failure | 500 | `{ error: 'Upload failed' }` (no details — credentials leak guard) |
| Drizzle unique violation | 409 | `{ error: 'Conflict' }` |

Per `CLAUDE.md` — error handling only at boundaries. Every error
above is emitted from the handler, not from the engine or the
storage adapter.

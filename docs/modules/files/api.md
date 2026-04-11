# Files Module — API

> Reference documentation for every HTTP route exposed by
> `@oven/module-files`. Truth source for both the handler implementation
> and the dashboard / portal clients that call it.

## Route inventory

| Method | Route | Handler (current) | Status |
|---|---|---|---|
| `POST` | `/api/files/upload` | `files-upload.handler.ts` | Live |
| `GET`  | `/api/files` | `files.handler.ts` | Live (has F-05-01 sort bug) |
| `GET`  | `/api/files/[id]` | `files-by-id.handler.ts` | Live |
| `DELETE` | `/api/files/[id]` | `files-by-id.handler.ts` | Live |
| `PUT`  | `/api/files/[id]` | (missing) | Sprint-04 |
| `GET`  | `/api/files/[id]/download` | (missing) | Sprint-05 |
| `GET`  | `/api/files/public/[...pathname]` | (missing) | Sprint-05 |

All routes are registered through `filesModule.apiHandlers` and pass
through the central `apiHandlers` router in
`apps/dashboard/src/lib/modules.ts`.

## Common query parameters (list endpoints)

Every list endpoint honours the shared `parseListParams` parser from
`@oven/module-registry/api-utils`:

| Param | Type | Notes |
|---|---|---|
| `offset` | integer | Default 0. |
| `limit` | integer | Default 25, max 100. |
| `sort` | string | **Must be in the route's allowlist.** Invalid values return `400 Bad Request`, not a silent fallback to `id`. See F-05-01 below. |
| `order` | `asc` \| `desc` | Default `asc`. |
| `filter[*]` | varies | Route-specific. |

## Sort allowlist (F-05-01)

The `GET /api/files` handler currently contains the unsafe pattern:

```ts
const orderCol = (files as any)[params.sort] ?? files.id;   // ← BUG
```

This fails three safety properties:

1. **Silent fallback** — unknown sort fields return `id`-ordered
   results instead of rejecting the request.
2. **Prototype key bypass** — `?sort=constructor` resolves to
   `Function.prototype.constructor`, which Drizzle then crashes on
   with an opaque runtime error.
3. **Uncontrolled allowlist expansion** — any new column added to the
   schema becomes sortable without review, including internal fields.

**Sprint-01 replaces this with the `getOrderColumn` helper pattern**
from `packages/module-ai/src/api/_utils/sort.ts`. The module-files
copy lives at `packages/module-files/src/api/_utils/sort.ts` (per
IP-4: copy the pattern, do NOT import from another module's
internals). Allowed sort fields for `GET /api/files`:

```ts
const ALLOWED_SORTS = [
  'id',
  'tenantId',
  'filename',
  'mimeType',
  'sizeBytes',
  'folder',
  'sourceModule',
  'createdAt',
] as const;
```

Bad input returns:

```
400 Bad Request
{ "error": "Invalid sort field \"foo\". Allowed: id, tenantId, filename, mimeType, sizeBytes, folder, sourceModule, createdAt" }
```

## `POST /api/files/upload`

**Content-Type**: `application/json` (base64 / URL variant). The
multipart variant from spec §5 is not yet implemented; the JSON
variant is the shipped path.

**Request body** (`UploadInput`):

```ts
{
  base64?: string;        // base64 content OR
  url?: string;           // URL to fetch
  filename: string;       // required
  mimeType: string;       // required
  folder?: string;        // virtual folder path
  tenantId?: number;      // nullable = platform-global
  sourceModule?: string;  // for audit trail
  sourceId?: string;
  metadata?: Record<string, unknown>;
}
```

**Response** (201):

```ts
FileRecord   // full row from the `files` table
```

**Error modes** (all via `badRequest`, 400):

- `Either base64 or url is required`
- `filename is required`
- `mimeType is required`

**Side effects**:

- Writes a row to `files`.
- Uploads the binary to the configured storage adapter.
- Emits `files.file.uploaded` on the `eventBus`.

**Sprint-01 adds** MIME allowlist enforcement:

```ts
// Read from ModuleConfig key 'files.ALLOWED_MIME_TYPES'
const patterns = config.files.ALLOWED_MIME_TYPES.split(',').map(s => s.trim());
if (!matchesAny(body.mimeType, patterns)) {
  return badRequest(`MIME type "${body.mimeType}" is not allowed. Allowed: ${patterns.join(', ')}`);
}
```

**Sprint-01 also adds** size limit enforcement:

```ts
const maxBytes = config.files.MAX_FILE_SIZE_MB * 1024 * 1024;
if (buffer.length > maxBytes) {
  return badRequest(`File size ${buffer.length} exceeds maximum of ${maxBytes} bytes`);
}
```

## `GET /api/files`

**Query params**: `offset`, `limit`, `sort`, `order`,
`filter[folder]`, `filter[mimeType]`, `filter[tenantId]`,
`filter[sourceModule]`, `filter[q]` (filename substring match).

**Response**: `listResponse(data, 'files', params, total)` — React
Admin compatible with `Content-Range` header.

## `GET /api/files/[id]`

Returns a single `FileRecord`. 404 if not found. Sprint-02 adds
tenant-scoping: if the caller's JWT tenant set does not include the
file's `tenantId`, the endpoint returns 404 (not 403) to avoid
leaking existence.

## `DELETE /api/files/[id]`

Deletes the DB row AND calls `adapter.delete(storageKey)` to remove
the blob. Emits `files.file.deleted`. Sprint-02 adds the same
tenant-scoping guard as GET.

## `PUT /api/files/[id]` (sprint-04)

Updates `folder` or `metadata` only. `filename`, `mimeType`,
`sizeBytes`, `publicUrl`, `storageKey`, `width`, `height`, and
`createdAt` are read-only. Emits `files.file.updated`.

## `GET /api/files/[id]/download` (sprint-05)

Proxies the blob bytes through the server instead of redirecting to
the public URL. Required for private files once visibility is
implemented. Returns `Content-Disposition: attachment;
filename="<original>"`.

## `GET /api/files/public/[...pathname]` (sprint-05)

Public endpoint (registered in `apiEndpointPermissions` with
`isPublic: true`). Serves public files without authentication. Used
by the portal for logos and hero images.

## Event bus contracts

See `module-design.md` for full event payload schemas. All events
are emitted via `eventBus.emit(name, payload)` immediately after the
DB mutation returns.

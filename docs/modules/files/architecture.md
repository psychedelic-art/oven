# Files Module — Architecture

> How `@oven/module-files` fits into the OVEN module graph, its
> internal layers, and the cross-module contracts it owns.

## Module position

`module-files` sits in **Phase-0 infrastructure**. It depends on
`module-registry` (for `getDb`, event bus, module definition shape,
and api-utils) and `module-tenants` (for tenant-id scoping), and it
is depended on by:

| Consumer module | Use |
|---|---|
| `module-tenants` | Tenant logos (`tenants.logoUrl`) |
| `module-forms` | File input question answers |
| `module-chat` | Message attachments |
| `module-knowledge-base` | Entry images and documents |
| `module-ui-flows` | Portal theme logos and hero images |
| `module-notifications` | WhatsApp media message content |
| `module-ai` | Provider logos, playground execution outputs |

Per `module-rules.md` Rule 3.1, none of those consumers import from
`module-files/src/*` directly — they all go through
`POST /api/files/upload` and read `publicUrl` from their own
schema. The one exception is the dashboard UI, which imports
`<FileUpload />`, `<FilePreview />`, and `<FilePicker />` from the
package's dedicated `components` entry point (sprint-04).

## Internal layers

```
┌─────────────────────────────────────────────────────┐
│                  API handlers                       │
│  files-upload / files / files-by-id                 │
└───────────────┬─────────────────────────────────────┘
                │ processUpload(input)
                ▼
┌─────────────────────────────────────────────────────┐
│                 Upload processor                    │
│  - resolveBuffer (base64 / URL / multipart)         │
│  - generateKey (folder/tenant/unique.ext)           │
│  - extractImageMeta via sharp                       │
└───────────────┬─────────────────────────────────────┘
                │ adapter.upload(buffer, key, mime)
                ▼
┌─────────────────────────────────────────────────────┐
│              Storage adapter (pluggable)            │
│  FileStorageAdapter interface                       │
│    ├─ VercelBlobAdapter (prod default)              │
│    ├─ LocalFsAdapter   (dev / offline tests)        │
│    └─ S3Adapter        (sprint-05 optional)         │
└─────────────────────────────────────────────────────┘
```

Every layer is pure except the adapter, which is the only place that
touches the network / filesystem.

## Boundary conventions

Per `CLAUDE.md` — "Error handling only at system boundaries":

| Layer | Throws? | Error handling |
|---|---|---|
| API handlers | Never throw to the caller | Return `badRequest` / `NextResponse.json(..., { status: 4xx })`. |
| Upload processor | May throw | Caught by the handler. The exception is `resolveBuffer` which throws on missing input — the handler validates inputs before calling it, so in practice this path is unreachable. |
| Storage adapter | May throw | Caught by the handler and mapped to a 500 with a generic message. **The raw adapter error MUST NOT be surfaced to the client** — it may contain bucket names or credentials. |
| Database layer | May throw | Caught by the handler. Constraint violations mapped to 409. |

The `extractImageMeta` helper has a deliberate `try { ... } catch { return {} }` — `sharp` throws on non-image buffers, so the catch is the documented fallback path that lets non-image files proceed without dimensions. This does NOT violate the boundary rule because the error is expected as a control-flow signal, not an error condition.

## Storage adapter contract

```ts
export interface FileStorageAdapter {
  upload(buffer: Buffer, key: string, contentType: string): Promise<{ url: string; key: string }>;
  delete(urlOrKey: string): Promise<void>;
  getUrl(key: string): string;
}
```

Rules:

- `upload` must be idempotent on `key`. If the same key is uploaded
  twice, the second call should either overwrite or reject (adapter
  choice, documented). Current `VercelBlobAdapter` overwrites.
- `delete` must be idempotent. Calling delete on a non-existent key
  must succeed (no-op), not throw.
- `getUrl` must be pure and synchronous. No network I/O.
- Adapters must NOT leak credentials in error messages.

## Key generation

```
<folder>/<scope>/<unique>.<ext>
```

- `folder` — virtual folder path, defaults to `uploads`.
- `scope` — tenant id or `global`.
- `unique` — `Date.now()-<4 random bytes>` from `crypto.randomBytes(4)`.
- `ext` — derived from MIME type via an explicit allowlist map in
  `extFromMimeType`, falling back to the MIME subtype when not in
  the map.

The key is generated server-side. Client-supplied keys or filenames
never reach the adapter verbatim — this is the defence against path
traversal in the local adapter.

## Singleton semantics

`getStorageAdapter()` memoises the adapter instance at module load
time. Tests that need to swap adapters (e.g., use the local adapter
under vitest) must use `createStorageAdapter(type)` directly and
call the engine functions with an injected adapter — the singleton
is not exported as a mutable `let`.

**Sprint-01 refactor**: `processUpload` will accept an optional
adapter parameter to make it unit-testable without monkey-patching
the singleton:

```ts
export async function processUpload(
  input: UploadInput,
  adapter?: FileStorageAdapter
): Promise<UploadResult> {
  const a = adapter ?? await getStorageAdapter();
  // ...
}
```

This is a strictly additive change that does not break existing
callers.

## Cross-module event flow

```
upload handler
      │
      ▼ (awaits DB insert)
files.file.uploaded ──▶ [knowledge-base] picks up entry image refs
                   ──▶ [analytics]      usage metering via subscriptions
                   ──▶ [tenants]        updates `tenants.logoUrl` if sourceModule=tenants

delete handler
      │
      ▼ (awaits DB delete + adapter.delete)
files.file.deleted  ──▶ [tenants]        clears `tenants.logoUrl` on match
                   ──▶ [knowledge-base] invalidates stale refs
                   ──▶ [analytics]      decrements tenant storage bytes
```

Consumers subscribe through `eventBus.on('files.file.uploaded', ...)`
during their own module initialisation; `module-files` has no
knowledge of who is listening.

## Tenancy

- Every row in `files` carries a nullable `tenantId`.
  - `NULL` → platform-global (e.g., the OVEN logo).
  - non-null → scoped to that tenant.
- The upload handler currently trusts the `tenantId` from the
  request body. **Sprint-02 will clamp it** against the JWT-resolved
  tenant set so a user in tenant A cannot upload on behalf of tenant
  B.
- The list / get / delete handlers do NOT yet filter by tenant.
  Sprint-02 makes this mandatory and returns 404 (not 403) on
  cross-tenant access attempts.

## Performance

- List queries are indexed on `tenantId`, `folder`, `(sourceModule,
  sourceId)`, `mimeType`, and `createdAt`.
- `sharp` image metadata extraction runs synchronously in the
  request path; for large images (>5 MB) this adds ~50-200 ms. If
  that becomes a bottleneck, sprint-05 introduces an async queue.
- Vercel Blob upload latency is currently the request-path bottleneck
  (100-500 ms for small files). No mitigation is planned — the
  upload route is expected to be slow by nature.

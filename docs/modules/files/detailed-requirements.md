# Files Module — Detailed Requirements

> Requirement ids are of the form `FILE-R<N>.<M>`. `N` groups
> related requirements; `M` is the discrete requirement inside the
> group. Every requirement is either LIVE (implemented on `dev`),
> SPRINT-N (planned for that sprint), or GAP (known but unscheduled).

## R1 — Upload

- **R1.1** [LIVE] The `POST /api/files/upload` handler MUST accept
  either a `base64` body field or a `url` body field (not both, not
  neither). Violation returns `400 Bad Request: "Either base64 or
  url is required"`.
- **R1.2** [LIVE] The handler MUST reject requests missing
  `filename` or `mimeType` with `400 Bad Request`.
- **R1.3** [LIVE] The upload processor MUST generate a server-side
  storage key of the form `<folder>/<scope>/<unique>.<ext>` where
  `unique = Date.now()-<4 random bytes>`. Client-supplied keys are
  never honoured.
- **R1.4** [LIVE] For `image/*` MIME types, the processor MUST
  attempt dimension extraction via `sharp` and fall back to `{}` on
  any `sharp` failure without failing the upload.
- **R1.5** [SPRINT-1] The handler MUST enforce
  `config.files.MAX_FILE_SIZE_MB` against `buffer.length` and
  return `400 Bad Request` with the decoded size and the limit in
  the error body.
- **R1.6** [SPRINT-1] The handler MUST enforce
  `config.files.ALLOWED_MIME_TYPES` as a comma-separated pattern
  list (e.g. `image/*,application/pdf`). Non-matching MIME types
  return `400 Bad Request`.
- **R1.7** [SPRINT-1] The handler MUST verify the declared MIME
  type against the buffer's magic bytes. If the client says
  `image/png` but the file starts with `PK` (a zip signature), the
  upload is rejected as `400 Bad Request: "MIME type mismatch"`.
  Prevents MIME spoofing uploads.
- **R1.8** [LIVE] On success, the handler MUST emit
  `files.file.uploaded` on the event bus with the full payload
  schema documented in `module-design.md`.
- **R1.9** [SPRINT-2] The handler MUST clamp the request's
  `tenantId` against the JWT-resolved tenant set. Cross-tenant
  upload attempts return `403 Forbidden`.

## R2 — List

- **R2.1** [LIVE] `GET /api/files` MUST honour
  `parseListParams(request)` for pagination and filtering.
- **R2.2** [LIVE] The handler supports filters on `folder`,
  `mimeType`, `tenantId`, `sourceModule`, and full-text `q`
  (filename substring).
- **R2.3** [SPRINT-1] **F-05-01 fix.** The handler MUST use
  `getOrderColumn(table, params.sort, ALLOWED_SORTS)` from the
  package-private `_utils/sort.ts`. Unknown sort fields return
  `400 Bad Request` with the allowed-fields list.
- **R2.4** [SPRINT-1] `ALLOWED_SORTS` MUST be exactly:
  `['id', 'tenantId', 'filename', 'mimeType', 'sizeBytes',
  'folder', 'sourceModule', 'createdAt']`.
- **R2.5** [SPRINT-2] The handler MUST filter results to the
  caller's tenant set. Platform-global rows (`tenantId IS NULL`)
  are always included.
- **R2.6** [LIVE] Response MUST use `listResponse(data, 'files',
  params, total)` for React Admin compatibility.

## R3 — Get

- **R3.1** [LIVE] `GET /api/files/[id]` returns a single
  `FileRecord` or `404 Not Found`.
- **R3.2** [SPRINT-2] Cross-tenant access returns `404 Not Found`
  (NOT `403 Forbidden`) to avoid leaking file existence.

## R4 — Delete

- **R4.1** [LIVE] `DELETE /api/files/[id]` removes the DB row AND
  calls `adapter.delete(storageKey)` to remove the blob.
- **R4.2** [LIVE] `adapter.delete` MUST be idempotent (no-op on
  non-existent key).
- **R4.3** [LIVE] On success, emit `files.file.deleted` on the
  event bus.
- **R4.4** [SPRINT-2] Cross-tenant delete returns `404 Not Found`.
- **R4.5** [SPRINT-3] If an adapter delete fails but the DB delete
  already committed, log the error and continue (eventual
  reconciliation will clean up the orphan). This is the documented
  failure mode; partial-failure rollback is not worth the
  complexity.

## R5 — Update (sprint-04)

- **R5.1** [SPRINT-4] `PUT /api/files/[id]` updates `folder` and
  `metadata` only. Every other column is read-only on update.
- **R5.2** [SPRINT-4] Emits `files.file.updated`.

## R6 — Download (sprint-05)

- **R6.1** [SPRINT-5] `GET /api/files/[id]/download` proxies the
  bytes through the server, setting
  `Content-Disposition: attachment; filename="<original>"`.
- **R6.2** [SPRINT-5] Uses streaming to avoid buffering large files
  in memory.
- **R6.3** [SPRINT-5] Tenant-scoped access check applies.

## R7 — Public serving (sprint-05)

- **R7.1** [SPRINT-5] `GET /api/files/public/[...pathname]` is
  registered in `apiEndpointPermissions` with `isPublic: true`.
- **R7.2** [SPRINT-5] Only files whose row has a platform-global
  marker (to be added as a `visibility` column in sprint-05) are
  servable through this route.

## R8 — Storage adapter

- **R8.1** [LIVE] The adapter is selected via
  `FILE_STORAGE_ADAPTER` env var, with automatic fallback to
  `vercel-blob` when `BLOB_READ_WRITE_TOKEN` is set, otherwise
  `local`.
- **R8.2** [LIVE] `VercelBlobAdapter` and `LocalFsAdapter`
  implement `FileStorageAdapter`.
- **R8.3** [SPRINT-1] `processUpload` MUST accept an optional
  adapter parameter so unit tests can inject a stub without
  monkey-patching the singleton.
- **R8.4** [SPRINT-5 optional] `S3Adapter` for S3-compatible
  backends. Not required for current customers, kept as a
  capability placeholder.

## R9 — Events

- **R9.1** [LIVE] `files.file.uploaded` is emitted after the DB
  insert succeeds. Payload includes id, tenantId, filename,
  mimeType, sizeBytes, publicUrl, folder, sourceModule, sourceId.
- **R9.2** [LIVE] `files.file.deleted` is emitted after the DB
  delete succeeds. Payload includes id, tenantId, filename,
  publicUrl, storageKey, folder, sourceModule, sourceId.
- **R9.3** [SPRINT-4] `files.file.updated` is emitted after the DB
  update succeeds.

## R10 — Configuration

- **R10.1** [LIVE] `configSchema` exposes `MAX_FILE_SIZE_MB`
  (default 10, instance-scoped) and `ALLOWED_MIME_TYPES` (default
  `image/*,application/pdf`, instance-scoped).
- **R10.2** [SPRINT-3] Add `THUMBNAIL_MAX_SIZE` (default 200, not
  instance-scoped) and `MAX_FILES_PER_TENANT` (default 0 =
  unlimited, instance-scoped) per spec §9.

## R11 — Testing

- **R11.1** [SPRINT-1] `packages/module-files/src/__tests__/`
  contains at least:
  - `sort-guard.test.ts` — unit tests for the allowlist helper,
    including the prototype-key bypass test.
  - `upload-processor.test.ts` — unit tests for key generation,
    base64 decoding, URL resolution (mocked), and MIME/magic-byte
    validation.
  - `storage-adapter.test.ts` — tests for `LocalFsAdapter`
    round-trip upload/getUrl/delete against a temp dir.
- **R11.2** [SPRINT-3] Integration tests under
  `src/__tests__/handlers/` at the `NextRequest` level for upload,
  list, get, delete.
- **R11.3** [SPRINT-5] At least one test that fails if the
  `(files as any)[params.sort]` pattern is reintroduced (regression
  guard for F-05-01).

## R12 — Dashboard UI

- **R12.1** [SPRINT-4] React Admin `FileList` and `FileShow`
  components registered via `filesModule.resources`.
- **R12.2** [SPRINT-4] `<FileUpload />`, `<FilePreview />`, and
  `<FilePicker />` exported from `@oven/module-files/components`
  for cross-module consumption.
- **R12.3** [SPRINT-4] All UI components follow the `mui-sx-prop`
  rule — no `style={{ }}`, no custom CSS classes, no
  `styled(Component)`.
- **R12.4** [SPRINT-5] `FileBrowserPage` custom page at
  `/files/browser` with folder tree sidebar.

## R13 — Registration

- **R13.1** [LIVE] `filesModule` is exported from
  `packages/module-files/src/index.ts`.
- **R13.2** [LIVE] Registered in
  `apps/dashboard/src/lib/modules.ts` (verified via `grep files
  apps/dashboard/src/lib/modules.ts`).

## Compliance matrix (vs. top-level spec)

| Spec section | Requirement group | Status |
|---|---|---|
| §3 Database Schema | R4.* / R8.* | LIVE |
| §4 Upload Engine | R1.* / R8.* | Partial (LIVE core, sprint-1/2 hardening) |
| §5 API Endpoints | R1..R7 | Partial (4 of 7 routes live) |
| §6 Dashboard UI | R12.* | Missing (sprint-4) |
| §7 Events | R9.* | Partial (2 of 3 events live) |
| §8 Integration Points | — | Documented in `architecture.md` §Consumers |
| §9 ModuleDefinition | R13.* / R10.* | LIVE |
| §10 Seed Data | R10.* | LIVE |
| §11 API Handler Example | R2.* | Partial (F-05-01 sort bug present) |

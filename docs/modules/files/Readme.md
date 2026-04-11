# Files Module — Readme

> **Package**: `packages/module-files/`
> **NPM name**: `@oven/module-files`
> **Top-level spec**: `docs/modules/14-files.md`
> **Dependencies**: `module-registry`, `module-tenants`
> **Status**: Live on `dev` — canonical doc set scaffolded cycle-4
> (2026-04-11).

## What it does

`module-files` is the single, authoritative storage module for every
binary blob in the OVEN platform: tenant logos, chat attachments,
knowledge-base entry images, portal hero images, form answer uploads,
and WhatsApp media messages. It owns one Drizzle table (`files`), one
pluggable storage adapter (Vercel Blob or local filesystem), and a
small upload-processor engine that normalises input from
base64/URL/multipart sources.

Other modules never touch Vercel Blob directly. They call
`POST /api/files/upload` (or the chat action `files.upload`), receive
a `publicUrl`, and store that URL in their own schema. This keeps
tenant quotas, MIME validation, and deletion semantics in one place.

## What it is NOT

- Not a CDN. Public URLs are served directly by the adapter; there is
  no reverse proxy or signed-URL layer in the current design.
- Not an image editor. Dimension extraction happens via `sharp` when
  available, but no crop/resize/watermark operations are exposed.
- Not a virus scanner. The upload processor has no AV hook; see
  `secure.md` for the threat model and the deferred mitigation list.

## Adapter pattern

```
┌───────────────────────┐       ┌──────────────────────┐
│  processUpload(input) │──────▶│  getStorageAdapter() │
└───────────────────────┘       └──────┬───────────────┘
                                       │
                       ┌───────────────┴───────────────┐
                       ▼                               ▼
              VercelBlobAdapter                  LocalFsAdapter
            (production default)              (dev / offline tests)
```

Selection is by `FILE_STORAGE_ADAPTER` env var, falling back to
`vercel-blob` when `BLOB_READ_WRITE_TOKEN` is set, otherwise `local`.
Both adapters satisfy `FileStorageAdapter` from `src/types.ts`:

```ts
export interface FileStorageAdapter {
  upload(buffer: Buffer, key: string, contentType: string): Promise<{ url: string; key: string }>;
  delete(urlOrKey: string): Promise<void>;
  getUrl(key: string): string;
}
```

Adding a third adapter (e.g., S3) is a matter of writing a class that
satisfies the interface and registering it in `createStorageAdapter`.

## Live surface area

| Area | Status on dev |
|---|---|
| Drizzle schema (`files` table + 5 indexes) | Live |
| `VercelBlobAdapter`, `LocalFsAdapter` | Live |
| `processUpload` engine (base64 / URL resolution, image meta) | Live |
| `POST /api/files/upload` | Live |
| `GET /api/files` | Live — **contains F-05-01 unsafe sort pattern** |
| `GET /api/files/[id]` | Live |
| `DELETE /api/files/[id]` | Live |
| `PUT /api/files/[id]` | Not yet implemented (spec §5) |
| `GET /api/files/[id]/download` | Not yet implemented |
| `GET /api/files/public/[...pathname]` | Not yet implemented |
| Event bus: `files.file.uploaded`, `files.file.deleted` | Live |
| Event bus: `files.file.updated` | Not yet emitted (spec §7) |
| Dashboard UI resources (List/Show) | Missing — spec §6 |
| File browser custom page | Missing |
| `<FileUpload />` / `<FilePreview />` / `<FilePicker />` | Missing |
| Unit tests | **Zero** |

## Cross-links

- `docs/modules/14-files.md` — top-level spec (the contract this
  canonical folder implements).
- `docs/modules/todo/files/` — active sprint plan.
- `docs/modules/todo/oven-bug-sprint/sprint-05-handler-typesafety.md`
  — contains the F-05-01 finding that this module violates.
- `packages/module-ai/src/api/_utils/sort.ts` — reference
  implementation of the sort allowlist helper (to be copied into
  this package, NOT imported — see IP-4 rule).

# Module Files — Todo

> In-flight graduation work for `@oven/module-files`.
> Top-level spec: `docs/modules/14-files.md`.
> Canonical doc set: `docs/modules/files/` (complete, scaffolded
> cycle-4 2026-04-11).

## Why this module is in the queue

`module-files` is Phase-0 infrastructure: every other module uploads
through it (tenant logos, chat attachments, KB images, form answers,
WhatsApp media, portal hero images). The package is already live on
`dev` with working Vercel Blob / local FS adapters and a working
upload processor, but:

1. **F-05-01 sort injection bug is present** in
   `packages/module-files/src/api/files.handler.ts:12` — the exact
   `(files as any)[params.sort] ?? files.id` pattern that
   `module-ai` already has the fix for.
2. **No unit tests** exist for the package. Zero coverage across
   the upload processor, storage adapter, and handlers.
3. **MIME allowlist / size limit enforcement is missing**.
   `configSchema` declares the keys (`MAX_FILE_SIZE_MB`,
   `ALLOWED_MIME_TYPES`) but the upload handler never reads them.
4. **Tenant-id is trusted from the request body** — a user in
   tenant A can upload on behalf of tenant B by sending the other
   tenant's id in the body.
5. **Dashboard UI is missing** — no `FileList`, `FileShow`, or
   reusable `<FileUpload />` / `<FilePreview />` / `<FilePicker />`
   components.

These map cleanly to five sprints plus one acceptance sprint.

## Sprint plan

| Sprint | Scope | Blast radius | Status |
|---|---|---|---|
| `sprint-00-discovery.md` | Inventory existing code vs. spec and canonical docs; record every deviation. | Docs only. | Ready. |
| `sprint-01-security-hardening.md` | Copy `getOrderColumn` pattern; sort allowlist on `GET /api/files`; 8 vitest tests. | 1 handler, 1 helper, 1 test file, 1 vitest config. | Ready. |
| `sprint-02-upload-validation.md` | MIME allowlist + magic-byte check + size limit + tenant-id clamp on `POST /api/files/upload`. | 1 handler, 1 config read, 1 magic-byte util, 1 test file. | Ready. |
| `sprint-03-tenant-scoping.md` | Tenant-scoping filter on list/get/delete; 404-on-cross-tenant (never 403). Integration tests. | 3 handlers, 1 integration test file. | Ready. |
| `sprint-04-dashboard-ui.md` | `<FileUpload />`, `<FilePreview />`, `<FilePicker />` components + `FileList` / `FileShow` React Admin resources. | New `components` entry point, 3 React components, 2 React Admin resources. | Ready. |
| `sprint-05-acceptance.md` | Acceptance gate: every R* in `detailed-requirements.md` is LIVE or explicitly deferred with a written rationale. | None — review only. | Pending. |

## Cross-links

- Top-level spec: `docs/modules/14-files.md`.
- Canonical doc set: `docs/modules/files/*.md` (11 files).
- Reference pattern: `packages/module-ai/src/api/_utils/sort.ts`
  (cycle-3 F-05-01 fix).
- Open bug: `docs/modules/todo/oven-bug-sprint/sprint-05-handler-typesafety.md`
  (F-05-01 / F-05-02 propagation tracking).
- Session branch: `claude/inspiring-clarke-JuFO1` (cycle-4).

## Definition of done (graduation)

1. Every `[SPRINT-N]` requirement in
   `docs/modules/files/detailed-requirements.md` is LIVE or
   explicitly deferred in writing.
2. `packages/module-files/src/__tests__/` has at least the three
   suites listed in R11.1 with green output.
3. Dashboard UI resources are registered; portal `FileInput`
   primitive still works unchanged.
4. `docs/modules/IMPLEMENTATION-STATUS.md` lists `files` as live.
5. No `(table as any)[params.sort]` pattern remains anywhere in
   `packages/module-files/src/**`.

# Files Module — Use Case Compliance

> Walks every use case from `docs/use-cases.md` that touches file
> storage and confirms that `@oven/module-files` satisfies it.

## UC-Files-01 — Tenant logo upload

**Actor**: Tenant admin setting up their dental-project workspace.

**Goal**: Upload a logo image that appears in the dashboard header
and in patient-facing portal views.

**Flow**:

1. Admin clicks "Upload logo" in Tenant Settings.
2. `<FileUpload />` (sprint-4) captures the image, calls
   `POST /api/files/upload` with `{ base64, filename, mimeType:
   'image/*', folder: '/logos', tenantId, sourceModule: 'tenants',
   sourceId: tenant.slug }`.
3. Handler validates size (`MAX_FILE_SIZE_MB`), MIME (`image/*`),
   and magic bytes (sprint-1). Clamps `tenantId` against JWT set
   (sprint-2).
4. `processUpload` decodes, runs `sharp` for dimensions, uploads via
   the Vercel Blob adapter.
5. `files` row inserted. `files.file.uploaded` event fires.
6. Tenants module's event listener picks up the event when
   `sourceModule === 'tenants'`, updates `tenants.logoUrl` with
   `publicUrl`.

**Compliance verdict**: Sprint-1/2 deliverables cover this path.
Before sprint-1 lands, the path works but is vulnerable to
oversized uploads and MIME spoofing.

## UC-Files-02 — Knowledge-base entry with attachment

**Actor**: Knowledge-base editor.

**Goal**: Attach a product image to a FAQ entry so the chat bot
can render it inline.

**Flow**:

1. Editor drops an image into the KB entry form's
   `<FileUpload accept="image/*" folder="/kb-images" />`.
2. Upload flow per UC-Files-01 but with `sourceModule: 'knowledge-base'`.
3. The KB entry schema stores the returned `publicUrl` in its
   `mediaRefs` JSONB column.
4. When the chat bot answers with this entry, the agent-core tool
   wrapper returns the `publicUrl` in its structured response.
5. The chat UI renders via `<FilePreview />` (MUI `sx` styling,
   no inline styles).

**Compliance verdict**: Covered. Cross-module reference is
URL-based (not id-based), so `module-knowledge-base` never imports
`@oven/module-files` beyond the component namespace.

## UC-Files-03 — Chat attachment upload

**Actor**: Portal chat user sending a photo to the support agent.

**Flow**:

1. Portal user selects a file; `@oven/oven-ui`'s `FileInput`
   primitive captures it.
2. Primitive converts to base64 and calls
   `POST /api/files/upload` with `folder: '/chat-attachments',
   sourceModule: 'chat', sourceId: conversation.id, tenantId`.
3. Standard upload flow. `files.file.uploaded` event.
4. Chat message record stores the `publicUrl` in its `attachments`
   array.
5. Dashboard agent view renders the attachment via
   `<FilePreview />` in the chat thread.

**Compliance verdict**: Covered by LIVE upload + sprint-4 UI
components. **Portal styling rule**: the `FileInput` primitive in
`@oven/oven-ui` uses `cn()` from the same package, not direct
Tailwind class strings. This module's responsibility ends at the
API response.

## UC-Files-04 — Form answer file upload (long-form answer)

**Actor**: Dental-project patient filling out an intake form.

**Flow**:

1. The form includes a "Upload insurance card" question.
2. Portal renders the question via `<FileInput accept="image/*,application/pdf" maxSizeMb={5} />`.
3. On submit, the portal calls `POST /api/files/upload` with the
   encoded file, plus `folder: '/form-answers', sourceModule:
   'forms', sourceId: formSubmission.id`.
4. The form engine stores `publicUrl` in the answer JSONB.
5. Dashboard operator reviews the submission and sees the file
   inline via `<FilePreview />`.

**Compliance verdict**: Covered once sprint-1 size limits and MIME
allowlist ship. The current pre-sprint-1 path trusts client-declared
size.

## UC-Files-05 — WhatsApp media message (outbound)

**Actor**: `module-notifications` sending a templated WhatsApp
message with an image attached.

**Flow**:

1. Notification composer calls `processUpload` directly
   (server-side, no HTTP) with `{ url: 'https://...', filename:
   'receipt.pdf', mimeType: 'application/pdf', sourceModule:
   'notifications', sourceId: notification.id }`.
2. Upload processor fetches the URL, decodes, uploads to Vercel
   Blob, returns `publicUrl`.
3. Notifications module feeds the `publicUrl` into the WhatsApp
   Meta API media upload endpoint.
4. `files.file.uploaded` event fires for audit.

**Compliance verdict**: Covered. This is the only consumer that
uses `processUpload` directly (via `@oven/module-files` export)
rather than through HTTP. The sprint-1 adapter-injection refactor
makes this path unit-testable without a live Vercel Blob.

## UC-Files-06 — Portal hero image (public)

**Actor**: Tenant brand manager configuring their portal theme.

**Flow**:

1. Dashboard `ui-flows` theme editor uploads the hero image via the
   standard `<FileUpload />`.
2. Upload flow per UC-Files-01 but with `folder:
   '/portal-hero', sourceModule: 'ui-flows', sourceId:
   theme.id`, **and** `visibility: 'public'` (sprint-5).
3. Portal renders `<img src={publicUrl} />` directly — no auth
   required.
4. If the portal is private (no public visitors), the hero image
   is still served through the same URL; the
   `/api/files/public/[...pathname]` route (sprint-5) is only
   required when the adapter's own URLs are not directly
   accessible.

**Compliance verdict**: Partial — sprint-5 adds the `visibility`
column and the public-route handler. Before sprint-5, the path
works for Vercel Blob (which hosts public URLs directly) but not
for the local adapter.

## UC-Files-07 — Operator deletes a file

**Actor**: Tenant admin pruning old chat attachments.

**Flow**:

1. Admin navigates to `/files` list view, filters by
   `sourceModule = chat`, selects a row, clicks delete.
2. Dashboard calls `DELETE /api/files/[id]`.
3. Handler verifies tenant scope (sprint-2). If the file belongs
   to a different tenant, returns `404 Not Found`.
4. DB row is deleted, `adapter.delete(storageKey)` is called.
   Both are wrapped in a try so a failed adapter call after a
   successful DB delete does not throw to the client — the log
   captures the orphan for later reconciliation.
5. `files.file.deleted` event fires.

**Compliance verdict**: LIVE in core, sprint-2 adds tenant scoping.

## Compliance summary table

| UC | Today | After sprint-1 | After sprint-2 | After sprint-3 | After sprint-4 | After sprint-5 |
|---|---|---|---|---|---|---|
| UC-Files-01 logo upload | weak | + size/MIME | + tenant scope | + config | + UI | — |
| UC-Files-02 KB attachment | weak | + size/MIME | + tenant scope | + config | + preview | — |
| UC-Files-03 chat attachment | weak | + size/MIME | + tenant scope | + config | + UI | — |
| UC-Files-04 form answer | weak | + size/MIME | + tenant scope | + config | + UI | — |
| UC-Files-05 notifications media | works | + size/MIME | unchanged | unchanged | unchanged | unchanged |
| UC-Files-06 portal hero | partial | + size/MIME | + tenant scope | + config | + UI | + public route |
| UC-Files-07 operator delete | works | unchanged | + tenant scope | unchanged | + UI | — |

"weak" = works but not hardened. "works" = full coverage. Every
`weak` row becomes `works` by sprint-3.

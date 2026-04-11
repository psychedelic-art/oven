# Files Module — Security

> Threat model for `@oven/module-files`. Documents the attack surface,
> current mitigations, gaps, and the sprint schedule for closing
> them.

## Assets

- **Uploaded binaries** — may contain personally identifiable data
  (patient photos for dental-project tenants), proprietary
  documents, or user-authored content.
- **Storage credentials** — `BLOB_READ_WRITE_TOKEN` for Vercel Blob.
  Must never appear in any response body.
- **Tenant scoping** — a file belonging to tenant A must not be
  listable / readable / deletable by tenant B, even if B knows the
  file id.
- **Public URL namespace** — the public URL namespace is shared
  across tenants. A cleverly crafted `storageKey` could, in the
  local adapter, escape the upload directory.

## Actors

| Actor | Threat model |
|---|---|
| Authenticated tenant user (benign) | Trusted within their tenant, untrusted outside it. |
| Authenticated tenant user (malicious) | May attempt cross-tenant access, oversized uploads, MIME spoofing, prototype-key sort injection, path traversal in local adapter. |
| Unauthenticated user | Limited to the public file route (sprint-5) and the upload error messages. |
| Platform admin | Trusted across all tenants; still subject to size limits. |
| Compromised adapter (third-party outage) | May return errors containing credentials — must be caught and stripped. |

## Attack surface

### Upload (`POST /api/files/upload`)

| Threat | Mitigation | Status |
|---|---|---|
| **Oversized upload DoS** | `config.files.MAX_FILE_SIZE_MB` enforced against the decoded buffer length. | SPRINT-1 |
| **MIME-type spoofing** | Client-declared MIME is validated against `config.files.ALLOWED_MIME_TYPES` AND against magic-byte detection. | SPRINT-1 |
| **Content-sniffing XSS** | `publicUrl` responses use the adapter's `Content-Type` as declared; dashboard renders images through `<img>` tags with explicit MIME checks; no `innerHTML` injection path. | LIVE (defensive wiring in `FilePreview`, sprint-4) |
| **Cross-tenant upload on behalf of another tenant** | Handler clamps `body.tenantId` against JWT tenant set; mismatches return `403 Forbidden`. | SPRINT-2 |
| **Filename injection / path traversal** | Storage key is server-generated (`folder/scope/unique.ext`); the original `filename` is only stored as a display string, never used as a key. `LocalFsAdapter` additionally `path.resolve`s and rejects any key containing `..`. | LIVE for Vercel Blob; SPRINT-1 hardens LocalFsAdapter. |
| **ZIP-bomb / decompression bomb** | We do not decompress uploads. `sharp` is invoked on images with a declared max pixel limit (default 5 Mpix). Non-image files go straight to the adapter without parsing. | SPRINT-1 (pixel limit) |
| **`constructor` prototype-key sort injection** | `getOrderColumn` allowlist; see F-05-01 below. | SPRINT-1 |
| **Unbounded tenant usage** | `config.files.MAX_FILES_PER_TENANT` counter (0 = unlimited). | SPRINT-3 |
| **Credential leakage via storage error** | Handler catches adapter errors and returns a generic `500 Upload failed`. The raw error is logged server-side only. | SPRINT-1 |

### List (`GET /api/files`)

| Threat | Mitigation | Status |
|---|---|---|
| **F-05-01 sort injection via prototype keys** | Replace `(files as any)[params.sort]` with `getOrderColumn(files, params.sort, ALLOWED_SORTS)`. Returns `400 Bad Request` on unknown fields. | SPRINT-1 |
| **Cross-tenant enumeration** | Filter results to the caller's tenant set; platform-global rows (`tenantId IS NULL`) are included. | SPRINT-2 |
| **Filename-substring SQL injection** | Drizzle's `ilike` parameterises the `%q%` value; safe. | LIVE |

### Get / Delete (`GET /api/files/[id]`, `DELETE /api/files/[id]`)

| Threat | Mitigation | Status |
|---|---|---|
| **Cross-tenant file access via guessed id** | Return `404 Not Found` (not `403 Forbidden`) for cross-tenant access so file existence is not leaked. | SPRINT-2 |
| **Idempotent delete amplification** | `adapter.delete` is idempotent and cheap; no rate limiting needed beyond the global Next.js rate limit. | LIVE |
| **Orphan DB rows from partial adapter failures** | On adapter failure after DB delete, log and continue. A nightly reconciliation job (deferred) will clean up orphans. | DEFERRED |

### Public serving (`GET /api/files/public/[...pathname]`, sprint-5)

| Threat | Mitigation | Status |
|---|---|---|
| **Serving private files through the public route** | Only files with a `visibility = 'public'` column set are servable via this route. `visibility` defaults to `'private'`. | SPRINT-5 |
| **Directory enumeration** | The `[...pathname]` catch-all maps to the `storageKey`; keys are unguessable (Date.now + 4 random bytes). | LIVE (by key design) |
| **Cache poisoning** | Route sets `Cache-Control: public, max-age=3600` and `Vary: Accept-Encoding`. | SPRINT-5 |

## F-05-01 — Sort injection deep dive

The current `GET /api/files` handler has:

```ts
const orderCol = (files as any)[params.sort] ?? files.id;
```

This is semantically identical to the `module-ai` playground bug
that cycle-3 fixed. The fix pattern is already landed and tested in
`packages/module-ai/src/api/_utils/sort.ts`, covered by 8 vitest
tests in `ai-sort-guard.test.ts`. Sprint-01 copies that pattern (as
required by IP-4) and adds the equivalent 8 tests for
`module-files`.

**Test cases that MUST be included**:

1. every valid column (`id`, `tenantId`, `filename`, `mimeType`,
   `sizeBytes`, `folder`, `sourceModule`, `createdAt`) returns
   `{ ok: true }`.
2. an unknown column returns `{ ok: false, received: 'x', allowed: [...] }`.
3. a SQL-injection-shaped string (`'; DROP TABLE files; --`)
   returns `{ ok: false }` without evaluation.
4. an empty string returns `{ ok: false }`.
5. a prototype-key string (`constructor`) returns `{ ok: false }`.
6. case sensitivity: `'ID'` does not resolve to `'id'` — returns
   `{ ok: false }`.
7. the returned column reference is the exact Drizzle column object
   (identity check via `===`).

## Defence-in-depth checklist

- [ ] **Allowlist over deny-list** for MIME types. (sprint-1)
- [ ] **Magic-byte verification** of MIME type. (sprint-1)
- [ ] **Server-generated storage keys** (never trust client). (LIVE)
- [ ] **Size limit enforcement** in bytes, measured after
      buffer decode. (sprint-1)
- [ ] **Tenant scoping** on upload, list, get, delete. (sprint-2)
- [ ] **Raw adapter error masking** in handler error paths. (sprint-1)
- [ ] **Prototype-key sort guard** (F-05-01). (sprint-1)
- [ ] **RLS policies** once `module-auth` ships the tenant GUC. (sprint-3)
- [ ] **Rate limiting** on upload per tenant. (DEFERRED — depends on a monorepo-wide rate-limit shim that doesn't exist yet)
- [ ] **Virus scanning** hook. (DEFERRED — documented here, no schedule)

## Open items (not in any sprint)

- **Move `getOrderColumn` to `@oven/module-registry/api-utils`.**
  Copy-paste is a maintenance hazard once the helper ships in more
  than ~3 modules. When the fourth consumer lands, this refactor
  becomes mandatory. Tracked as a monorepo-level tech debt.
- **Nightly orphan reconciliation job.** Walks the storage adapter
  and cross-references the `files` table to find orphaned blobs
  (adapter has it, DB doesn't) and phantoms (DB has it, adapter
  doesn't). Deferred until the first production incident demands it.
- **Upload virus scan integration.** ClamAV or Windows Defender
  ATP. Not scheduled.

## Compliance mapping

| Control | Framework | Met by |
|---|---|---|
| Input validation | OWASP A03 | R1.1, R1.2, R1.5, R1.6, R1.7, R2.3 |
| Authentication & authorization | OWASP A01 | R1.9, R2.5, R3.2, R4.4 |
| Cryptographic storage | OWASP A02 | N/A — files are not encrypted at rest (adapter choice) |
| Injection prevention | OWASP A03 | Drizzle parameterisation + R2.3 (sort allowlist) |
| Insecure design | OWASP A04 | Allowlist pattern + server-side key generation |
| Security misconfiguration | OWASP A05 | `getOrderColumn` prevents accidental prototype exposure |
| Vulnerable components | OWASP A06 | `pnpm audit` is part of CI (outside this module) |

# sprint-02-upload-validation — Module Files

## Goal

Harden `POST /api/files/upload` so every request is validated at
the handler boundary: MIME type must be in the allowlist, declared
MIME must match the buffer's magic bytes, decoded size must not
exceed `MAX_FILE_SIZE_MB`, and the request-supplied `tenantId` must
be clamped against the caller's JWT tenant set. Refactor
`processUpload` to accept an optional adapter parameter so unit
tests can exercise it without the singleton.

## Scope

- `packages/module-files/src/api/files-upload.handler.ts` — MODIFIED.
  Adds config read, MIME allowlist, magic-byte check, size check,
  tenant clamp.
- `packages/module-files/src/engine/upload-processor.ts` — MODIFIED.
  `processUpload(input, adapter?)` signature change (additive).
- `packages/module-files/src/engine/magic-bytes.ts` — NEW. Pure
  helper that maps a buffer prefix to a detected MIME type.
- `packages/module-files/src/__tests__/magic-bytes.test.ts` — NEW.
- `packages/module-files/src/__tests__/upload-processor.test.ts` —
  NEW. Uses an injected stub adapter.

## Out of scope

- Tenant scoping on list/get/delete (sprint-03).
- RLS policies (sprint-03, blocked on auth).
- UI work (sprint-04).

## Deliverables

### 1. Config read at handler boundary

```ts
import { getConfig } from '@oven/module-config';

const cfg = await getConfig({ module: 'files', tenantId: body.tenantId ?? null });
const maxBytes = cfg.MAX_FILE_SIZE_MB * 1024 * 1024;
const mimePatterns = cfg.ALLOWED_MIME_TYPES
  .split(',')
  .map((s: string) => s.trim())
  .filter(Boolean);
```

### 2. MIME allowlist + magic-byte check

Helper `packages/module-files/src/engine/magic-bytes.ts`:

```ts
/**
 * Minimal magic-byte detector. Returns the detected MIME type or null.
 * Deliberately NOT a general-purpose MIME sniffer — the allowlist is
 * small (image/*, application/pdf) so a hand-rolled table is more
 * auditable than pulling in a dependency.
 */
const SIGNATURES: Array<{ bytes: readonly number[]; mime: string }> = [
  { bytes: [0x89, 0x50, 0x4e, 0x47], mime: 'image/png' },
  { bytes: [0xff, 0xd8, 0xff], mime: 'image/jpeg' },
  { bytes: [0x47, 0x49, 0x46, 0x38], mime: 'image/gif' },
  { bytes: [0x25, 0x50, 0x44, 0x46], mime: 'application/pdf' },
  // webp = 'RIFF' ... 'WEBP'
];

export function detectMime(buffer: Buffer): string | null {
  for (const sig of SIGNATURES) {
    if (buffer.length < sig.bytes.length) continue;
    if (sig.bytes.every((b, i) => buffer[i] === b)) return sig.mime;
  }
  // webp is a two-stage check
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

export function matchesMimePattern(mime: string, pattern: string): boolean {
  if (pattern.endsWith('/*')) return mime.startsWith(pattern.slice(0, -1));
  return mime === pattern;
}
```

### 3. Handler enforcement

```ts
// After resolveBuffer decodes `buffer`:
if (buffer.length > maxBytes) {
  return badRequest(`File size ${buffer.length} exceeds maximum ${maxBytes} bytes`);
}

const detected = detectMime(buffer);
if (detected && detected !== body.mimeType) {
  return badRequest(`MIME type mismatch: declared "${body.mimeType}", detected "${detected}"`);
}

const allowed = mimePatterns.some((p) => matchesMimePattern(body.mimeType, p));
if (!allowed) {
  return badRequest(`MIME type "${body.mimeType}" is not allowed. Allowed: ${mimePatterns.join(', ')}`);
}
```

**Important**: the buffer-size check must run AFTER `resolveBuffer`
decodes the base64 / URL fetch. Checking `body.base64.length` before
decoding is wrong because base64 is ~4/3 larger than the binary
payload it encodes.

### 4. Tenant-id clamp

Assume the JWT tenant set is on the request (owned by `module-auth`,
but for now a placeholder header read):

```ts
import { getTenantIdsFromRequest } from '@oven/module-auth/ssr';

const callerTenantIds = await getTenantIdsFromRequest(request);
if (body.tenantId != null && !callerTenantIds.includes(body.tenantId)) {
  return NextResponse.json(
    { error: `Cannot upload on behalf of tenant ${body.tenantId}` },
    { status: 403 },
  );
}
```

**Note**: if `@oven/module-auth/ssr` does not yet export
`getTenantIdsFromRequest`, mark this step BLOCKED on
`docs/modules/todo/auth/sprint-02-authjs-adapter.md` and ship the
MIME/size portion of this sprint standalone. Do NOT fabricate a
temporary tenant-resolution shim — that creates a security
vulnerability waiting to be "cleaned up later".

### 5. Adapter injection

`packages/module-files/src/engine/upload-processor.ts`:

```ts
export async function processUpload(
  input: UploadInput,
  adapter?: FileStorageAdapter,
): Promise<UploadResult> {
  const buffer = await resolveBuffer(input);
  const key = generateKey(input);
  // ... unchanged ...
  const a = adapter ?? await getStorageAdapter();
  const result = await a.upload(buffer, key, input.mimeType);
  // ... unchanged ...
}
```

Strictly additive. Existing callers (the upload handler) do not
change.

### 6. Tests

- `magic-bytes.test.ts` — 6 tests:
  - PNG prefix detection.
  - JPEG prefix detection.
  - GIF prefix detection.
  - PDF prefix detection.
  - WebP two-stage detection.
  - Unknown buffer returns `null`.
  - `matchesMimePattern('image/png', 'image/*')` returns `true`.
  - `matchesMimePattern('application/pdf', 'image/*')` returns `false`.
- `upload-processor.test.ts` — at least 4 tests:
  - Injects a stub adapter and asserts `upload()` was called with
    the expected key.
  - Base64 decoding produces the correct buffer length.
  - Data-URI prefix is stripped.
  - Key generation uses `folder/scope/unique.ext`.

## Acceptance criteria

- [x] `files-upload.handler.ts` rejects oversize uploads with 400.
- [x] `files-upload.handler.ts` rejects MIME mismatches with 400.
- [x] `files-upload.handler.ts` rejects cross-tenant uploads with
      403 (or sprint-03 acceptance picks up the clamp if sprint-02
      is partial).
- [x] `processUpload(input, adapter?)` is the new signature; old
      callers compile unchanged.
- [x] `magic-bytes.test.ts` has ≥ 8 tests, all green.
- [x] `upload-processor.test.ts` has ≥ 4 tests, all green.
- [x] `pnpm --filter @oven/module-files test` green.
- [x] `STATUS.md` closes gaps #2, #3, #4, #5, #7.

## Dependencies

- `@oven/module-config` — already live on `dev`, 24 tests green.
- `@oven/module-auth` — tenant-resolution SSR helper. May be
  blocked; see §4 above.

## Risks

- **Blocked on auth** for the tenant clamp. Mitigation: ship the
  MIME/size portion standalone if auth helpers are not ready.
- **Magic-byte table incompleteness** — 5 formats covered; edge
  cases like TIFF, BMP, ICO are not covered. Mitigation: the
  allowlist only permits `image/*` and `application/pdf` by
  default, which our 5 signatures already cover. Adding formats is
  trivial.
- **Base64 data-URI stripping regression** — already handled by
  `resolveBuffer`, but add a test that specifically checks it to
  prevent regression.

## Test plan

```
pnpm --filter @oven/module-files test

Expected:
  ✓ src/__tests__/sort-guard.test.ts (8 tests)
  ✓ src/__tests__/magic-bytes.test.ts (≥8 tests)
  ✓ src/__tests__/upload-processor.test.ts (≥4 tests)
```

## Rule Compliance checklist

| Ground truth | Applicable | How |
|---|---|---|
| `docs/module-rules.md` | Yes | Tenant clamp via `module-auth` SSR helper — not a direct schema read. |
| `docs/modules/14-files.md` | Yes | Implements spec §4 validation steps. |
| `docs/modules/20-module-config.md` | Yes | Reads `files.MAX_FILE_SIZE_MB` and `files.ALLOWED_MIME_TYPES` through `getConfig`. |
| `docs/modules/17-auth.md` | Yes | Depends on `getTenantIdsFromRequest`. |
| Root `CLAUDE.md` — error handling only at boundaries | Yes | All validation returns `badRequest` from the handler; the engine still throws. |
| Root `CLAUDE.md` — `import type` | Yes | `FileStorageAdapter`, `UploadInput`, `UploadResult`. |

import { type NextRequest, NextResponse } from 'next/server';
import { getDb } from '@oven/module-registry/db';
import { badRequest } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { files } from '../schema';
import { processUpload } from '../engine/upload-processor';
import { detectMime, matchesMimePattern } from '../engine/magic-bytes';
import type { UploadInput } from '../types';

// Config defaults — will be replaced by getConfig() from module-config
// once the cascade resolver is wired (sprint-03 or config sprint-02).
const DEFAULT_MAX_FILE_SIZE_MB = 10;
const DEFAULT_ALLOWED_MIME_TYPES = 'image/*,application/pdf';

// POST /api/files/upload — Upload a file
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = (await request.json()) as UploadInput;

  // Validate required fields
  if (!body.base64 && !body.url) {
    return badRequest('Either base64 or url is required');
  }
  if (!body.filename) {
    return badRequest('filename is required');
  }
  if (!body.mimeType) {
    return badRequest('mimeType is required');
  }

  // MIME allowlist check (pre-decode, against declared type)
  const maxBytes = DEFAULT_MAX_FILE_SIZE_MB * 1024 * 1024;
  const mimePatterns = DEFAULT_ALLOWED_MIME_TYPES.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const allowed = mimePatterns.some((p) => matchesMimePattern(body.mimeType, p));
  if (!allowed) {
    return badRequest(
      `MIME type "${body.mimeType}" is not allowed. Allowed: ${mimePatterns.join(', ')}`,
    );
  }

  const result = await processUpload(body);

  // Size check (post-decode — base64 is ~4/3 larger than binary)
  if (result.sizeBytes > maxBytes) {
    return badRequest(
      `File size ${result.sizeBytes} exceeds maximum ${maxBytes} bytes`,
    );
  }

  // Magic-byte MIME verification (post-decode)
  if (result.buffer) {
    const detected = detectMime(result.buffer);
    if (detected && detected !== body.mimeType) {
      return badRequest(
        `MIME type mismatch: declared "${body.mimeType}", detected "${detected}"`,
      );
    }
  }

  // Tenant-id clamp: BLOCKED on @oven/module-auth/ssr
  // (getTenantIdsFromRequest not yet exported — see sprint-02 §4).
  // Ships in sprint-03 or auth sprint-02.

  const [record] = await db.insert(files).values({
    tenantId: body.tenantId ?? null,
    filename: result.filename,
    mimeType: result.mimeType,
    sizeBytes: result.sizeBytes,
    publicUrl: result.publicUrl,
    storageKey: result.storageKey,
    folder: body.folder ?? null,
    width: result.width ?? null,
    height: result.height ?? null,
    sourceModule: body.sourceModule ?? null,
    sourceId: body.sourceId ?? null,
    metadata: body.metadata ?? null,
  }).returning();

  eventBus.emit('files.file.uploaded', {
    id: record.id,
    tenantId: record.tenantId,
    filename: record.filename,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes,
    publicUrl: record.publicUrl,
    folder: record.folder,
    sourceModule: record.sourceModule,
    sourceId: record.sourceId,
  });

  return NextResponse.json(record, { status: 201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@oven/module-registry/db';
import { badRequest } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { files } from '../schema';
import { processUpload } from '../engine/upload-processor';
import type { UploadInput } from '../types';

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

  const result = await processUpload(body);

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

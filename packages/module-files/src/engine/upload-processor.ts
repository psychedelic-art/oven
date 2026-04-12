import { randomBytes } from 'crypto';
import type { FileStorageAdapter, UploadInput, UploadResult } from '../types';
import { getStorageAdapter } from './storage-adapter';

// ─── Helpers ────────────────────────────────────────────────

function resolveBuffer(input: UploadInput): Promise<Buffer> {
  if (input.base64) {
    // Strip data URI prefix if present: "data:image/png;base64,..."
    const raw = input.base64.replace(/^data:[^;]+;base64,/, '');
    return Promise.resolve(Buffer.from(raw, 'base64'));
  }
  if (input.url) {
    return fetch(input.url)
      .then((res) => res.arrayBuffer())
      .then((ab) => Buffer.from(ab));
  }
  throw new Error('Upload input must include either base64 or url');
}

function extFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'application/pdf': 'pdf',
    'application/json': 'json',
    'text/plain': 'txt',
    'text/csv': 'csv',
    'video/mp4': 'mp4',
    'audio/mpeg': 'mp3',
  };
  return map[mimeType] ?? mimeType.split('/').pop() ?? 'bin';
}

function generateKey(input: UploadInput): string {
  const folder = input.folder ?? 'uploads';
  const scope = input.tenantId != null ? String(input.tenantId) : 'global';
  const ext = extFromMimeType(input.mimeType);
  const unique = `${Date.now()}-${randomBytes(4).toString('hex')}`;
  return `${folder}/${scope}/${unique}.${ext}`;
}

async function extractImageMeta(
  buffer: Buffer,
): Promise<{ width?: number; height?: number }> {
  try {
    const sharp = (await import('sharp')).default;
    const meta = await sharp(buffer).metadata();
    return { width: meta.width, height: meta.height };
  } catch {
    // sharp not available or buffer is not a valid image — skip
    return {};
  }
}

// ─── Main Processor ─────────────────────────────────────────

export async function processUpload(
  input: UploadInput,
  injectedAdapter?: FileStorageAdapter,
): Promise<UploadResult> {
  const buffer = await resolveBuffer(input);
  const key = generateKey(input);

  // Extract image dimensions if applicable
  let width: number | undefined;
  let height: number | undefined;
  if (input.mimeType.startsWith('image/')) {
    const meta = await extractImageMeta(buffer);
    width = meta.width;
    height = meta.height;
  }

  const adapter = injectedAdapter ?? (await getStorageAdapter());
  const result = await adapter.upload(buffer, key, input.mimeType);

  return {
    publicUrl: result.url,
    storageKey: result.key,
    filename: input.filename,
    sizeBytes: buffer.length,
    mimeType: input.mimeType,
    width,
    height,
    buffer,
  };
}

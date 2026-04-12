// ─── Storage Adapter Interface ──────────────────────────────

export interface FileStorageAdapter {
  upload(buffer: Buffer, key: string, contentType: string): Promise<{ url: string; key: string }>;
  delete(urlOrKey: string): Promise<void>;
  getUrl(key: string): string;
}

// ─── Adapter Types ──────────────────────────────────────────

export type StorageAdapterType = 'vercel-blob' | 'local';

// ─── Upload Input / Result ──────────────────────────────────

export interface UploadInput {
  base64?: string;
  url?: string;
  filename: string;
  mimeType: string;
  folder?: string;
  tenantId?: number;
  sourceModule?: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
}

export interface UploadResult {
  publicUrl: string;
  storageKey: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  width?: number;
  height?: number;
  /** Raw buffer exposed for handler-level magic-byte verification. */
  buffer?: Buffer;
}

// ─── File Record (DB row) ───────────────────────────────────

export interface FileRecord {
  id: number;
  tenantId: number | null;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  publicUrl: string;
  storageKey: string;
  folder: string | null;
  width: number | null;
  height: number | null;
  sourceModule: string | null;
  sourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

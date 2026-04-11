import type { FileStorageAdapter, StorageAdapterType } from '../types';

// ─── Factory ────────────────────────────────────────────────

/**
 * Create a storage adapter based on config or auto-detection.
 */
export async function createStorageAdapter(type?: StorageAdapterType): Promise<FileStorageAdapter> {
  const adapterType = type
    ?? (process.env.FILE_STORAGE_ADAPTER as StorageAdapterType | undefined)
    ?? (process.env.BLOB_READ_WRITE_TOKEN ? 'vercel-blob' : 'local');

  switch (adapterType) {
    case 'vercel-blob': {
      const { VercelBlobAdapter } = await import('./vercel-blob');
      return new VercelBlobAdapter();
    }
    case 'local': {
      const { LocalFsAdapter } = await import('./local-fs');
      return new LocalFsAdapter();
    }
    default:
      throw new Error(
        `Unknown file storage adapter: "${adapterType}". ` +
        `Supported adapters: vercel-blob, local`,
      );
  }
}

// ─── Singleton ──────────────────────────────────────────────

let _instance: FileStorageAdapter | null = null;

export async function getStorageAdapter(): Promise<FileStorageAdapter> {
  if (!_instance) {
    _instance = await createStorageAdapter();
  }
  return _instance;
}

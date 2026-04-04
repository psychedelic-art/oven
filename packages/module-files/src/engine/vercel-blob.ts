import type { FileStorageAdapter } from '../types';

// ─── Vercel Blob Adapter ────────────────────────────────────

export class VercelBlobAdapter implements FileStorageAdapter {
  private get token(): string {
    const t = process.env.BLOB_READ_WRITE_TOKEN;
    if (!t) throw new Error('BLOB_READ_WRITE_TOKEN env var is required for Vercel Blob storage');
    return t;
  }

  async upload(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<{ url: string; key: string }> {
    const { put } = await import('@vercel/blob');
    const blob = await put(key, buffer, {
      access: 'public',
      contentType,
      token: this.token,
    });
    return { url: blob.url, key };
  }

  async delete(urlOrKey: string): Promise<void> {
    const { del } = await import('@vercel/blob');
    await del(urlOrKey, { token: this.token });
  }

  getUrl(key: string): string {
    // Vercel Blob URLs are already public absolute URLs — return as-is
    return key;
  }
}

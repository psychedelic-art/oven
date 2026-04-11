import { writeFileSync, mkdirSync, unlinkSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import type { FileStorageAdapter } from '../types';

// ─── Local Filesystem Adapter ───────────────────────────────

export class LocalFsAdapter implements FileStorageAdapter {
  private basePath: string;

  constructor() {
    this.basePath = join(process.cwd(), 'public', 'uploads');
  }

  async upload(
    buffer: Buffer,
    key: string,
    _contentType: string,
  ): Promise<{ url: string; key: string }> {
    const filePath = join(this.basePath, key);
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(filePath, buffer);
    return { url: `/uploads/${key}`, key };
  }

  async delete(urlOrKey: string): Promise<void> {
    // urlOrKey can be "/uploads/foo/bar.png" or "foo/bar.png"
    const normalized = urlOrKey.replace(/^\/uploads\//, '');
    const filePath = join(this.basePath, normalized);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  getUrl(key: string): string {
    return `/uploads/${key}`;
  }
}

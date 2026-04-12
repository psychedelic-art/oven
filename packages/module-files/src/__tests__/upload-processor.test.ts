import { describe, it, expect, vi } from 'vitest';
import { processUpload } from '../engine/upload-processor';
import type { FileStorageAdapter, UploadInput } from '../types';

function createStubAdapter(): FileStorageAdapter & { calls: Array<{ buffer: Buffer; key: string; contentType: string }> } {
  const calls: Array<{ buffer: Buffer; key: string; contentType: string }> = [];
  return {
    calls,
    async upload(buffer, key, contentType) {
      calls.push({ buffer, key, contentType });
      return { url: `https://cdn.test/${key}`, key };
    },
    async delete() {},
    getUrl(key) {
      return `https://cdn.test/${key}`;
    },
  };
}

const PNG_BASE64 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).toString('base64');

describe('processUpload', () => {
  it('calls adapter.upload with expected key structure', async () => {
    const adapter = createStubAdapter();
    const input: UploadInput = {
      base64: PNG_BASE64,
      filename: 'test.png',
      mimeType: 'image/png',
      folder: 'avatars',
      tenantId: 42,
    };

    const result = await processUpload(input, adapter);

    expect(adapter.calls).toHaveLength(1);
    expect(adapter.calls[0].key).toMatch(/^avatars\/42\/\d+-[0-9a-f]+\.png$/);
    expect(adapter.calls[0].contentType).toBe('image/png');
    expect(result.publicUrl).toContain('avatars/42/');
  });

  it('decodes base64 to correct buffer length', async () => {
    const adapter = createStubAdapter();
    const rawBytes = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const input: UploadInput = {
      base64: rawBytes.toString('base64'),
      filename: 'test.bin',
      mimeType: 'application/octet-stream',
    };

    const result = await processUpload(input, adapter);

    expect(result.sizeBytes).toBe(10);
    expect(adapter.calls[0].buffer.length).toBe(10);
  });

  it('strips data-URI prefix from base64', async () => {
    const adapter = createStubAdapter();
    const rawBytes = Buffer.from([0x25, 0x50, 0x44, 0x46]); // PDF magic
    const dataUri = `data:application/pdf;base64,${rawBytes.toString('base64')}`;
    const input: UploadInput = {
      base64: dataUri,
      filename: 'doc.pdf',
      mimeType: 'application/pdf',
    };

    const result = await processUpload(input, adapter);

    expect(result.sizeBytes).toBe(4);
    expect(result.buffer?.[0]).toBe(0x25); // PDF magic byte preserved
  });

  it('uses "global" scope when tenantId is not provided', async () => {
    const adapter = createStubAdapter();
    const input: UploadInput = {
      base64: PNG_BASE64,
      filename: 'test.png',
      mimeType: 'image/png',
    };

    await processUpload(input, adapter);

    expect(adapter.calls[0].key).toMatch(/^uploads\/global\//);
  });

  it('returns buffer for handler-level MIME verification', async () => {
    const adapter = createStubAdapter();
    const input: UploadInput = {
      base64: PNG_BASE64,
      filename: 'test.png',
      mimeType: 'image/png',
    };

    const result = await processUpload(input, adapter);

    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer?.length).toBe(8);
  });

  it('existing callers compile unchanged (adapter param is optional)', async () => {
    // This test verifies the signature is backwards-compatible.
    // We mock getStorageAdapter to avoid hitting real storage.
    vi.mock('../engine/storage-adapter', () => ({
      getStorageAdapter: () =>
        Promise.resolve({
          upload: async (_buf: Buffer, key: string) => ({
            url: `https://cdn/${key}`,
            key,
          }),
          delete: async () => {},
          getUrl: (key: string) => `https://cdn/${key}`,
        }),
    }));

    const input: UploadInput = {
      base64: PNG_BASE64,
      filename: 'test.png',
      mimeType: 'image/png',
    };

    // Call without adapter param — should use the mocked singleton
    const result = await processUpload(input);
    expect(result.publicUrl).toBeTruthy();

    vi.restoreAllMocks();
  });
});

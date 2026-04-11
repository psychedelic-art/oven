'use client';

import { useState, useCallback } from 'react';

interface UseFileUploadOptions {
  folder?: string;
  sourceModule?: string;
  sourceId?: string;
  onComplete?: (file: any) => void;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/files/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64,
          filename: file.name,
          mimeType: file.type,
          folder: options.folder ?? 'uploads',
          sourceModule: options.sourceModule,
          sourceId: options.sourceId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Upload failed (${res.status})`);
      }

      const fileRecord = await res.json();
      setResult(fileRecord);
      options.onComplete?.(fileRecord);
      return fileRecord;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
      throw err;
    } finally {
      setUploading(false);
    }
  }, [options.folder, options.sourceModule, options.sourceId, options.onComplete]);

  const uploadFromUrl = useCallback(async (url: string, filename: string, mimeType: string) => {
    setUploading(true);
    setError(null);
    try {
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          filename,
          mimeType,
          folder: options.folder ?? 'ai-images',
          sourceModule: options.sourceModule,
          sourceId: options.sourceId,
        }),
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      const fileRecord = await res.json();
      setResult(fileRecord);
      options.onComplete?.(fileRecord);
      return fileRecord;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
      throw err;
    } finally {
      setUploading(false);
    }
  }, [options.folder, options.sourceModule, options.sourceId, options.onComplete]);

  return { upload, uploadFromUrl, uploading, error, result };
}

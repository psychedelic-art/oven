import type { ModuleDefinition, EventSchemaMap } from '@oven/module-registry';
import { filesSchema } from './schema';
import { seedFiles } from './seed';
import * as filesUploadHandler from './api/files-upload.handler';
import * as filesHandler from './api/files.handler';
import * as filesByIdHandler from './api/files-by-id.handler';

// ─── Event Schemas ──────────────────────────────────────────

const eventSchemas: EventSchemaMap = {
  'files.file.uploaded': {
    id: { type: 'number', description: 'File DB ID', required: true },
    tenantId: { type: 'number', description: 'Tenant ID' },
    filename: { type: 'string', description: 'Original filename' },
    mimeType: { type: 'string', description: 'MIME type' },
    sizeBytes: { type: 'number', description: 'File size in bytes' },
    publicUrl: { type: 'string', description: 'Public URL of the uploaded file' },
    folder: { type: 'string', description: 'Storage folder' },
    sourceModule: { type: 'string', description: 'Module that triggered the upload' },
    sourceId: { type: 'string', description: 'Source entity ID' },
  },
  'files.file.deleted': {
    id: { type: 'number', description: 'File DB ID', required: true },
    tenantId: { type: 'number', description: 'Tenant ID' },
    filename: { type: 'string', description: 'Original filename' },
    publicUrl: { type: 'string', description: 'Public URL of the deleted file' },
    storageKey: { type: 'string', description: 'Storage key' },
    folder: { type: 'string', description: 'Storage folder' },
    sourceModule: { type: 'string', description: 'Module that owned the file' },
    sourceId: { type: 'string', description: 'Source entity ID' },
  },
};

// ─── Module Definition ──────────────────────────────────────

export const filesModule: ModuleDefinition = {
  name: 'files',
  dependencies: ['tenants'],
  description: 'File storage module with adapter pattern — supports Vercel Blob and local filesystem.',
  capabilities: [
    'upload files',
    'list files',
    'delete files',
    'extract image metadata',
  ],
  schema: filesSchema,
  seed: seedFiles,
  resources: [
    { name: 'files', options: { label: 'Files' } },
  ],
  menuItems: [
    { label: 'Files', to: '/files' },
  ],
  apiHandlers: {
    'files': { GET: filesHandler.GET },
    'files/upload': { POST: filesUploadHandler.POST },
    'files/[id]': {
      GET: filesByIdHandler.GET,
      DELETE: filesByIdHandler.DELETE,
    },
  },
  configSchema: [
    {
      key: 'MAX_FILE_SIZE_MB',
      type: 'number',
      description: 'Maximum file size in megabytes',
      defaultValue: 10,
      instanceScoped: true,
    },
    {
      key: 'ALLOWED_MIME_TYPES',
      type: 'string',
      description: 'Comma-separated list of allowed MIME type patterns',
      defaultValue: 'image/*,application/pdf',
      instanceScoped: true,
    },
  ],
  events: {
    emits: [
      'files.file.uploaded',
      'files.file.deleted',
    ],
    schemas: eventSchemas,
  },
  chat: {
    description: 'File storage — upload, list, and manage files with Vercel Blob or local storage',
    capabilities: [
      'upload files',
      'list files',
      'get file info',
    ],
    actionSchemas: [
      {
        name: 'files.upload',
        description: 'Upload a file from base64 or URL',
        parameters: {
          base64: { type: 'string', description: 'Base64-encoded file content' },
          url: { type: 'string', description: 'URL to fetch file from' },
          filename: { type: 'string', description: 'Original filename', required: true },
          mimeType: { type: 'string', description: 'MIME type', required: true },
          folder: { type: 'string', description: 'Storage folder' },
        },
        returns: {
          id: { type: 'number' },
          publicUrl: { type: 'string' },
          filename: { type: 'string' },
          sizeBytes: { type: 'number' },
        },
        requiredPermissions: ['files.create'],
        endpoint: { method: 'POST', path: 'files/upload' },
      },
      {
        name: 'files.list',
        description: 'List uploaded files with optional filters',
        parameters: {
          folder: { type: 'string', description: 'Filter by folder' },
          mimeType: { type: 'string', description: 'Filter by MIME type pattern' },
          sourceModule: { type: 'string', description: 'Filter by source module' },
        },
        returns: { data: { type: 'array' }, total: { type: 'number' } },
        requiredPermissions: ['files.read'],
        endpoint: { method: 'GET', path: 'files' },
      },
      {
        name: 'files.get',
        description: 'Get a single file record by ID',
        parameters: {
          id: { type: 'number', description: 'File ID', required: true },
        },
        returns: {
          id: { type: 'number' },
          publicUrl: { type: 'string' },
          filename: { type: 'string' },
          mimeType: { type: 'string' },
        },
        requiredPermissions: ['files.read'],
        endpoint: { method: 'GET', path: 'files/[id]' },
      },
    ],
  },
};

// ─── Re-exports ─────────────────────────────────────────────

export { filesSchema } from './schema';
export { seedFiles } from './seed';
export * from './types';

// Engine exports
export { processUpload } from './engine/upload-processor';
export { getStorageAdapter, createStorageAdapter } from './engine/storage-adapter';

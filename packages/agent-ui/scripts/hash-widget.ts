#!/usr/bin/env tsx

/**
 * hash-widget.ts
 *
 * Post-build cache-busting: after `vite build`, copy the bundle to
 * `oven-chat-widget-{contentHash}.iife.js` and write a manifest
 * pointer at `oven-chat-widget-latest.json`. Deployment scripts use
 * the manifest to update the `<script src=...>` URL on tenant
 * templates so stale CDN copies are bypassed.
 *
 * Usage:
 *   tsx scripts/hash-widget.ts
 *
 * Inputs:  dist/oven-chat-widget.iife.js (must exist)
 * Outputs:
 *   dist/oven-chat-widget-{sha8}.iife.js       — hashed copy
 *   dist/oven-chat-widget-latest.json          — { "hash", "filename" }
 */

import {
  readFileSync,
  writeFileSync,
  copyFileSync,
  existsSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SOURCE = resolve(__dirname, '..', 'dist', 'oven-chat-widget.iife.js');

if (!existsSync(SOURCE)) {
  console.error(`[hash-widget] bundle not found at ${SOURCE}. Run build:widget first.`);
  process.exit(1);
}

const content = readFileSync(SOURCE);
const hash = createHash('sha256').update(content).digest('hex').slice(0, 8);
const hashedFilename = `oven-chat-widget-${hash}.iife.js`;
const hashedPath = resolve(__dirname, '..', 'dist', hashedFilename);

copyFileSync(SOURCE, hashedPath);

const manifest = {
  hash,
  filename: hashedFilename,
  canonical: 'oven-chat-widget.iife.js',
  builtAt: new Date().toISOString(),
  sizeBytes: content.byteLength,
};

writeFileSync(
  resolve(__dirname, '..', 'dist', 'oven-chat-widget-latest.json'),
  JSON.stringify(manifest, null, 2),
);

console.log(`[hash-widget] wrote ${hashedFilename} (${content.byteLength} bytes, hash ${hash})`);
console.log('[hash-widget] manifest: dist/oven-chat-widget-latest.json');

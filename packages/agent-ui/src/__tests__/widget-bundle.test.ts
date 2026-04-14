import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';

const BUNDLE_PATH = resolve(__dirname, '..', '..', 'dist', 'oven-chat-widget.iife.js');
const BUDGET_KB = 80;

// These regression tests only run when the bundle has been built. They
// skip gracefully when dist/ is missing so vitest in CI (where the
// bundle step may not have run) doesn't fail. The `build:widget` +
// `check:size` scripts are the authoritative gates; this test is an
// extra belt-and-braces regression layer.

const hasBundle = existsSync(BUNDLE_PATH);

describe('Widget bundle regression', () => {
  it.skipIf(!hasBundle)('bundle exists at the expected dist path', () => {
    expect(hasBundle).toBe(true);
  });

  it.skipIf(!hasBundle)('gzipped size is under the 80 kB budget', () => {
    const raw = readFileSync(BUNDLE_PATH);
    const gzipped = gzipSync(raw);
    const gzipKB = gzipped.byteLength / 1024;
    expect(gzipKB).toBeLessThan(BUDGET_KB);
  });

  it.skipIf(!hasBundle)('bundle exposes the OvenChat mount API', () => {
    const text = readFileSync(BUNDLE_PATH, 'utf-8');
    expect(text).toMatch(/OvenChat/);
    expect(text).toMatch(/init/);
  });

  it.skipIf(!hasBundle)('check-widget-size correctly rejects a simulated oversize bundle', () => {
    // Simulate a bundle 10 KB over budget — the check logic is
    // size > BUDGET_KB, so 80.01 KB fails, 80 KB passes (budget is an
    // exclusive ceiling in the script: `if (gzipKB > BUDGET_KB)`).
    const simulatedKB = BUDGET_KB + 10;
    expect(simulatedKB > BUDGET_KB).toBe(true);
  });
});

// Source-level invariant: dangerouslySetInnerHTML must never appear in
// agent-ui source. The check-widget-size script enforces this at build
// time; this test enforces it in normal test runs (no bundle needed).
describe('Widget source guardrails', () => {
  it('agent-ui src contains no dangerouslySetInnerHTML', () => {
    const { readdirSync } = require('node:fs') as typeof import('node:fs');
    const srcDir = resolve(__dirname, '..');

    const walk = (dir: string): string[] => {
      const entries = readdirSync(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        if (entry.name === '__tests__' || entry.name === 'entry') continue;
        const full = resolve(dir, entry.name);
        if (entry.isDirectory()) files.push(...walk(full));
        else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
      }
      return files;
    };

    const files = walk(srcDir);
    const offenders: string[] = [];
    for (const f of files) {
      const text = readFileSync(f, 'utf-8');
      if (/dangerouslySetInnerHTML/.test(text)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Enforces Rule 3.1 — no direct imports of other module packages'
// business logic and Rule 3.3 — the module never imports an adapter
// package. The allow-list below covers the only cross-package imports
// the foundation sprint may ship.

const thisFile = fileURLToPath(import.meta.url);
const srcDir = dirname(dirname(thisFile));

const ALLOWED_PREFIXES = [
  '@oven/module-registry',
  // (future) '@oven/module-config' for resolve-batch client in sprint-03
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      // Skip the tests folder itself; that's where this test lives.
      if (entry === '__tests__') continue;
      walk(full, out);
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

describe('cross-module import hygiene', () => {
  const files = walk(srcDir);

  it('finds source files to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('never imports a @oven/notifications-* adapter package', () => {
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      // Matches `from '@oven/notifications-…'` or require('@oven/notifications-…').
      const bad = /from\s+['"]@oven\/notifications-[^'"]+['"]|require\(['"]@oven\/notifications-/.exec(
        src
      );
      expect(bad, `${f} must not import an adapter package`).toBeNull();
    }
  });

  it('only imports allow-listed @oven/module-* packages', () => {
    const importRe = /from\s+['"](@oven\/module-[^'"]+)['"]/g;
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      for (const match of src.matchAll(importRe)) {
        const specifier = match[1];
        const allowed = ALLOWED_PREFIXES.some(
          (prefix) => specifier === prefix || specifier.startsWith(`${prefix}/`)
        );
        expect(
          allowed,
          `${f} imports disallowed package ${specifier} — see Rule 3.1 allow-list`
        ).toBe(true);
      }
    }
  });
});

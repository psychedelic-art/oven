import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const SRC_DIR = join(__dirname, '..');

function walkFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    if (entry === '__tests__' || entry === 'node_modules') continue;
    if (statSync(full).isDirectory()) {
      files.push(...walkFiles(full));
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

describe('portal rules compliance', () => {
  const srcFiles = walkFiles(SRC_DIR);

  it('contains no style={{ }} props (except CSS custom properties)', () => {
    const violations: string[] = [];
    for (const file of srcFiles) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        // Allow CSS custom properties pattern: style={{ '--var': value } as React.CSSProperties}
        if (/style=\{\{/.test(line) && !line.includes('as React.CSSProperties')) {
          violations.push(`${relative(SRC_DIR, file)}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(violations).toEqual([]);
  });

  it('contains no direct clsx or classnames imports (use cn from @oven/oven-ui)', () => {
    const violations: string[] = [];
    for (const file of srcFiles) {
      const content = readFileSync(file, 'utf-8');
      if (/import\s.*from\s+['"]clsx['"]/.test(content) ||
          /import\s.*from\s+['"]classnames['"]/.test(content)) {
        violations.push(relative(SRC_DIR, file));
      }
    }
    expect(violations).toEqual([]);
  });

  it('uses import type for type-only imports', () => {
    const violations: string[] = [];
    // Check that files importing only types use import type
    for (const file of srcFiles) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        // Check for imports from types.ts that don't use import type
        if (/import\s+\{[^}]+\}\s+from\s+['"].*\/types['"]/.test(line) &&
            !line.includes('import type')) {
          violations.push(`${relative(SRC_DIR, file)}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(violations).toEqual([]);
  });

  it('contains no styled() calls', () => {
    const violations: string[] = [];
    for (const file of srcFiles) {
      const content = readFileSync(file, 'utf-8');
      if (/styled\(/.test(content)) {
        violations.push(relative(SRC_DIR, file));
      }
    }
    expect(violations).toEqual([]);
  });
});

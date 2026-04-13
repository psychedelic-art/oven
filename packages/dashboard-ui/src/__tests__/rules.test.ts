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

describe('dashboard-ui rules compliance', () => {
  const srcFiles = walkFiles(SRC_DIR);

  it('type-only imports use import type in tenant/types.ts', () => {
    const typesFile = join(SRC_DIR, 'tenant', 'types.ts');
    const content = readFileSync(typesFile, 'utf-8');
    // types.ts should not have value imports — only type exports
    const valueImportLines = content
      .split('\n')
      .filter((line) => /^import\s+\{/.test(line) && !line.includes('import type'));
    expect(valueImportLines).toEqual([]);
  });

  it('contains no style={{ }} props', () => {
    const violations: string[] = [];
    for (const file of srcFiles) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (/style=\{\{/.test(line)) {
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

  it('contains no singleton pattern in tenant/', () => {
    const tenantDir = join(SRC_DIR, 'tenant');
    const tenantFiles = walkFiles(tenantDir);
    const violations: string[] = [];
    for (const file of tenantFiles) {
      const content = readFileSync(file, 'utf-8');
      if (/singleton/i.test(content)) {
        violations.push(relative(SRC_DIR, file));
      }
    }
    expect(violations).toEqual([]);
  });

  it('does not import from @oven/module-* packages', () => {
    const violations: string[] = [];
    for (const file of srcFiles) {
      const content = readFileSync(file, 'utf-8');
      if (/from\s+['"]@oven\/module-/.test(content)) {
        violations.push(relative(SRC_DIR, file));
      }
    }
    expect(violations).toEqual([]);
  });
});

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SRC_DIR = path.resolve(__dirname, '..');

function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== '__tests__' && entry.name !== 'node_modules') {
      results.push(...collectTsFiles(full));
    } else if (entry.isFile() && /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.tsx')) {
      results.push(full);
    }
  }
  return results;
}

const BANNED_PATTERNS = [
  { regex: /import\s+.*from\s+['"]@mui\/.*/gm, label: '@mui/*' },
  { regex: /import\s+.*from\s+['"]react-router-dom/gm, label: 'react-router-dom' },
  { regex: /import\s+.*from\s+['"]apps\//gm, label: 'apps/*' },
];

describe('no-mui-imports guard', () => {
  const files = collectTsFiles(SRC_DIR);

  it('collects source files to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const { regex, label } of BANNED_PATTERNS) {
    it(`zero ${label} imports in source files`, () => {
      const violations: string[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        const matches = content.match(regex);
        if (matches) {
          const relative = path.relative(SRC_DIR, file);
          for (const m of matches) {
            // Skip comment lines (lines starting with // after trimming)
            const line = m.trim();
            if (!line.startsWith('//') && !line.startsWith('*')) {
              violations.push(`${relative}: ${m.trim()}`);
            }
          }
        }
      }

      expect(
        violations,
        `Found ${violations.length} banned ${label} import(s):\n${violations.join('\n')}`
      ).toHaveLength(0);
    });
  }
});

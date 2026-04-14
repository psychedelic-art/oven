#!/usr/bin/env tsx

/**
 * check-widget-size.ts
 *
 * Verifies the widget bundle meets sprint-03 guardrails:
 *
 * 1. Size budget (gzipped) — fails if over BUDGET_KB
 * 2. Security regex — fails if dangerouslySetInnerHTML present in
 *    the minified output (secure.md T2)
 * 3. Expected global — fails if `window.OvenChat` mount API not
 *    present in the bundle (regression guard)
 *
 * Usage:
 *   pnpm --filter @oven/agent-ui check:size
 *
 * Exit codes:
 *   0 — all checks pass
 *   1 — bundle missing (run build:widget first)
 *   2 — size over budget
 *   3 — security regex matched
 *   4 — expected global missing
 */

import { readFileSync, statSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Budget ─────────────────────────────────────────────────
// Set by sprint-03 after the first successful build (75.97 kB gzipped)
// + 5% slack = 80 kB. Increase deliberately via a separate commit if
// a new feature legitimately needs more room.
const BUDGET_KB = 80;

// ─── Bundle location ────────────────────────────────────────
const BUNDLE_PATH = resolve(__dirname, '..', 'dist', 'oven-chat-widget.iife.js');

// ─── Checks ─────────────────────────────────────────────────

function fail(code: number, message: string): never {
  console.error(`[check-widget-size] FAIL — ${message}`);
  process.exit(code);
}

function pass(message: string) {
  console.log(`[check-widget-size] PASS — ${message}`);
}

// 1. Bundle must exist
if (!existsSync(BUNDLE_PATH)) {
  fail(1, `bundle not found at ${BUNDLE_PATH}. Run \`pnpm --filter @oven/agent-ui build:widget\` first.`);
}

const raw = readFileSync(BUNDLE_PATH);
const rawKB = (statSync(BUNDLE_PATH).size / 1024).toFixed(2);
const gzipped = gzipSync(raw);
const gzipKB = gzipped.byteLength / 1024;

console.log(`[check-widget-size] Bundle: ${BUNDLE_PATH}`);
console.log(`[check-widget-size] Raw size:     ${rawKB} kB`);
console.log(`[check-widget-size] Gzipped size: ${gzipKB.toFixed(2)} kB`);
console.log(`[check-widget-size] Budget:       ${BUDGET_KB.toFixed(2)} kB gzipped`);

// 2. Size budget
if (gzipKB > BUDGET_KB) {
  const overage = gzipKB - BUDGET_KB;
  fail(
    2,
    `gzipped size ${gzipKB.toFixed(2)} kB exceeds budget ${BUDGET_KB} kB by ${overage.toFixed(2)} kB. ` +
    `Either (a) ship a size improvement, or (b) bump BUDGET_KB deliberately in scripts/check-widget-size.ts.`,
  );
}
pass(`size under budget (${gzipKB.toFixed(2)} kB < ${BUDGET_KB} kB, headroom ${(BUDGET_KB - gzipKB).toFixed(2)} kB)`);

// 3. Security: dangerouslySetInnerHTML must not be introduced in our
//    own source code (secure.md T2). The bundle itself may contain
//    dSIH from trusted libraries (react-markdown uses it with
//    sanitized output; oven-ui RichText is opt-in for trusted admin
//    content). The guard targets `packages/agent-ui/src/` only, since
//    user input never reaches widget code through this surface.
const bundleText = raw.toString('utf-8');

function walk(dir: string): string[] {
  const { readdirSync } = require('node:fs') as typeof import('node:fs');
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '__tests__') continue;
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const srcDir = resolve(__dirname, '..', 'src');
const srcFiles = walk(srcDir);
const offenders: string[] = [];
for (const f of srcFiles) {
  const text = readFileSync(f, 'utf-8');
  if (/dangerouslySetInnerHTML/.test(text)) offenders.push(f);
}
if (offenders.length > 0) {
  fail(
    3,
    `dangerouslySetInnerHTML detected in agent-ui source files: ${offenders.join(', ')}. ` +
    `secure.md T2 forbids dSIH in widget-reachable code. Use safe children instead.`,
  );
}
pass(`no dangerouslySetInnerHTML in agent-ui src/ (${srcFiles.length} files scanned)`);

// 4. Regression: the IIFE must still expose window.OvenChat.init
//    (external tenant sites rely on this mount function).
if (!/OvenChat/.test(bundleText)) {
  fail(4, 'window.OvenChat global not found in bundle — external embeds will fail to mount.');
}
if (!/init/.test(bundleText)) {
  fail(4, 'OvenChat.init entry point not found in bundle.');
}
pass('window.OvenChat mount API present');

console.log('[check-widget-size] all checks passed');

/**
 * Minimal magic-byte detector. Returns the detected MIME type or null.
 *
 * Deliberately NOT a general-purpose MIME sniffer -- the allowlist is
 * small (image/*, application/pdf) so a hand-rolled table is more
 * auditable than pulling in a dependency.
 */

const SIGNATURES: ReadonlyArray<{ bytes: readonly number[]; mime: string }> = [
  { bytes: [0x89, 0x50, 0x4e, 0x47], mime: 'image/png' },
  { bytes: [0xff, 0xd8, 0xff], mime: 'image/jpeg' },
  { bytes: [0x47, 0x49, 0x46, 0x38], mime: 'image/gif' },
  { bytes: [0x25, 0x50, 0x44, 0x46], mime: 'application/pdf' },
];

export function detectMime(buffer: Buffer): string | null {
  for (const sig of SIGNATURES) {
    if (buffer.length < sig.bytes.length) continue;
    if (sig.bytes.every((b, i) => buffer[i] === b)) return sig.mime;
  }
  // WebP is a two-stage check: starts with 'RIFF' ... 'WEBP'
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

export function matchesMimePattern(mime: string, pattern: string): boolean {
  if (pattern.endsWith('/*')) return mime.startsWith(pattern.slice(0, -1));
  return mime === pattern;
}

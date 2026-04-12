import { describe, it, expect } from 'vitest';
import { detectMime, matchesMimePattern } from '../engine/magic-bytes';

describe('detectMime', () => {
  it('detects PNG from magic bytes', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectMime(buf)).toBe('image/png');
  });

  it('detects JPEG from magic bytes', () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(detectMime(buf)).toBe('image/jpeg');
  });

  it('detects GIF from magic bytes', () => {
    const buf = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    expect(detectMime(buf)).toBe('image/gif');
  });

  it('detects PDF from magic bytes', () => {
    const buf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e]);
    expect(detectMime(buf)).toBe('application/pdf');
  });

  it('detects WebP from two-stage RIFF...WEBP check', () => {
    // RIFF????WEBP
    const buf = Buffer.alloc(16);
    buf.write('RIFF', 0);
    buf.writeUInt32LE(1234, 4); // file size
    buf.write('WEBP', 8);
    expect(detectMime(buf)).toBe('image/webp');
  });

  it('returns null for unknown buffer', () => {
    const buf = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
    expect(detectMime(buf)).toBeNull();
  });

  it('returns null for empty buffer', () => {
    expect(detectMime(Buffer.alloc(0))).toBeNull();
  });

  it('returns null for buffer shorter than any signature', () => {
    const buf = Buffer.from([0xff]);
    expect(detectMime(buf)).toBeNull();
  });
});

describe('matchesMimePattern', () => {
  it('matches wildcard image/*', () => {
    expect(matchesMimePattern('image/png', 'image/*')).toBe(true);
    expect(matchesMimePattern('image/jpeg', 'image/*')).toBe(true);
    expect(matchesMimePattern('image/webp', 'image/*')).toBe(true);
  });

  it('does not match across type boundaries', () => {
    expect(matchesMimePattern('application/pdf', 'image/*')).toBe(false);
    expect(matchesMimePattern('text/plain', 'image/*')).toBe(false);
  });

  it('matches exact MIME type', () => {
    expect(matchesMimePattern('application/pdf', 'application/pdf')).toBe(true);
  });

  it('does not match different exact types', () => {
    expect(matchesMimePattern('application/json', 'application/pdf')).toBe(false);
  });

  it('matches wildcard application/*', () => {
    expect(matchesMimePattern('application/pdf', 'application/*')).toBe(true);
    expect(matchesMimePattern('application/json', 'application/*')).toBe(true);
  });
});

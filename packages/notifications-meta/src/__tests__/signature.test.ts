import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import { verifyMetaSignature } from '../signature';

const APP_SECRET = 'test-app-secret-1234';

function makeSignature(body: string, secret: string): string {
  const hex = createHmac('sha256', secret).update(body, 'utf8').digest('hex');
  return `sha256=${hex}`;
}

describe('verifyMetaSignature', () => {
  const body = '{"entry":[]}';

  it('returns true for a valid signature', () => {
    const sig = makeSignature(body, APP_SECRET);
    expect(verifyMetaSignature(body, sig, APP_SECRET)).toBe(true);
  });

  it('returns false for a tampered body', () => {
    const sig = makeSignature(body, APP_SECRET);
    expect(verifyMetaSignature(body + 'x', sig, APP_SECRET)).toBe(false);
  });

  it('returns false for a tampered signature', () => {
    const sig = makeSignature(body, APP_SECRET);
    const tampered = sig.slice(0, -2) + 'ff';
    expect(verifyMetaSignature(body, tampered, APP_SECRET)).toBe(false);
  });

  it('returns false for wrong secret', () => {
    const sig = makeSignature(body, 'wrong-secret');
    expect(verifyMetaSignature(body, sig, APP_SECRET)).toBe(false);
  });

  it('returns false for null header', () => {
    expect(verifyMetaSignature(body, null, APP_SECRET)).toBe(false);
  });

  it('returns false for empty header', () => {
    expect(verifyMetaSignature(body, '', APP_SECRET)).toBe(false);
  });

  it('returns false for header without sha256= prefix', () => {
    const hex = createHmac('sha256', APP_SECRET).update(body, 'utf8').digest('hex');
    expect(verifyMetaSignature(body, hex, APP_SECRET)).toBe(false);
  });

  it('returns false for invalid hex in header', () => {
    expect(verifyMetaSignature(body, 'sha256=zzzz', APP_SECRET)).toBe(false);
  });

  it('handles empty body', () => {
    const sig = makeSignature('', APP_SECRET);
    expect(verifyMetaSignature('', sig, APP_SECRET)).toBe(true);
  });
});

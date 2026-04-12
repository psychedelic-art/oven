import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { verifyMetaSignature } from '../signature';

const APP_SECRET = 'test-app-secret-12345';

function sign(body: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return `sha256=${hmac}`;
}

describe('verifyMetaSignature', () => {
  it('returns true for a valid HMAC-SHA256 signature', () => {
    const body = '{"object":"whatsapp_business_account"}';
    const header = sign(body, APP_SECRET);

    expect(verifyMetaSignature(body, header, APP_SECRET)).toBe(true);
  });

  it('returns false when the payload has been tampered with', () => {
    const body = '{"object":"whatsapp_business_account"}';
    const header = sign(body, APP_SECRET);

    const tampered = body + ' ';
    expect(verifyMetaSignature(tampered, header, APP_SECRET)).toBe(false);
  });

  it('returns false for a null header', () => {
    const body = '{"object":"whatsapp_business_account"}';

    expect(verifyMetaSignature(body, null, APP_SECRET)).toBe(false);
  });

  it('returns false for an empty header', () => {
    const body = '{"object":"whatsapp_business_account"}';

    expect(verifyMetaSignature(body, '', APP_SECRET)).toBe(false);
  });

  it('returns false for a malformed header without sha256= prefix', () => {
    const body = '{"object":"whatsapp_business_account"}';
    const hmac = crypto.createHmac('sha256', APP_SECRET).update(body).digest('hex');

    expect(verifyMetaSignature(body, hmac, APP_SECRET)).toBe(false);
    expect(verifyMetaSignature(body, `md5=${hmac}`, APP_SECRET)).toBe(false);
  });

  it('returns false when the secret is wrong', () => {
    const body = '{"object":"whatsapp_business_account"}';
    const header = sign(body, 'wrong-secret');

    expect(verifyMetaSignature(body, header, APP_SECRET)).toBe(false);
  });
});

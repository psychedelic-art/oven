import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verify the HMAC-SHA256 signature of a Meta webhook payload.
 *
 * Meta sends the signature in the `X-Hub-Signature-256` header as
 * `sha256=<hex>`. This function computes the expected HMAC over the raw
 * body and compares using `crypto.timingSafeEqual` for constant-time
 * comparison to prevent timing attacks.
 *
 * @returns true if the signature is valid, false otherwise.
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader) return false;

  const prefix = 'sha256=';
  if (!signatureHeader.startsWith(prefix)) return false;

  const receivedHex = signatureHeader.slice(prefix.length);
  const expectedHex = createHmac('sha256', appSecret)
    .update(rawBody, 'utf8')
    .digest('hex');

  // timingSafeEqual requires equal-length buffers
  const receivedBuf = Buffer.from(receivedHex, 'hex');
  const expectedBuf = Buffer.from(expectedHex, 'hex');

  if (receivedBuf.length !== expectedBuf.length) return false;

  return timingSafeEqual(receivedBuf, expectedBuf);
}

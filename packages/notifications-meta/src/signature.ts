import crypto from 'node:crypto';

/**
 * Verify a Meta webhook HMAC-SHA256 signature using constant-time comparison.
 *
 * Meta sends the header as `sha256=<hex>`. This function recomputes the
 * expected HMAC from the raw body + app secret and compares it in constant
 * time to prevent timing attacks.
 */
export function verifyMetaSignature(
  rawBody: string,
  header: string | null,
  appSecret: string,
): boolean {
  if (!header || !header.startsWith('sha256=')) {
    return false;
  }

  const receivedHex = header.slice('sha256='.length);

  const expectedHex = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  // Both values are hex strings of the same hash algorithm, so they must
  // be the same length for a valid signature. Guard against length mismatches
  // before calling timingSafeEqual (which throws on length mismatch).
  if (receivedHex.length !== expectedHex.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(receivedHex, 'utf-8'),
    Buffer.from(expectedHex, 'utf-8'),
  );
}

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get the 32-byte encryption key.
 * Priority: AI_ENCRYPTION_KEY env var → derived from DATABASE_URL (dev convenience).
 */
function getKey(): Buffer {
  const envKey = process.env.AI_ENCRYPTION_KEY;
  if (envKey) {
    // Accept hex (64 chars) or base64 (44 chars) encoded 32-byte key
    if (envKey.length === 64) return Buffer.from(envKey, 'hex');
    if (envKey.length === 44) return Buffer.from(envKey, 'base64');
    // If raw string, derive via SHA-256
    return createHash('sha256').update(envKey).digest();
  }

  // Dev fallback: derive from DATABASE_URL
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    return createHash('sha256').update(dbUrl).digest();
  }

  throw new Error(
    'No encryption key available. Set AI_ENCRYPTION_KEY env var, ' +
    'or ensure DATABASE_URL is set for dev fallback.'
  );
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns format: "iv:authTag:ciphertext" (all base64 encoded).
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt a string encrypted with encrypt().
 * Expects format: "iv:authTag:ciphertext" (all base64 encoded).
 */
export function decrypt(encrypted: string): string {
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format. Expected "iv:authTag:ciphertext"');
  }

  const [ivB64, authTagB64, ciphertext] = parts;
  const key = getKey();
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');

  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Check if a string looks like it's already encrypted (has iv:authTag:ciphertext format).
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':');
  return parts.length === 3 && parts.every(p => p.length > 0);
}

/**
 * Mask an API key for display: "sk-...xxxx" (last 4 chars visible).
 */
export function maskApiKey(key: string | null | undefined): string | null {
  if (!key) return null;
  // If encrypted, don't try to mask the encrypted value
  if (isEncrypted(key)) return '••••••••';
  if (key.length <= 8) return '••••••••';
  const prefix = key.slice(0, 3);
  const suffix = key.slice(-4);
  return `${prefix}...${suffix}`;
}

import { getAuthAdapter } from './adapters/registry';
import type { AuthUser, SessionToken, ApiKeyInfo } from './adapters/types';

// ─── Auth Utilities ──────────────────────────────────────────────
// Thin wrappers that delegate to the currently active auth adapter.
// Handlers and middleware call these instead of touching the adapter
// directly, ensuring all auth operations go through a single seam.

/**
 * Verify an access token and return the authenticated user.
 * Returns null if the token is invalid or expired.
 */
export async function verifyToken(token: string): Promise<AuthUser | null> {
  return getAuthAdapter().verifyToken(token);
}

/**
 * Create a new session (access + optional refresh token) for a user.
 */
export async function createSession(user: AuthUser): Promise<SessionToken> {
  return getAuthAdapter().createSession(user);
}

/**
 * Verify an API key and return its metadata.
 * Returns null if the key is invalid or disabled.
 */
export async function verifyApiKey(key: string): Promise<ApiKeyInfo | null> {
  return getAuthAdapter().verifyApiKey(key);
}

/**
 * Hash a plaintext password using the active adapter.
 * Throws if the active adapter does not support password hashing.
 */
export async function hashPassword(password: string): Promise<string> {
  const adapter = getAuthAdapter();
  if (!adapter.hashPassword) {
    throw new Error(
      `Active auth adapter "${adapter.name}" does not support password hashing`
    );
  }
  return adapter.hashPassword(password);
}

/**
 * Verify a plaintext password against a stored hash using the active adapter.
 * Throws if the active adapter does not support password verification.
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const adapter = getAuthAdapter();
  if (!adapter.verifyPassword) {
    throw new Error(
      `Active auth adapter "${adapter.name}" does not support password verification`
    );
  }
  return adapter.verifyPassword(password, hash);
}

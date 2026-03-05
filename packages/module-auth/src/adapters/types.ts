// ─── Auth Adapter Interface ──────────────────────────────────────
// Pluggable authentication backend. Implementations can wrap
// JWT libraries, OAuth providers, SAML, etc.

export interface AuthAdapter {
  /** Unique name for this adapter (e.g., 'jwt', 'clerk', 'supabase-auth') */
  name: string;

  /** Verify an access token and return the authenticated user, or null */
  verifyToken(token: string): Promise<AuthUser | null>;

  /** Create a new session (access + optional refresh token) for a user */
  createSession(user: AuthUser): Promise<SessionToken>;

  /** Revoke / invalidate a session by its access token */
  revokeSession(token: string): Promise<void>;

  /** Verify an API key and return key metadata, or null */
  verifyApiKey(key: string): Promise<ApiKeyInfo | null>;

  /** Return the external login URL for an OAuth/SSO provider (optional) */
  getLoginUrl?(provider: string, redirectUrl: string): string;

  /** Handle OAuth callback code and return the authenticated user (optional) */
  handleCallback?(code: string): Promise<AuthUser>;

  /** Hash a plaintext password (optional — not all adapters do password auth) */
  hashPassword?(password: string): Promise<string>;

  /** Verify a plaintext password against a hash (optional) */
  verifyPassword?(password: string, hash: string): Promise<boolean>;
}

/** Authenticated user identity returned by adapters */
export interface AuthUser {
  id: number;
  email: string;
  name: string;
  avatar?: string;
  defaultTenantId?: number;
}

/** Token pair returned when creating a session */
export interface SessionToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

/** Metadata returned when verifying an API key */
export interface ApiKeyInfo {
  id: number;
  tenantId: number | null;
  userId: number | null;
  permissions: string[] | null;
}

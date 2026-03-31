import type { AuthAdapter, AuthUser, SessionToken, ApiKeyInfo } from '@oven/module-auth/adapters/types';
import { adminAuth } from './firebase-admin';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { users, apiKeys } from '@oven/module-auth/schema';
import { argon2Verify } from 'hash-wasm';

export const firebaseAuthAdapter: AuthAdapter = {
  name: 'firebase',

  async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);

      // Check domain-based access control if configured
      const allowedDomains = process.env.FIREBASE_ALLOWED_DOMAINS;
      if (allowedDomains && decodedToken.email) {
        const emailDomain = decodedToken.email.split('@')[1];
        const domains = allowedDomains.split(',').map(d => d.trim());
        if (!domains.includes(emailDomain)) return null;
      }

      const db = getDb();

      // Find or create the user in our DB
      let [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, decodedToken.email!));

      if (!user) {
        // Auto-create user from Firebase identity
        [user] = await db
          .insert(users)
          .values({
            email: decodedToken.email!,
            name: decodedToken.name || decodedToken.email!.split('@')[0],
            avatar: decodedToken.picture || null,
            status: 'active',
          })
          .returning();
      } else {
        // Update last login
        await db
          .update(users)
          .set({ lastLoginAt: new Date(), updatedAt: new Date() })
          .where(eq(users.id, user.id));
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar || undefined,
        defaultTenantId: user.defaultTenantId || undefined,
      };
    } catch {
      return null;
    }
  },

  async createSession(user: AuthUser): Promise<SessionToken> {
    // Firebase manages tokens client-side via getIdToken().
    // We create a custom token that the client can exchange for an ID token.
    const customToken = await adminAuth.createCustomToken(String(user.id), {
      email: user.email,
      name: user.name,
    });

    return {
      accessToken: customToken,
      expiresIn: 3600, // Firebase ID tokens expire in 1 hour; clients auto-refresh
    };
  },

  async revokeSession(token: string): Promise<void> {
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      await adminAuth.revokeRefreshTokens(decoded.uid);
    } catch {
      // Token may already be expired or invalid
    }
  },

  async verifyApiKey(key: string): Promise<ApiKeyInfo | null> {
    const db = getDb();
    // API key format: "oven_<prefix>_<secret>"
    const parts = key.split('_');
    if (parts.length < 3) return null;
    const prefix = parts[1];

    const [found] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.keyPrefix, prefix), eq(apiKeys.enabled, true)));

    if (!found) return null;

    // Verify the full key hash
    const isValid = await argon2Verify({ password: key, hash: found.keyHash });
    if (!isValid) return null;

    // Check expiry
    if (found.expiresAt && found.expiresAt < new Date()) return null;

    // Update last used
    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, found.id));

    return {
      id: found.id,
      tenantId: found.tenantId,
      userId: found.userId,
      permissions: found.permissions as string[] | null,
    };
  },

  hashPassword(_password: string): Promise<string> {
    throw new Error('Firebase adapter does not support password hashing. Firebase manages authentication credentials directly.');
  },

  verifyPassword(_password: string, _hash: string): Promise<boolean> {
    throw new Error('Firebase adapter does not support password verification. Firebase manages authentication credentials directly.');
  },

  getLoginUrl(provider: string, redirectUrl: string): string {
    // Return a URL that the client can use to initiate OAuth
    if (provider === 'google') {
      return `https://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}/__/auth/handler?provider=google.com&redirect=${encodeURIComponent(redirectUrl)}`;
    }
    return `https://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}/__/auth/handler?provider=${provider}&redirect=${encodeURIComponent(redirectUrl)}`;
  },

  async handleCallback(idToken: string): Promise<AuthUser> {
    // After client-side signInWithPopup, verify the ID token server-side
    const user = await firebaseAuthAdapter.verifyToken(idToken);
    if (!user) throw new Error('Invalid Firebase ID token');
    return user;
  },
};

export default firebaseAuthAdapter;
export { auth, googleProvider } from './firebase-client';
export { adminAuth } from './firebase-admin';

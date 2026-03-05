import type { AuthAdapter, AuthUser, SessionToken, ApiKeyInfo } from '@oven/module-auth/adapters/types';
import { encode, decode } from 'next-auth/jwt';
import { argon2id, argon2Verify } from 'hash-wasm';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { apiKeys } from '@oven/module-auth/schema';
import crypto from 'crypto';

const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || '';
const ACCESS_TOKEN_EXPIRY = parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRY || '3600', 10); // 1h
const REFRESH_TOKEN_EXPIRY = parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRY || '604800', 10); // 7d

export const authJsAdapter: AuthAdapter = {
  name: 'authjs',

  async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      const decoded = await decode({ token, secret: AUTH_SECRET, salt: 'authjs.session-token' });
      if (!decoded || !decoded.sub) return null;
      return {
        id: parseInt(decoded.sub, 10),
        email: decoded.email as string,
        name: decoded.name as string,
        avatar: decoded.picture as string | undefined,
        defaultTenantId: decoded.defaultTenantId as number | undefined,
      };
    } catch {
      return null;
    }
  },

  async createSession(user: AuthUser): Promise<SessionToken> {
    const now = Math.floor(Date.now() / 1000);

    const accessToken = await encode({
      token: {
        sub: String(user.id),
        email: user.email,
        name: user.name,
        picture: user.avatar,
        defaultTenantId: user.defaultTenantId,
        iat: now,
        exp: now + ACCESS_TOKEN_EXPIRY,
      },
      secret: AUTH_SECRET,
      salt: 'authjs.session-token',
    });

    const refreshToken = await encode({
      token: {
        sub: String(user.id),
        type: 'refresh',
        iat: now,
        exp: now + REFRESH_TOKEN_EXPIRY,
      },
      secret: AUTH_SECRET,
      salt: 'authjs.refresh-token',
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY,
    };
  },

  async revokeSession(_token: string): Promise<void> {
    // JWT-based: stateless tokens cannot be individually revoked.
    // For DB-backed session revocation, delete the session record
    // in the auth-sessions table (handled by the auth-logout handler).
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

  async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16);
    return argon2id({
      password,
      salt,
      parallelism: 1,
      iterations: 3,
      memorySize: 65536,
      hashLength: 32,
      outputType: 'encoded',
    });
  },

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return argon2Verify({ password, hash });
  },
};

export default authJsAdapter;

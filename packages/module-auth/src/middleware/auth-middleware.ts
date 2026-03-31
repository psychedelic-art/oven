import { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { verifyToken, verifyApiKey } from '../auth-utils';
import { authSessions, apiKeys, users } from '../schema';
import type { AuthContext } from '../types';

// ─── Public Endpoints ────────────────────────────────────────────
// Routes that bypass authentication entirely.
const PUBLIC_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Auth middleware utility function.
 *
 * Checks authentication in priority order:
 *   1. Public endpoint bypass
 *   2. API key (X-API-Key header)
 *   3. Session token (X-Session-Token header)
 *   4. Bearer token (Authorization header)
 *
 * Returns an AuthContext on success, or null if unauthenticated.
 * This is a utility function — actual Next.js middleware wiring
 * happens at the app level.
 */
export async function authMiddleware(
  request: NextRequest
): Promise<AuthContext | null> {
  const { pathname } = request.nextUrl;

  // 1. Check if this is a public endpoint
  if (PUBLIC_ENDPOINTS.some((ep) => pathname.startsWith(ep))) {
    return null;
  }

  const db = getDb();

  // 2. Check X-API-Key header
  const apiKeyHeader = request.headers.get('X-API-Key');
  if (apiKeyHeader) {
    const keyInfo = await verifyApiKey(apiKeyHeader);
    if (keyInfo) {
      // Update last used timestamp
      await db
        .update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, keyInfo.id));

      // Look up user if key is user-scoped
      let email = '';
      let name = '';
      if (keyInfo.userId) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, keyInfo.userId))
          .limit(1);
        if (user) {
          email = user.email;
          name = user.name;
        }
      }

      return {
        userId: keyInfo.userId ?? 0,
        email,
        name,
        tenantId: keyInfo.tenantId,
        roles: [],
        permissions: keyInfo.permissions ?? [],
        authMethod: 'api-key',
      };
    }
  }

  // 3. Check X-Session-Token header
  const sessionTokenHeader = request.headers.get('X-Session-Token');
  if (sessionTokenHeader) {
    const tokenHash = hashToken(sessionTokenHeader);
    const [session] = await db
      .select()
      .from(authSessions)
      .where(
        and(
          eq(authSessions.token, tokenHash),
        )
      )
      .limit(1);

    if (session && session.expiresAt > new Date()) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

      if (user) {
        return {
          userId: user.id,
          email: user.email,
          name: user.name,
          tenantId: user.defaultTenantId,
          roles: [],
          permissions: [],
          authMethod: 'session-token',
        };
      }
    }
  }

  // 4. Check Authorization: Bearer header
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const authUser = await verifyToken(token);

    if (authUser) {
      return {
        userId: authUser.id,
        email: authUser.email,
        name: authUser.name,
        tenantId: authUser.defaultTenantId ?? null,
        roles: [],
        permissions: [],
        authMethod: 'jwt',
      };
    }
  }

  // No valid authentication found
  return null;
}

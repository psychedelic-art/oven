'use client';

import type { PersistedSession } from '../types';

const STORAGE_PREFIX = 'oven_session_';

export function useSessionPersistence() {
  function save(session: PersistedSession): void {
    try {
      localStorage.setItem(
        `${STORAGE_PREFIX}${session.tenantSlug}`,
        JSON.stringify(session),
      );
    } catch {
      // localStorage may be unavailable (SSR, private mode)
    }
  }

  function load(tenantSlug: string): PersistedSession | null {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${tenantSlug}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PersistedSession;
      if (!parsed.sessionId || !parsed.sessionToken) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function clear(tenantSlug: string): void {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${tenantSlug}`);
    } catch {
      // ignore
    }
  }

  function isExpired(session: PersistedSession): boolean {
    return Date.now() > session.expiresAt;
  }

  async function executeWithRetry<T>(
    fn: () => Promise<T>,
    opts?: { maxRetries?: number; baseDelayMs?: number },
  ): Promise<T> {
    const maxRetries = opts?.maxRetries ?? 5;
    const baseDelay = opts?.baseDelayMs ?? 500;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    throw lastError!;
  }

  return { save, load, clear, isExpired, executeWithRetry };
}

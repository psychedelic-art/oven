'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSessionPersistence } from './useSessionPersistence';

const DEFAULT_TTL_HOURS = 24;

export interface UseAnonymousSessionReturn {
  sessionId: number | null;
  sessionToken: string | null;
  isReady: boolean;
  error: Error | null;
  headers: Record<string, string>;
  createNewSession: () => Promise<void>;
}

export function useAnonymousSession(
  tenantSlug: string,
  opts?: { apiBaseUrl?: string; ttlHours?: number; agentId?: number },
): UseAnonymousSessionReturn {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { save, load, clear, isExpired } = useSessionPersistence();
  const apiBaseUrl = opts?.apiBaseUrl ?? '';

  const createNewSession = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/chat-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'widget',
          agentId: opts?.agentId,
        }),
      });
      if (!res.ok) throw new Error(`Session creation failed: ${res.status}`);
      const data = await res.json();
      const ttl = (opts?.ttlHours ?? DEFAULT_TTL_HOURS) * 60 * 60 * 1000;
      save({
        sessionId: data.id,
        sessionToken: data.sessionToken,
        tenantSlug,
        createdAt: Date.now(),
        expiresAt: Date.now() + ttl,
      });
      setSessionId(data.id);
      setSessionToken(data.sessionToken);
      setIsReady(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsReady(false);
    }
  }, [tenantSlug, apiBaseUrl, opts?.agentId, opts?.ttlHours, save]);

  useEffect(() => {
    const persisted = load(tenantSlug);
    if (persisted && !isExpired(persisted)) {
      setSessionId(persisted.sessionId);
      setSessionToken(persisted.sessionToken);
      setIsReady(true);
    } else {
      if (persisted) clear(tenantSlug);
      createNewSession();
    }
  }, [tenantSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  const headers: Record<string, string> = sessionToken
    ? { 'X-Session-Token': sessionToken }
    : {};

  return { sessionId, sessionToken, isReady, error, headers, createNewSession };
}

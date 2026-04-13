'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

// ─── Types ──────────────────────────────────────────────────

export interface SessionSummary {
  id: number;
  title: string | null;
  isPinned: boolean;
  updatedAt: Date;
  messageCount?: number;
  status: string;
}

export interface UseSessionManagerOpts {
  apiBaseUrl?: string;
  tenantSlug: string;
  tenantId?: number;
  /** Only fetch sessions when true (default false). */
  enabled?: boolean;
}

export interface UseSessionManagerReturn {
  sessions: SessionSummary[];
  activeSessionId: number | null;
  isLoading: boolean;
  error: Error | null;
  createSession: () => Promise<number>;
  deleteSession: (id: number) => Promise<void>;
  pinSession: (id: number, pinned: boolean) => Promise<void>;
  selectSession: (id: number) => void;
  refresh: () => Promise<void>;
}

// ─── Hook ───────────────────────────────────────────────────

export function useSessionManager({
  apiBaseUrl = '',
  tenantSlug,
  tenantId,
  enabled = false,
}: UseSessionManagerOpts): UseSessionManagerReturn {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Fetch session list ───────────────────────────────────

  const fetchSessions = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);

    try {
      const filter: Record<string, unknown> = {};
      if (tenantId) filter.tenantId = tenantId;

      const params = new URLSearchParams({
        filter: JSON.stringify(filter),
        sort: JSON.stringify(['updatedAt', 'DESC']),
        range: JSON.stringify([0, 49]),
      });

      const res = await fetch(`${apiBaseUrl}/api/chat-sessions?${params}`);
      if (!res.ok) throw new Error(`Failed to load sessions: ${res.status}`);

      const data = await res.json();
      if (!mountedRef.current) return;

      const mapped: SessionSummary[] = (Array.isArray(data) ? data : []).map(
        (s: Record<string, unknown>) => ({
          id: s.id as number,
          title: (s.title as string | null) ?? null,
          isPinned: Boolean(s.isPinned),
          updatedAt: new Date(s.updatedAt as string),
          messageCount: typeof s.messageCount === 'number' ? s.messageCount : undefined,
          status: (s.status as string) ?? 'active',
        }),
      );

      setSessions(mapped);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [apiBaseUrl, tenantId, enabled]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // ─── Create session ───────────────────────────────────────

  const createSession = useCallback(async (): Promise<number> => {
    const body: Record<string, unknown> = {
      channel: 'playground',
    };
    if (tenantId) body.tenantId = tenantId;

    const res = await fetch(`${apiBaseUrl}/api/chat-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Failed to create session: ${res.status}`);
    const data = await res.json();
    const newId = data.id as number;

    if (mountedRef.current) {
      setActiveSessionId(newId);
      await fetchSessions();
    }

    return newId;
  }, [apiBaseUrl, tenantId, fetchSessions]);

  // ─── Delete session ───────────────────────────────────────

  const deleteSession = useCallback(async (id: number) => {
    const res = await fetch(`${apiBaseUrl}/api/chat-sessions/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) throw new Error(`Failed to delete session: ${res.status}`);

    if (mountedRef.current) {
      if (activeSessionId === id) setActiveSessionId(null);
      setSessions(prev => prev.filter(s => s.id !== id));
    }
  }, [apiBaseUrl, activeSessionId]);

  // ─── Pin / unpin session ──────────────────────────────────

  const pinSession = useCallback(async (id: number, pinned: boolean) => {
    const res = await fetch(`${apiBaseUrl}/api/chat-sessions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPinned: pinned }),
    });

    if (!res.ok) throw new Error(`Failed to update session: ${res.status}`);

    if (mountedRef.current) {
      setSessions(prev =>
        prev.map(s => (s.id === id ? { ...s, isPinned: pinned } : s)),
      );
    }
  }, [apiBaseUrl]);

  // ─── Select session ───────────────────────────────────────

  const selectSession = useCallback((id: number) => {
    setActiveSessionId(id);
  }, []);

  // ─── Public API ───────────────────────────────────────────

  return {
    sessions,
    activeSessionId,
    isLoading,
    error,
    createSession,
    deleteSession,
    pinSession,
    selectSession,
    refresh: fetchSessions,
  };
}

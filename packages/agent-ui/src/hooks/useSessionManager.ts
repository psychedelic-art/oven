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

export type ExportFormat = 'json' | 'markdown' | 'plaintext';

export interface UseSessionManagerReturn {
  sessions: SessionSummary[];
  activeSessionId: number | null;
  isLoading: boolean;
  error: Error | null;
  /** Per-row error messages keyed by session id (cleared on next successful mutation). */
  rowErrors: Record<number, string>;
  createSession: () => Promise<number>;
  deleteSession: (id: number) => Promise<void>;
  pinSession: (id: number, pinned: boolean) => Promise<void>;
  renameSession: (id: number, title: string) => Promise<void>;
  exportSession: (id: number, format: ExportFormat) => Promise<void>;
  selectSession: (id: number) => void;
  refresh: () => Promise<void>;
  /** Clear the rowError for a specific session id (e.g. on retry). */
  clearRowError: (id: number) => void;
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
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});

  const setRowError = useCallback((id: number, message: string | null) => {
    setRowErrors((prev) => {
      const next = { ...prev };
      if (message === null) delete next[id];
      else next[id] = message;
      return next;
    });
  }, []);

  const clearRowError = useCallback((id: number) => {
    setRowErrors((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);
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

  // ─── Delete session (optimistic + rollback) ───────────────

  const deleteSession = useCallback(async (id: number) => {
    // Snapshot + optimistic remove
    const snapshot = sessions;
    const priorActive = activeSessionId;

    if (mountedRef.current) {
      if (activeSessionId === id) setActiveSessionId(null);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      clearRowError(id);
    }

    try {
      const res = await fetch(`${apiBaseUrl}/api/chat-sessions/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`Failed to delete session: ${res.status}`);
    } catch (err) {
      // Rollback
      if (mountedRef.current) {
        setSessions(snapshot);
        setActiveSessionId(priorActive);
        setRowError(id, err instanceof Error ? err.message : 'Delete failed');
      }
      throw err;
    }
  }, [apiBaseUrl, activeSessionId, sessions, clearRowError, setRowError]);

  // ─── Pin / unpin session (optimistic + rollback) ──────────

  const pinSession = useCallback(async (id: number, pinned: boolean) => {
    // Snapshot + optimistic update
    const snapshot = sessions;

    if (mountedRef.current) {
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isPinned: pinned } : s)),
      );
      clearRowError(id);
    }

    try {
      const res = await fetch(`${apiBaseUrl}/api/chat-sessions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: pinned }),
      });
      if (!res.ok) throw new Error(`Failed to update session: ${res.status}`);
    } catch (err) {
      if (mountedRef.current) {
        setSessions(snapshot);
        setRowError(id, err instanceof Error ? err.message : 'Pin failed');
      }
      throw err;
    }
  }, [apiBaseUrl, sessions, clearRowError, setRowError]);

  // ─── Rename session (optimistic + rollback) ───────────────

  const renameSession = useCallback(async (id: number, title: string) => {
    const snapshot = sessions;

    if (mountedRef.current) {
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, title } : s)),
      );
      clearRowError(id);
    }

    try {
      const res = await fetch(`${apiBaseUrl}/api/chat-sessions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error(`Failed to rename session: ${res.status}`);
    } catch (err) {
      if (mountedRef.current) {
        setSessions(snapshot);
        setRowError(id, err instanceof Error ? err.message : 'Rename failed');
      }
      throw err;
    }
  }, [apiBaseUrl, sessions, clearRowError, setRowError]);

  // ─── Export session (triggers browser download) ───────────

  const exportSession = useCallback(async (id: number, format: ExportFormat) => {
    if (mountedRef.current) clearRowError(id);

    try {
      const res = await fetch(
        `${apiBaseUrl}/api/chat-sessions/${id}/export?format=${format}`,
      );
      if (!res.ok) throw new Error(`Failed to export session: ${res.status}`);

      const blob = await res.blob();

      // Only trigger download in browser environments
      if (typeof window === 'undefined' || typeof document === 'undefined') return;

      const ext = format === 'markdown' ? 'md' : format === 'plaintext' ? 'txt' : 'json';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-${id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      if (mountedRef.current) {
        setRowError(id, err instanceof Error ? err.message : 'Export failed');
      }
      throw err;
    }
  }, [apiBaseUrl, clearRowError, setRowError]);

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
    rowErrors,
    createSession,
    deleteSession,
    pinSession,
    renameSession,
    exportSession,
    selectSession,
    refresh: fetchSessions,
    clearRowError,
  };
}

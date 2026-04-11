import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSessionPersistence } from '../hooks/useSessionPersistence';
import type { PersistedSession } from '../types';

describe('useSessionPersistence', () => {
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
      removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
    });
  });

  it('saves and loads a session', () => {
    const { result } = renderHook(() => useSessionPersistence());
    const session: PersistedSession = {
      sessionId: 42,
      sessionToken: 'tok_abc',
      tenantSlug: 'clinic',
      createdAt: Date.now(),
      expiresAt: Date.now() + 86400000,
    };
    result.current.save(session);
    expect(localStorage.setItem).toHaveBeenCalled();

    const loaded = result.current.load('clinic');
    expect(loaded).not.toBeNull();
    expect(loaded!.sessionId).toBe(42);
  });

  it('returns null for missing session', () => {
    const { result } = renderHook(() => useSessionPersistence());
    expect(result.current.load('nonexistent')).toBeNull();
  });

  it('clears a session', () => {
    const { result } = renderHook(() => useSessionPersistence());
    result.current.save({
      sessionId: 1, sessionToken: 'tok', tenantSlug: 'test',
      createdAt: Date.now(), expiresAt: Date.now() + 86400000,
    });
    result.current.clear('test');
    expect(localStorage.removeItem).toHaveBeenCalled();
  });

  it('detects expired sessions', () => {
    const { result } = renderHook(() => useSessionPersistence());
    const expired: PersistedSession = {
      sessionId: 1, sessionToken: 'tok', tenantSlug: 'test',
      createdAt: Date.now() - 100000,
      expiresAt: Date.now() - 1000, // expired
    };
    expect(result.current.isExpired(expired)).toBe(true);
  });

  it('detects non-expired sessions', () => {
    const { result } = renderHook(() => useSessionPersistence());
    const valid: PersistedSession = {
      sessionId: 1, sessionToken: 'tok', tenantSlug: 'test',
      createdAt: Date.now(),
      expiresAt: Date.now() + 86400000,
    };
    expect(result.current.isExpired(valid)).toBe(false);
  });

  it('executeWithRetry succeeds on first attempt', async () => {
    const { result } = renderHook(() => useSessionPersistence());
    const fn = vi.fn().mockResolvedValue('success');
    const value = await result.current.executeWithRetry(fn, { maxRetries: 3, baseDelayMs: 10 });
    expect(value).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('executeWithRetry retries on failure', async () => {
    const { result } = renderHook(() => useSessionPersistence());
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');
    const value = await result.current.executeWithRetry(fn, { maxRetries: 3, baseDelayMs: 10 });
    expect(value).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

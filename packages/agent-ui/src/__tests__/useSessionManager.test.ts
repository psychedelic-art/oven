import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSessionManager } from '../hooks/useSessionManager';

// ─── Mocks ──────────────────────────────────────────────────

const mockSessions = [
  { id: 1, title: 'Session A', isPinned: true, updatedAt: '2026-04-10T12:00:00Z', status: 'active' },
  { id: 2, title: 'Session B', isPinned: false, updatedAt: '2026-04-11T12:00:00Z', status: 'active' },
  { id: 3, title: null, isPinned: false, updatedAt: '2026-04-12T12:00:00Z', status: 'archived' },
];

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetchOk(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    headers: new Headers({ 'Content-Range': 'chat-sessions 0-2/3' }),
  });
}

// ─── Tests ──────────────────────────────────────────────────

describe('useSessionManager', () => {
  it('does not fetch when enabled=false', () => {
    renderHook(() =>
      useSessionManager({ tenantSlug: 'test', enabled: false }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches session list on mount when enabled=true', async () => {
    fetchMock.mockReturnValueOnce(mockFetchOk(mockSessions));

    const { result } = renderHook(() =>
      useSessionManager({ tenantSlug: 'test', enabled: true }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sessions).toHaveLength(3);
    expect(result.current.sessions[0].id).toBe(1);
    expect(result.current.sessions[0].title).toBe('Session A');
    expect(result.current.sessions[0].isPinned).toBe(true);
    expect(result.current.sessions[0].updatedAt).toBeInstanceOf(Date);
  });

  it('passes tenantId in filter param', async () => {
    fetchMock.mockReturnValueOnce(mockFetchOk([]));

    renderHook(() =>
      useSessionManager({ tenantSlug: 'test', tenantId: 42, enabled: true }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('chat-sessions');
    expect(url).toContain(encodeURIComponent('"tenantId":42'));
  });

  it('createSession calls POST and returns new session id', async () => {
    fetchMock
      .mockReturnValueOnce(mockFetchOk([])) // initial list
      .mockReturnValueOnce(mockFetchOk({ id: 99, status: 'active' })) // POST create
      .mockReturnValueOnce(mockFetchOk([...mockSessions, { id: 99, title: null, isPinned: false, updatedAt: '2026-04-13T12:00:00Z', status: 'active' }])); // refresh

    const { result } = renderHook(() =>
      useSessionManager({ tenantSlug: 'test', enabled: true }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let newId: number = 0;
    await act(async () => {
      newId = await result.current.createSession();
    });

    expect(newId).toBe(99);
    expect(result.current.activeSessionId).toBe(99);

    // Verify POST was called
    const postCall = fetchMock.mock.calls.find(
      (c: unknown[]) => (c[1] as RequestInit)?.method === 'POST',
    );
    expect(postCall).toBeDefined();
    expect(JSON.parse((postCall![1] as RequestInit).body as string)).toMatchObject({
      channel: 'playground',
    });
  });

  it('deleteSession calls DELETE and removes from list', async () => {
    fetchMock.mockReturnValueOnce(mockFetchOk(mockSessions));

    const { result } = renderHook(() =>
      useSessionManager({ tenantSlug: 'test', enabled: true }),
    );

    await waitFor(() => expect(result.current.sessions).toHaveLength(3));

    fetchMock.mockReturnValueOnce(mockFetchOk(null));

    await act(async () => {
      await result.current.deleteSession(2);
    });

    expect(result.current.sessions).toHaveLength(2);
    expect(result.current.sessions.find(s => s.id === 2)).toBeUndefined();

    // Verify DELETE was called
    const deleteCall = fetchMock.mock.calls.find(
      (c: unknown[]) => (c[1] as RequestInit)?.method === 'DELETE',
    );
    expect(deleteCall).toBeDefined();
    expect(deleteCall![0]).toContain('/api/chat-sessions/2');
  });

  it('pinSession calls PUT with isPinned and updates local state', async () => {
    fetchMock.mockReturnValueOnce(mockFetchOk(mockSessions));

    const { result } = renderHook(() =>
      useSessionManager({ tenantSlug: 'test', enabled: true }),
    );

    await waitFor(() => expect(result.current.sessions).toHaveLength(3));

    fetchMock.mockReturnValueOnce(mockFetchOk(null));

    await act(async () => {
      await result.current.pinSession(2, true);
    });

    expect(result.current.sessions.find(s => s.id === 2)?.isPinned).toBe(true);

    // Verify PUT was called with isPinned
    const putCall = fetchMock.mock.calls.find(
      (c: unknown[]) => (c[1] as RequestInit)?.method === 'PUT',
    );
    expect(putCall).toBeDefined();
    expect(JSON.parse((putCall![1] as RequestInit).body as string)).toMatchObject({
      isPinned: true,
    });
  });

  it('selectSession updates activeSessionId', async () => {
    fetchMock.mockReturnValueOnce(mockFetchOk(mockSessions));

    const { result } = renderHook(() =>
      useSessionManager({ tenantSlug: 'test', enabled: true }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.selectSession(2);
    });

    expect(result.current.activeSessionId).toBe(2);
  });

  it('deleteSession clears activeSessionId when deleting the active session', async () => {
    fetchMock.mockReturnValueOnce(mockFetchOk(mockSessions));

    const { result } = renderHook(() =>
      useSessionManager({ tenantSlug: 'test', enabled: true }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.selectSession(2));
    expect(result.current.activeSessionId).toBe(2);

    fetchMock.mockReturnValueOnce(mockFetchOk(null));
    await act(async () => {
      await result.current.deleteSession(2);
    });

    expect(result.current.activeSessionId).toBeNull();
  });

  it('sets error state on fetch failure', async () => {
    fetchMock.mockReturnValueOnce(Promise.resolve({ ok: false, status: 500 }));

    const { result } = renderHook(() =>
      useSessionManager({ tenantSlug: 'test', enabled: true }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toContain('500');
  });

  it('refresh re-fetches the session list', async () => {
    fetchMock.mockReturnValueOnce(mockFetchOk(mockSessions));

    const { result } = renderHook(() =>
      useSessionManager({ tenantSlug: 'test', enabled: true }),
    );

    await waitFor(() => expect(result.current.sessions).toHaveLength(3));

    const updatedSessions = [...mockSessions, { id: 4, title: 'New', isPinned: false, updatedAt: '2026-04-13T12:00:00Z', status: 'active' }];
    fetchMock.mockReturnValueOnce(mockFetchOk(updatedSessions));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.sessions).toHaveLength(4);
  });
});

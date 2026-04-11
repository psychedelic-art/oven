import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from '../hooks/useChat';

/**
 * Minimal useChat harness — mocks the session create endpoint so isReady flips
 * to true, then exercises the new appendMessage / clearMessages surface.
 */
function installSessionFetchMock() {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/api/chat-sessions') && !url.includes('/messages')) {
      return Promise.resolve({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: 1, sessionToken: 'tok' }),
      } as unknown as Response);
    }
    // Fallback: any other call returns an empty JSON response.
    return Promise.resolve({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ([]),
    } as unknown as Response);
  });
}

describe('useChat — appendMessage / clearMessages', () => {
  beforeEach(() => {
    // localStorage is provided by jsdom; clear it to avoid persisted sessions leaking between tests.
    if (typeof localStorage !== 'undefined') localStorage.clear();
    installSessionFetchMock();
  });

  it('appendMessage inserts a system message visible in messages', async () => {
    const { result } = renderHook(() => useChat({ tenantSlug: 't1' }));
    await waitFor(() => expect(result.current.isSessionReady).toBe(true));

    act(() => {
      result.current.appendMessage({
        id: 'sys-1',
        role: 'system',
        content: 'hello',
        createdAt: new Date(),
      });
    });

    expect(result.current.messages.some(m => m.id === 'sys-1')).toBe(true);
    expect(result.current.messages.find(m => m.id === 'sys-1')?.content).toBe('hello');
  });

  it('clearMessages empties the realtime list', async () => {
    const { result } = renderHook(() => useChat({ tenantSlug: 't1' }));
    await waitFor(() => expect(result.current.isSessionReady).toBe(true));

    act(() => {
      result.current.appendMessage({
        id: 'a', role: 'system', content: 'one', createdAt: new Date(),
      });
      result.current.appendMessage({
        id: 'b', role: 'assistant', content: 'two', createdAt: new Date(),
      });
    });
    expect(result.current.messages.length).toBeGreaterThanOrEqual(2);

    act(() => { result.current.clearMessages(); });
    // After clear, any remaining messages must come from history, not from the
    // realtime list we just populated.
    expect(result.current.messages.find(m => m.id === 'a')).toBeUndefined();
    expect(result.current.messages.find(m => m.id === 'b')).toBeUndefined();
  });

  it('duplicate appendMessage (same id) is deduplicated', async () => {
    const { result } = renderHook(() => useChat({ tenantSlug: 't1' }));
    await waitFor(() => expect(result.current.isSessionReady).toBe(true));

    act(() => {
      result.current.appendMessage({ id: 'dup', role: 'system', content: 'x', createdAt: new Date() });
      result.current.appendMessage({ id: 'dup', role: 'system', content: 'y', createdAt: new Date() });
    });

    const count = result.current.messages.filter(m => m.id === 'dup').length;
    expect(count).toBe(1);
  });
});

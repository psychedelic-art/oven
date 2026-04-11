'use client';

import { useState, useCallback, useRef } from 'react';
import { useAnonymousSession } from './useAnonymousSession';
import { useDualStateMessages } from './useDualStateMessages';
import type { UIMessage, UseChatReturn } from '../types';

export function useChat(opts: {
  tenantSlug: string;
  agentSlug?: string;
  agentId?: number;
  apiBaseUrl?: string;
}): UseChatReturn {
  const apiBaseUrl = opts.apiBaseUrl ?? '';
  const { sessionId, sessionToken, isReady, error: sessionError, headers } = useAnonymousSession(
    opts.tenantSlug,
    { apiBaseUrl, agentId: opts.agentId },
  );

  const { messages, appendRealtime, updateRealtimeMessage, clearRealtime, loadMore, hasMore } =
    useDualStateMessages(sessionId, apiBaseUrl, headers);

  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(sessionError);
  const [status, setStatus] = useState<'idle' | 'loading' | 'streaming' | 'error'>('idle');
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!sessionId || !text.trim()) return;

    // Add user message optimistically
    const tempId = `temp_${Date.now()}`;
    const userMessage: UIMessage = {
      id: tempId,
      role: 'user',
      content: text,
      createdAt: new Date(),
    };
    appendRealtime(userMessage);
    setStatus('loading');
    setError(null);

    try {
      abortRef.current = new AbortController();
      const res = await fetch(`${apiBaseUrl}/api/chat-sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ content: text }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        throw new Error(`Send failed: ${res.status}`);
      }

      const contentType = res.headers.get('content-type') ?? '';
      if (contentType.includes('text/event-stream') && res.body) {
        // SSE streaming mode
        setIsStreaming(true);
        setStatus('streaming');
        const assistantId = `stream_${Date.now()}`;
        appendRealtime({
          id: assistantId,
          role: 'assistant',
          content: '',
          createdAt: new Date(),
          isStreaming: true,
        });

        await readSSEStream(res.body, {
          onToken: (text) => {
            updateRealtimeMessage(assistantId, {
              content: (messages.find(m => m.id === assistantId)?.content ?? '') + text,
            });
          },
          onDone: (messageId) => {
            updateRealtimeMessage(assistantId, { id: messageId, isStreaming: false });
          },
          onError: (err) => {
            updateRealtimeMessage(assistantId, { isStreaming: false, error: err });
          },
        });
      } else {
        // JSON response mode
        const data = await res.json();
        if (data.id) {
          updateRealtimeMessage(tempId, { id: data.id });
        }
      }

      setStatus('idle');
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setStatus('error');
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [sessionId, apiBaseUrl, headers, appendRealtime, updateRealtimeMessage, messages]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setStatus('idle');
  }, []);

  const appendMessage = useCallback((message: UIMessage) => {
    appendRealtime(message);
  }, [appendRealtime]);

  const clearMessages = useCallback(() => {
    clearRealtime();
  }, [clearRealtime]);

  return {
    messages,
    sendMessage,
    isStreaming,
    stop,
    error,
    status,
    sessionId,
    isSessionReady: isReady,
    appendMessage,
    clearMessages,
  };
}

// ─── SSE Stream Reader ──────────────────────────────────────

async function readSSEStream(
  body: ReadableStream<Uint8Array>,
  handlers: {
    onToken: (text: string) => void;
    onDone: (messageId: number) => void;
    onError: (error: string) => void;
  },
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const event = JSON.parse(line.slice(6));
          switch (event.type) {
            case 'token':
              handlers.onToken(event.text);
              break;
            case 'done':
              handlers.onDone(event.messageId);
              break;
            case 'error':
              handlers.onError(event.message);
              break;
          }
        } catch {
          // Skip malformed events
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

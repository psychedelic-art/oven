'use client';

// ─── useChatAI ──────────────────────────────────────────────
// Wraps @ai-sdk/react's useChat with OVEN's session management and
// custom OvenChatTransport. Returns the same UseChatReturn interface
// as the legacy hook so consumers don't need to change.
//
// Reference: https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat
//
// The AI SDK manages message state, streaming status, and abort.
// We compose it with useAnonymousSession for session CRUD and
// OvenChatTransport for our SSE format.

import { useMemo, useCallback } from 'react';
import { useChat as useAIChat } from '@ai-sdk/react';
import { useAnonymousSession } from './useAnonymousSession';
import { OvenChatTransport } from './OvenChatTransport';
import type { UIMessage, UseChatReturn } from '../types';

export interface UseChatAIOpts {
  tenantSlug: string;
  agentSlug?: string;
  agentId?: number;
  apiBaseUrl?: string;
}

export function useChatAI(opts: UseChatAIOpts): UseChatReturn {
  const apiBaseUrl = opts.apiBaseUrl ?? '';

  // Session management — unchanged from legacy hook
  const session = useAnonymousSession(opts.tenantSlug, {
    apiBaseUrl,
    agentId: opts.agentId,
  });

  // Custom transport that bridges our SSE format to AI SDK
  const transport = useMemo(
    () =>
      new OvenChatTransport({
        apiBaseUrl,
        getSessionId: () => session.sessionId,
        getHeaders: () => session.headers,
      }),
    [apiBaseUrl, session.sessionId, session.headers],
  );

  // AI SDK useChat — handles message state, streaming, abort
  const ai = useAIChat({
    id: session.sessionId ? `oven-${session.sessionId}` : undefined,
    // Use our custom transport instead of default Vercel format
    transport: transport as never, // type cast needed — AI SDK transport interface is stricter
    onError: () => {
      // Error is captured in ai.error, no extra handling needed
    },
  });

  // ─── Map AI SDK status to our status type ─────────────────
  const status: UseChatReturn['status'] =
    ai.status === 'streaming' ? 'streaming' :
    ai.status === 'submitted' ? 'loading' :
    ai.error ? 'error' :
    'idle';

  // ─── Map AI SDK messages to our UIMessage type ────────────
  const messages: UIMessage[] = useMemo(
    () =>
      ai.messages.map((m) => ({
        id: m.id,
        role: m.role as UIMessage['role'],
        content:
          m.parts
            ?.filter((p): p is Extract<typeof p, { type: 'text' }> => p.type === 'text')
            .map((p) => p.text)
            .join('') ?? (typeof m.content === 'string' ? m.content : ''),
        parts: m.parts
          ?.filter((p): p is Extract<typeof p, { type: 'tool-call' }> => p.type === 'tool-call')
          .map((p) => ({
            type: 'tool-call' as const,
            toolCallId: p.toolCallId,
            toolName: p.toolName,
            input: p.args,
          })),
        createdAt: m.createdAt ?? new Date(),
        isStreaming:
          ai.status === 'streaming' &&
          m.id === ai.messages[ai.messages.length - 1]?.id,
        metadata: typeof m.metadata === 'object' && m.metadata !== null
          ? m.metadata as Record<string, unknown>
          : undefined,
      })),
    [ai.messages, ai.status],
  );

  // ─── Send message ─────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      if (!session.isReady || !text.trim()) return;
      await ai.sendMessage({ role: 'user', content: text });
    },
    [session.isReady, ai],
  );

  // ─── Append synthetic message (for workflow responses, etc.) ──
  // Append with deduplication — matches legacy hook behavior
  const appendMessage = useCallback(
    (msg: UIMessage) => {
      ai.setMessages((prev) => {
        if (prev.some((m) => m.id === String(msg.id))) return prev;
        return [
          ...prev,
          {
            id: String(msg.id),
            role: msg.role,
            content: msg.content,
            createdAt: msg.createdAt,
            parts: [{ type: 'text' as const, text: msg.content }],
          },
        ];
      });
    },
    [ai],
  );

  // ─── Clear messages ───────────────────────────────────────
  const clearMessages = useCallback(() => {
    ai.setMessages([]);
  }, [ai]);

  return {
    messages,
    sendMessage,
    isStreaming: ai.status === 'streaming',
    stop: ai.stop,
    error: ai.error ?? session.error ?? null,
    status,
    sessionId: session.sessionId,
    isSessionReady: session.isReady,
    appendMessage,
    clearMessages,
  };
}

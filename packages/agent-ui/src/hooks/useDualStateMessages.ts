'use client';

import { useState, useCallback, useRef } from 'react';
import type { UIMessage } from '../types';

const PAGE_SIZE = 20;

export interface UseDualStateMessagesReturn {
  messages: UIMessage[];
  appendRealtime: (message: UIMessage) => void;
  updateRealtimeMessage: (id: string | number, update: Partial<UIMessage>) => void;
  clearRealtime: () => void;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  isLoadingMore: boolean;
}

export function useDualStateMessages(
  sessionId: number | null,
  apiBaseUrl: string = '',
  headers: Record<string, string> = {},
): UseDualStateMessagesReturn {
  const [historyMessages, setHistoryMessages] = useState<UIMessage[]>([]);
  const [realtimeMessages, setRealtimeMessages] = useState<UIMessage[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pageRef = useRef(0);

  const appendRealtime = useCallback((message: UIMessage) => {
    setRealtimeMessages(prev => {
      const exists = prev.some(m => m.id === message.id);
      if (exists) return prev;
      return [...prev, message];
    });
  }, []);

  const updateRealtimeMessage = useCallback((id: string | number, update: Partial<UIMessage>) => {
    setRealtimeMessages(prev =>
      prev.map(m => m.id === id ? { ...m, ...update } : m)
    );
  }, []);

  const clearRealtime = useCallback(() => {
    setRealtimeMessages([]);
  }, []);

  const loadMore = useCallback(async () => {
    if (!sessionId || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);

    try {
      const start = pageRef.current * PAGE_SIZE;
      const end = start + PAGE_SIZE;
      const res = await fetch(
        `${apiBaseUrl}/api/chat-sessions/${sessionId}/messages?range=[${start},${end - 1}]`,
        { headers },
      );
      if (!res.ok) throw new Error(`Failed to load messages: ${res.status}`);
      const data = await res.json() as Array<Record<string, unknown>>;

      // Messages come in DESC order from API; reverse for chronological
      const newMessages: UIMessage[] = data.reverse().map(m => ({
        id: m.id as number,
        role: m.role as UIMessage['role'],
        content: extractText(m.content),
        parts: m.content as UIMessage['parts'],
        createdAt: new Date(m.createdAt as string),
        metadata: m.metadata as Record<string, unknown> | undefined,
      }));

      setHistoryMessages(prev => {
        // Deduplicate: remove any history messages that exist in new batch
        const existingIds = new Set(prev.map(m => m.id));
        const unique = newMessages.filter(m => !existingIds.has(m.id));
        return [...unique, ...prev];
      });

      setHasMore(data.length >= PAGE_SIZE);
      pageRef.current += 1;
    } catch {
      // Silently fail load-more
    } finally {
      setIsLoadingMore(false);
    }
  }, [sessionId, apiBaseUrl, headers, isLoadingMore, hasMore]);

  // Merge: history first, then realtime (deduplicated)
  const historyIds = new Set(historyMessages.map(m => m.id));
  const dedupedRealtime = realtimeMessages.filter(m => !historyIds.has(m.id));
  const messages = [...historyMessages, ...dedupedRealtime];

  return { messages, appendRealtime, updateRealtimeMessage, clearRealtime, loadMore, hasMore, isLoadingMore };
}

function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((p: Record<string, unknown>) => p.type === 'text' && p.text)
      .map((p: Record<string, unknown>) => p.text as string)
      .join('\n');
  }
  return '';
}

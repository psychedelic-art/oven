'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { RefObject } from 'react';

const BOTTOM_THRESHOLD = 50;
const TOP_THRESHOLD = 100;

export interface UseChatScrollReturn {
  scrollToBottom: () => void;
  isAtBottom: boolean;
  showScrollToBottom: boolean;
}

export function useChatScroll(
  containerRef: RefObject<HTMLElement | null>,
  messageCount: number,
  onLoadMore?: () => void,
): UseChatScrollReturn {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const prevMessageCount = useRef(messageCount);

  const scrollToBottom = useCallback(() => {
    const el = containerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [containerRef]);

  // Handle scroll events
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let debounceTimer: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const { scrollTop, scrollHeight, clientHeight } = el;
        const atBottom = scrollHeight - scrollTop - clientHeight < BOTTOM_THRESHOLD;
        setIsAtBottom(atBottom);
        setShowScrollToBottom(!atBottom);

        // Load more trigger at top
        if (scrollTop < TOP_THRESHOLD && onLoadMore) {
          onLoadMore();
        }
      }, 100);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      clearTimeout(debounceTimer);
    };
  }, [containerRef, onLoadMore]);

  // Auto-scroll on new messages (only if at bottom)
  useEffect(() => {
    if (messageCount > prevMessageCount.current && isAtBottom) {
      scrollToBottom();
    }
    prevMessageCount.current = messageCount;
  }, [messageCount, isAtBottom, scrollToBottom]);

  return { scrollToBottom, isAtBottom, showScrollToBottom };
}

'use client';

import { useRef } from 'react';
import { cn } from '@oven/oven-ui';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { useChatScroll } from '../hooks/useChatScroll';
import type { MessageListProps } from '../types';

export function MessageList({
  messages,
  isStreaming,
  showTimestamps,
  onLoadMore,
  hasMore,
  className,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollToBottom, showScrollToBottom } = useChatScroll(containerRef, messages.length, onLoadMore);

  return (
    <div
      ref={containerRef}
      className={cn('flex-1 overflow-y-auto px-4 py-3 space-y-3', className)}
      role="log"
      aria-live="polite"
    >
      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          className={cn('block mx-auto text-xs text-gray-400 hover:text-gray-600 py-2')}
        >
          Load older messages
        </button>
      )}

      {messages.map(msg => (
        <MessageBubble
          key={msg.id}
          message={msg}
          showTimestamp={showTimestamps}
        />
      ))}

      {isStreaming && !messages.some(m => m.isStreaming) && (
        <TypingIndicator />
      )}

      {showScrollToBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          className={cn(
            'fixed bottom-20 right-8 w-8 h-8 rounded-full bg-white shadow-md',
            'flex items-center justify-center text-gray-500 hover:text-gray-700 z-40',
          )}
          aria-label="Scroll to bottom"
        >
          ↓
        </button>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { cn } from '@oven/oven-ui';
import { MessageList } from './MessageList';
import type { ConversationViewProps, UIMessage } from '../types';

export function ConversationView({
  sessionId,
  apiBaseUrl = '',
  showToolCalls,
  showTimestamps = true,
  className,
}: ConversationViewProps) {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(`${apiBaseUrl}/api/chat-sessions/${sessionId}/messages?range=[0,999]`)
      .then(res => res.json())
      .then((data: Array<Record<string, unknown>>) => {
        const mapped: UIMessage[] = data.map(m => ({
          id: m.id as number,
          role: m.role as UIMessage['role'],
          content: typeof m.content === 'string'
            ? m.content
            : Array.isArray(m.content)
              ? (m.content as Array<Record<string, unknown>>)
                  .filter(p => p.type === 'text')
                  .map(p => p.text as string)
                  .join('\n')
              : '',
          parts: m.content as UIMessage['parts'],
          createdAt: new Date(m.createdAt as string),
          metadata: m.metadata as Record<string, unknown> | undefined,
        }));
        setMessages(mapped);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [sessionId, apiBaseUrl]);

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center h-full text-sm text-gray-400', className)}>
        Loading conversation...
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <MessageList
        messages={messages}
        showTimestamps={showTimestamps}
      />
    </div>
  );
}

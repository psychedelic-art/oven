'use client';

import { cn } from '@oven/oven-ui';
import { StreamingText } from './StreamingText';
import { ToolCallCard } from './ToolCallCard';
import { MessageFeedback } from './MessageFeedback';
import type { MessageBubbleProps } from '../types';

const roleStyles: Record<string, string> = {
  user: 'ml-auto bg-[var(--oven-widget-bubble-user,#1976D2)] text-white rounded-2xl rounded-br-sm',
  assistant: 'mr-auto bg-[var(--oven-widget-bubble-assistant,#F5F5F5)] text-gray-900 rounded-2xl rounded-bl-sm',
  system: 'mx-auto bg-gray-100 text-gray-600 rounded-lg text-center text-xs italic',
  tool: 'mr-auto ml-6 bg-gray-50 border border-gray-200 rounded-lg',
};

export function MessageBubble({ message, showTimestamp, showFeedback, onFeedback, className }: MessageBubbleProps) {
  const toolParts = message.parts?.filter(p => p.type === 'tool-call' || p.type === 'tool-result') ?? [];

  return (
    <div
      className={cn(
        'max-w-[85%] px-4 py-2.5',
        roleStyles[message.role] ?? roleStyles.assistant,
        className,
      )}
      role="listitem"
    >
      <StreamingText
        text={message.content}
        isStreaming={message.isStreaming}
      />

      {toolParts.map((part, i) => (
        <ToolCallCard
          key={part.toolCallId ?? i}
          toolName={part.toolName ?? 'Unknown tool'}
          input={part.input}
          output={part.output}
          status={part.status}
          durationMs={part.durationMs}
        />
      ))}

      {message.error && (
        <p className={cn('text-xs text-red-500 mt-1')}>{message.error}</p>
      )}

      <div className={cn('flex items-center justify-between mt-1')}>
        {showTimestamp && (
          <time className={cn('text-xs opacity-50')}>
            {message.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </time>
        )}
        {showFeedback && message.role === 'assistant' && onFeedback && (
          <MessageFeedback
            messageId={message.id}
            onFeedback={onFeedback}
          />
        )}
      </div>
    </div>
  );
}

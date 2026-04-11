'use client';

import { cn } from '@oven/oven-ui';
import type { StreamingTextProps } from '../types';

export function StreamingText({ text, isStreaming, className }: StreamingTextProps) {
  return (
    <div className={cn('prose prose-sm max-w-none dark:prose-invert', className)}>
      <p className={cn('whitespace-pre-wrap break-words m-0')}>
        {text}
        {isStreaming && (
          <span className={cn('inline-block w-0.5 h-4 ml-0.5 bg-current animate-pulse')} />
        )}
      </p>
    </div>
  );
}

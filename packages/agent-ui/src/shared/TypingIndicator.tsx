'use client';

import { cn } from '@oven/oven-ui';
import type { TypingIndicatorProps } from '../types';

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-1 px-4 py-2', className)}>
      <span className={cn('w-2 h-2 rounded-full bg-gray-400 animate-bounce')} />
      <span className={cn('w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]')} />
      <span className={cn('w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]')} />
    </div>
  );
}

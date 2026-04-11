'use client';

import { cn } from '@oven/oven-ui';
import type { WelcomeScreenProps } from '../types';

export function WelcomeScreen({ message, quickReplies, onQuickReply, className }: WelcomeScreenProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center p-6 space-y-4', className)}>
      <p className={cn('text-sm text-gray-600 max-w-xs')}>{message}</p>
      {quickReplies && quickReplies.length > 0 && (
        <div className={cn('flex flex-wrap gap-2 justify-center')}>
          {quickReplies.map(reply => (
            <button
              key={reply}
              type="button"
              onClick={() => onQuickReply(reply)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                'border-[var(--oven-widget-primary,#1976D2)] text-[var(--oven-widget-primary,#1976D2)]',
                'hover:bg-[var(--oven-widget-primary,#1976D2)] hover:text-white',
              )}
            >
              {reply}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

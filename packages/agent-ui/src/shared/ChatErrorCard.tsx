'use client';

import { cn } from '@oven/oven-ui';
import type { ChatErrorCardProps } from '../types';

const categoryStyles: Record<string, string> = {
  network: 'border-amber-300 bg-amber-50 text-amber-800',
  session: 'border-red-300 bg-red-50 text-red-800',
  agent: 'border-orange-300 bg-orange-50 text-orange-800',
};

export function ChatErrorCard({ error, category = 'network', onRetry, className }: ChatErrorCardProps) {
  return (
    <div className={cn('rounded-lg border p-4', categoryStyles[category] ?? categoryStyles.network, className)}>
      <p className={cn('text-sm font-medium mb-1')}>Something went wrong</p>
      <p className={cn('text-xs opacity-80')}>{error}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={cn('mt-2 text-xs font-medium underline hover:no-underline')}
        >
          Try again
        </button>
      )}
    </div>
  );
}

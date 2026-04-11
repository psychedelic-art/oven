'use client';

import { cn } from '@oven/oven-ui';
import type { MessageFeedbackProps } from '../types';

export function MessageFeedback({ messageId, currentRating, onFeedback, className }: MessageFeedbackProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button
        type="button"
        onClick={() => onFeedback('positive')}
        className={cn(
          'p-1 rounded hover:bg-gray-100 text-sm transition-colors',
          currentRating === 'positive' && 'text-green-600 bg-green-50',
          currentRating !== 'positive' && 'text-gray-400',
        )}
        aria-label="Thumbs up"
      >
        👍
      </button>
      <button
        type="button"
        onClick={() => onFeedback('negative')}
        className={cn(
          'p-1 rounded hover:bg-gray-100 text-sm transition-colors',
          currentRating === 'negative' && 'text-red-600 bg-red-50',
          currentRating !== 'negative' && 'text-gray-400',
        )}
        aria-label="Thumbs down"
      >
        👎
      </button>
    </div>
  );
}

'use client';

import type { ReactNode } from 'react';
import { cn } from '@oven/oven-ui';

// ─── Types ──────────────────────────────────────────────────

export interface ChatHeaderProps {
  title: string;
  subtitle?: string | null;
  /** Visual streaming indicator at the right of the title. */
  status?: 'idle' | 'streaming' | 'error';
  /** Small badge slot, rendered next to the title. Use for mode indicators. */
  badge?: ReactNode;
  /** Theme selector slot — rendered between title area and right controls. */
  themeSlot?: ReactNode;
  /** Connection status slot — rendered before the right controls. */
  connectionSlot?: ReactNode;
  /** Layout mode toggle slot — rendered in the right controls area. */
  layoutSlot?: ReactNode;
  /** Free slot on the right side (e.g. Inspector toggle, menu). */
  rightSlot?: ReactNode;
  className?: string;
}

// ─── Component ──────────────────────────────────────────────

/**
 * Tailwind chat header. Ported from newsan's `chat-header.tsx` to give the
 * playground a dedicated session header (instead of an ad-hoc inline top bar).
 * Intentionally pure presentational — no routing, no MUI, no data fetches.
 *
 * Slot layout (left → right):
 *   [title + badge + subtitle] | [themeSlot] | [status + connectionSlot + layoutSlot + rightSlot]
 *
 * Future: adopt the AI SDK `useChat` status pattern ('ready' | 'submitted' |
 * 'streaming' | 'error') once we migrate to @ai-sdk/react.
 */
export function ChatHeader({
  title,
  subtitle,
  status = 'idle',
  badge,
  themeSlot,
  connectionSlot,
  layoutSlot,
  rightSlot,
  className,
}: ChatHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 px-4 py-2 border-b border-gray-200 bg-gray-50',
        className,
      )}
      role="banner"
    >
      <div className={cn('flex items-center gap-2 min-w-0')}>
        <div className={cn('flex items-center gap-2 min-w-0')}>
          <span className={cn('text-sm font-medium text-gray-900 truncate')}>{title}</span>
          {badge}
        </div>
        {subtitle && (
          <span className={cn('text-xs text-gray-500 truncate')}>{subtitle}</span>
        )}
      </div>

      {themeSlot && (
        <div className={cn('shrink-0')}>
          {themeSlot}
        </div>
      )}

      <div className={cn('flex items-center gap-2 shrink-0')}>
        {status === 'streaming' && (
          <span
            className={cn('text-xs text-blue-500 animate-pulse')}
            aria-live="polite"
          >
            ● Streaming
          </span>
        )}
        {status === 'error' && (
          <span className={cn('text-xs text-red-500')} aria-live="polite">
            ● Error
          </span>
        )}
        {connectionSlot}
        {layoutSlot}
        {rightSlot}
      </div>
    </div>
  );
}

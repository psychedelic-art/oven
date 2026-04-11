'use client';

import { cn } from '@oven/oven-ui';
import type { WidgetLauncherProps } from '../types';

export function WidgetLauncher({ isOpen, onClick, unreadCount, className }: WidgetLauncherProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-14 h-14 rounded-full shadow-lg flex items-center justify-center',
        'bg-[var(--oven-widget-primary,#1976D2)] text-white',
        'hover:scale-105 active:scale-95 transition-transform',
        className,
      )}
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
    >
      {isOpen ? (
        <span className={cn('text-xl')}>✕</span>
      ) : (
        <>
          <span className={cn('text-xl')}>💬</span>
          {unreadCount !== undefined && unreadCount > 0 && (
            <span
              className={cn(
                'absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs',
                'flex items-center justify-center font-medium',
              )}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </>
      )}
    </button>
  );
}

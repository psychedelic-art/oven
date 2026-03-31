'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface AlertProps {
  title?: string;
  message: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const variantStyles: Record<
  string,
  { container: string; icon: string; iconChar: string }
> = {
  info: {
    container: 'border-blue-200 bg-blue-50 text-blue-800',
    icon: 'text-blue-500',
    iconChar: '\u2139',
  },
  success: {
    container: 'border-green-200 bg-green-50 text-green-800',
    icon: 'text-green-500',
    iconChar: '\u2713',
  },
  warning: {
    container: 'border-yellow-200 bg-yellow-50 text-yellow-800',
    icon: 'text-yellow-500',
    iconChar: '\u26A0',
  },
  error: {
    container: 'border-red-200 bg-red-50 text-red-800',
    icon: 'text-red-500',
    iconChar: '\u2715',
  },
};

export function Alert({
  title,
  message,
  variant = 'info',
  dismissible = false,
  onDismiss,
  className,
}: AlertProps) {
  const styles = variantStyles[variant];

  return (
    <div
      role="alert"
      className={cn(
        'relative flex gap-3 rounded-md border px-4 py-3',
        styles.container,
        className
      )}
    >
      {/* Icon */}
      <span
        className={cn('mt-0.5 shrink-0 text-lg leading-none', styles.icon)}
        aria-hidden="true"
      >
        {styles.iconChar}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <p className="text-sm font-semibold">{title}</p>
        )}
        <p className={cn('text-sm', title && 'mt-1')}>{message}</p>
      </div>

      {/* Dismiss button */}
      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-md p-0.5 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current focus:ring-offset-2"
          aria-label="Dismiss"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export default Alert;

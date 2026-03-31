'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface DividerProps {
  label?: string;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function Divider({
  label,
  orientation = 'horizontal',
  className,
}: DividerProps) {
  if (orientation === 'vertical') {
    return (
      <div
        className={cn('inline-flex h-full items-center', className)}
        role="separator"
        aria-orientation="vertical"
      >
        <div className="h-full w-px bg-gray-200" />
        {label && (
          <span className="absolute -translate-y-1/2 bg-white px-1 text-xs text-gray-500">
            {label}
          </span>
        )}
      </div>
    );
  }

  if (label) {
    return (
      <div
        className={cn('relative flex items-center', className)}
        role="separator"
        aria-orientation="horizontal"
      >
        <div className="flex-grow border-t border-gray-200" />
        <span className="mx-3 shrink-0 text-xs text-gray-500">{label}</span>
        <div className="flex-grow border-t border-gray-200" />
      </div>
    );
  }

  return (
    <hr
      className={cn('border-t border-gray-200', className)}
      role="separator"
      aria-orientation="horizontal"
    />
  );
}

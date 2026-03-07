'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface Grid3ColProps {
  children: React.ReactNode;
  gap?: 'sm' | 'md' | 'lg';
  responsive?: boolean;
  className?: string;
}

const gapClasses: Record<string, string> = {
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
};

export function Grid3Col({
  children,
  gap = 'md',
  responsive = true,
  className,
}: Grid3ColProps) {
  return (
    <div
      className={cn(
        'grid',
        responsive
          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          : 'grid-cols-3',
        gapClasses[gap],
        className
      )}
    >
      {children}
    </div>
  );
}

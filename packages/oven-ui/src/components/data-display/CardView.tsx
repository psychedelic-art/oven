'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface CardViewProps<T = unknown> {
  data: T[];
  renderCard: (item: T, index: number) => React.ReactNode;
  loading?: boolean;
  error?: string;
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

const columnClasses: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
};

const gapClasses: Record<string, string> = {
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
};

export function CardView<T = unknown>({
  data,
  renderCard,
  loading = false,
  error,
  columns = 3,
  gap = 'md',
  className,
}: CardViewProps<T>) {
  if (error) {
    return (
      <div className={cn('rounded-lg border border-gray-200 bg-white p-4 text-center text-sm text-red-600 shadow-sm', className)}>
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn('grid', columnClasses[columns], gapClasses[gap], className)}>
        {Array.from({ length: columns * 2 }).map((_, i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-lg border border-gray-200 bg-gray-100 shadow-sm"
          />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={cn('rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm', className)}>
        No items to display
      </div>
    );
  }

  return (
    <div className={cn('grid', columnClasses[columns], gapClasses[gap], className)}>
      {data.map((item, index) => (
        <div key={index}>{renderCard(item, index)}</div>
      ))}
    </div>
  );
}

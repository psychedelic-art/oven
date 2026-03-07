'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { cn } from '../../lib/utils';

export interface ScrolledListProps<T = unknown> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  loading?: boolean;
  error?: string;
  hasMore?: boolean;
  onLoadMore?: () => void;
  batchSize?: number;
  emptyMessage?: string;
  className?: string;
}

export function ScrolledList<T = unknown>({
  data,
  renderItem,
  loading = false,
  error,
  hasMore = false,
  onLoadMore,
  batchSize: _batchSize,
  emptyMessage = 'No items to display',
  className,
}: ScrolledListProps<T>) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !loading && onLoadMore) {
        onLoadMore();
      }
    },
    [hasMore, loading, onLoadMore]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: '100px',
      threshold: 0,
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleIntersection]);

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white shadow-sm', className)}>
      {/* Error state */}
      {error && (
        <div className="p-4 text-center text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && data.length === 0 && (
        <div className="p-8 text-center text-sm text-gray-500">
          {emptyMessage}
        </div>
      )}

      {/* List items */}
      {!error && data.length > 0 && (
        <div className="divide-y divide-gray-200">
          {data.map((item, index) => (
            <div key={index} className="px-4 py-3">
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      )}

      {/* Intersection observer sentinel + Load More button */}
      {!error && hasMore && (
        <div ref={sentinelRef} className="border-t border-gray-200 px-4 py-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => onLoadMore?.()}
            className={cn(
              'inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors',
              loading
                ? 'cursor-not-allowed text-gray-400'
                : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Loading...
              </span>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}

      {/* Loading spinner at bottom when loading initial/more data */}
      {loading && data.length === 0 && !error && (
        <div className="flex items-center justify-center p-8">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Loading...
          </div>
        </div>
      )}
    </div>
  );
}

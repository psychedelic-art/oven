'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface PaginatedListProps<T = unknown> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  loading?: boolean;
  error?: string;
  pageSize?: number;
  currentPage?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  emptyMessage?: string;
  className?: string;
}

export function PaginatedList<T = unknown>({
  data,
  renderItem,
  loading = false,
  error,
  pageSize = 10,
  currentPage = 1,
  totalCount,
  onPageChange,
  emptyMessage = 'No items to display',
  className,
}: PaginatedListProps<T>) {
  const total = totalCount ?? data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white shadow-sm', className)}>
      {/* Error state */}
      {error && (
        <div className="p-4 text-center text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && !error && (
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

      {/* Pagination controls */}
      {!error && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
          <div className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange?.(currentPage - 1)}
              className={cn(
                'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                currentPage <= 1
                  ? 'cursor-not-allowed text-gray-300'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange?.(currentPage + 1)}
              className={cn(
                'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                currentPage >= totalPages
                  ? 'cursor-not-allowed text-gray-300'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

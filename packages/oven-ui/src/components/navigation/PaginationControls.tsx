'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  siblingCount?: number;
  className?: string;
}

function generatePageNumbers(
  currentPage: number,
  totalPages: number,
  siblingCount: number
): (number | 'ellipsis')[] {
  const pages: (number | 'ellipsis')[] = [];

  const leftSibling = Math.max(currentPage - siblingCount, 1);
  const rightSibling = Math.min(currentPage + siblingCount, totalPages);

  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < totalPages - 1;

  // Always show page 1
  if (totalPages >= 1) {
    pages.push(1);
  }

  // Left ellipsis
  if (showLeftEllipsis) {
    pages.push('ellipsis');
  } else if (leftSibling > 2) {
    // Fill gap between 1 and leftSibling
    for (let i = 2; i < leftSibling; i++) {
      pages.push(i);
    }
  }

  // Sibling pages (excluding 1 and totalPages, handled separately)
  for (let i = leftSibling; i <= rightSibling; i++) {
    if (i !== 1 && i !== totalPages) {
      pages.push(i);
    }
  }

  // Right ellipsis
  if (showRightEllipsis) {
    pages.push('ellipsis');
  } else if (rightSibling < totalPages - 1) {
    for (let i = rightSibling + 1; i < totalPages; i++) {
      pages.push(i);
    }
  }

  // Always show last page
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

const buttonBase =
  'inline-flex items-center justify-center h-9 min-w-[2.25rem] rounded-md border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  siblingCount = 1,
  className,
}: PaginationControlsProps) {
  const pages = generatePageNumbers(currentPage, totalPages, siblingCount);

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center gap-1', className)}
    >
      {/* First page */}
      {showFirstLast && (
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
          className={cn(
            buttonBase,
            'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          )}
          aria-label="First page"
        >
          &laquo;
        </button>
      )}

      {/* Previous page */}
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        className={cn(
          buttonBase,
          'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        )}
        aria-label="Previous page"
      >
        &lsaquo;
      </button>

      {/* Page numbers */}
      {pages.map((page, index) => {
        if (page === 'ellipsis') {
          return (
            <span
              key={`ellipsis-${index}`}
              className="inline-flex h-9 min-w-[2.25rem] items-center justify-center text-sm text-gray-400"
            >
              &hellip;
            </span>
          );
        }

        const isActive = page === currentPage;

        return (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              buttonBase,
              isActive
                ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            )}
          >
            {page}
          </button>
        );
      })}

      {/* Next page */}
      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className={cn(
          buttonBase,
          'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        )}
        aria-label="Next page"
      >
        &rsaquo;
      </button>

      {/* Last page */}
      {showFirstLast && (
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          className={cn(
            buttonBase,
            'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          )}
          aria-label="Last page"
        >
          &raquo;
        </button>
      )}
    </nav>
  );
}

export default PaginationControls;

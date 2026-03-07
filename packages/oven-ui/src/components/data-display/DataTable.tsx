'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '../../lib/utils';

export interface DataTableColumn {
  key: string;
  label: string;
  type?: 'string' | 'number' | 'date' | 'boolean';
  sortable?: boolean;
  width?: string;
}

export interface DataTableProps {
  columns: DataTableColumn[];
  data: Record<string, unknown>[];
  loading?: boolean;
  error?: string;
  pageSize?: number;
  currentPage?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onRowClick?: (row: Record<string, unknown>, index: number) => void;
  selectable?: boolean;
  selectedRows?: number[];
  onSelectionChange?: (selectedRows: number[]) => void;
  className?: string;
}

export function DataTable({
  columns,
  data,
  loading = false,
  error,
  pageSize = 10,
  currentPage = 1,
  totalCount,
  onPageChange,
  onSort,
  onRowClick,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  className,
}: DataTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const total = totalCount ?? data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleSort = useCallback(
    (key: string) => {
      const newDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
      setSortKey(key);
      setSortDirection(newDirection);
      onSort?.(key, newDirection);
    },
    [sortKey, sortDirection, onSort]
  );

  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;
    if (selectedRows.length === data.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(data.map((_, i) => i));
    }
  }, [data, selectedRows, onSelectionChange]);

  const handleSelectRow = useCallback(
    (index: number) => {
      if (!onSelectionChange) return;
      if (selectedRows.includes(index)) {
        onSelectionChange(selectedRows.filter((i) => i !== index));
      } else {
        onSelectionChange([...selectedRows, index]);
      }
    },
    [selectedRows, onSelectionChange]
  );

  const renderCellValue = (value: unknown): React.ReactNode => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (value instanceof Date) return value.toLocaleDateString();
    return String(value);
  };

  return (
    <div className={cn('relative rounded-lg border border-gray-200 bg-white shadow-sm', className)}>
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/70">
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

      {/* Error state */}
      {error && (
        <div className="p-4 text-center text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Table */}
      {!error && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  {selectable && (
                    <th className="w-10 px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={data.length > 0 && selectedRows.length === data.length}
                        onChange={handleSelectAll}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                  )}
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={cn(
                        'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500',
                        col.sortable && 'cursor-pointer select-none hover:text-gray-700'
                      )}
                      style={col.width ? { width: col.width } : undefined}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        {col.sortable && sortKey === col.key && (
                          <span className="text-gray-400">
                            {sortDirection === 'asc' ? '\u2191' : '\u2193'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.length === 0 && !loading ? (
                  <tr>
                    <td
                      colSpan={columns.length + (selectable ? 1 : 0)}
                      className="px-4 py-12 text-center text-sm text-gray-500"
                    >
                      No data available
                    </td>
                  </tr>
                ) : (
                  data.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className={cn(
                        'transition-colors hover:bg-gray-50',
                        onRowClick && 'cursor-pointer',
                        selectedRows.includes(rowIndex) && 'bg-blue-50'
                      )}
                      onClick={() => onRowClick?.(row, rowIndex)}
                    >
                      {selectable && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(rowIndex)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleSelectRow(rowIndex);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td key={col.key} className="px-4 py-3 text-gray-700">
                          {renderCellValue(row[col.key])}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
              <div className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
                {totalCount !== undefined && (
                  <span className="ml-2 text-gray-400">({totalCount} total)</span>
                )}
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
        </>
      )}
    </div>
  );
}

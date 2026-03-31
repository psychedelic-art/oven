'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { cn } from '../../lib/utils';

export interface ApiFetcherProps {
  endpoint: string;
  method?: 'GET' | 'POST';
  params?: Record<string, unknown>;
  children?: (
    data: unknown,
    loading: boolean,
    error: string | null,
    refetch: () => void
  ) => React.ReactNode;
  autoFetch?: boolean;
  className?: string;
}

export function ApiFetcher({
  endpoint,
  method = 'GET',
  params,
  children,
  autoFetch = true,
  className,
}: ApiFetcherProps) {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };

      let url = endpoint;

      if (method === 'GET' && params) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          searchParams.append(key, String(value));
        });
        url = `${endpoint}?${searchParams.toString()}`;
      } else if (method === 'POST' && params) {
        options.body = JSON.stringify(params);
      }

      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [endpoint, method, params]);

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  // If children render prop is provided, delegate rendering entirely
  if (children) {
    return <>{children(data, loading, error, fetchData)}</>;
  }

  // Default rendering when no children render prop is provided
  return (
    <div className={cn('w-full', className)}>
      {loading && (
        <div className="flex items-center justify-center py-8">
          <svg
            className="h-6 w-6 animate-spin text-blue-600"
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      )}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {Boolean(!loading && !error && data) && (
        <pre className="overflow-auto rounded-md bg-gray-50 p-4 text-sm text-gray-700">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default ApiFetcher;

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { DataSourceConfig, FormContext } from '../types';
import { resolveParams } from './useFormContext';

// ─── useDataSource ──────────────────────────────────────────────
// Fetches data from configured API endpoints or workflows.
// Supports pagination (offset/cursor), caching, and auto-refetch.

interface UseDataSourceResult {
  data: unknown[] | null;
  loading: boolean;
  error: string | null;
  /** Current page (offset mode) */
  page: number;
  /** Total count from Content-Range header */
  totalCount: number | null;
  /** Whether more data is available (cursor mode) */
  hasMore: boolean;
  /** Go to specific page (offset mode) */
  setPage: (page: number) => void;
  /** Load next batch (cursor mode) */
  loadMore: () => void;
  /** Re-fetch current data */
  refetch: () => void;
}

interface UseDataSourceOptions {
  /** Data source configuration */
  config: DataSourceConfig;
  /** Form context for $.path resolution */
  context: FormContext;
  /** Auto-fetch on mount (default true) */
  autoFetch?: boolean;
}

export function useDataSource({
  config,
  context,
  autoFetch = true,
}: UseDataSourceOptions): UseDataSourceResult {
  const [data, setData] = useState<unknown[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef<string | null>(null);
  const cacheRef = useRef<Map<string, { data: unknown[]; timestamp: number }>>(new Map());

  const pageSize = config.pagination?.pageSize ?? 25;
  const paginationMode = config.pagination?.mode ?? 'offset';

  const fetchData = useCallback(async (targetPage: number, append = false) => {
    if (!config.endpoint && config.type !== 'static') return;

    // Static data source — just use params as data
    if (config.type === 'static') {
      const resolved = resolveParams(config.params, context);
      setData(Array.isArray(resolved.data) ? resolved.data as unknown[] : [resolved]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Resolve $.path params from form context
      const resolvedParams = resolveParams(config.params, context);

      // Build query string
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(resolvedParams)) {
        if (value != null) {
          queryParams.set(key, String(value));
        }
      }

      // Add pagination params
      if (config.pagination?.enabled) {
        if (paginationMode === 'offset') {
          const start = targetPage * pageSize;
          const end = start + pageSize - 1;
          queryParams.set('range', JSON.stringify([start, end]));
        } else if (paginationMode === 'cursor' && cursorRef.current) {
          queryParams.set('cursor', cursorRef.current);
          queryParams.set('limit', String(pageSize));
        } else {
          queryParams.set('limit', String(pageSize));
        }
      }

      const url = `${config.endpoint}?${queryParams.toString()}`;

      // Check cache
      if (config.cachePolicy === 'ttl' && config.ttlSeconds) {
        const cached = cacheRef.current.get(url);
        if (cached && Date.now() - cached.timestamp < config.ttlSeconds * 1000) {
          setData(append && data ? [...data, ...cached.data] : cached.data);
          setLoading(false);
          return;
        }
      }

      const response = await fetch(url, {
        method: config.method || 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }

      // Parse Content-Range header for total count
      const contentRange = response.headers.get('Content-Range');
      if (contentRange) {
        const match = contentRange.match(/\d+-\d+\/(\d+)/);
        if (match) {
          setTotalCount(parseInt(match[1], 10));
        }
      }

      const result = await response.json();
      const resultData = Array.isArray(result) ? result : result.data ?? [result];

      // Cache result
      if (config.cachePolicy === 'ttl') {
        cacheRef.current.set(url, { data: resultData, timestamp: Date.now() });
      }

      // Handle pagination modes
      if (append && data) {
        setData([...data, ...resultData]);
      } else {
        setData(resultData);
      }

      // Update cursor for cursor-based pagination
      if (paginationMode === 'cursor') {
        cursorRef.current = result.nextCursor ?? null;
        setHasMore(resultData.length >= pageSize);
      } else {
        const total = totalCount ?? (contentRange ? parseInt(contentRange.split('/')[1], 10) : null);
        setHasMore(total != null ? (targetPage + 1) * pageSize < total : resultData.length >= pageSize);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [config, context, data, pageSize, paginationMode, totalCount]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchData(0);
    }
    // Only fetch on mount or when config changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.endpoint, autoFetch]);

  const handleSetPage = useCallback((newPage: number) => {
    setPage(newPage);
    fetchData(newPage);
  }, [fetchData]);

  const handleLoadMore = useCallback(() => {
    fetchData(page + 1, true);
    setPage(prev => prev + 1);
  }, [fetchData, page]);

  const refetch = useCallback(() => {
    cacheRef.current.clear();
    cursorRef.current = null;
    fetchData(page);
  }, [fetchData, page]);

  return {
    data,
    loading,
    error,
    page,
    totalCount,
    hasMore,
    setPage: handleSetPage,
    loadMore: handleLoadMore,
    refetch,
  };
}

export default useDataSource;

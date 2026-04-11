'use client';

import { useState, useEffect } from 'react';
import type { TenantPublicConfig } from '../types';

const cache = new Map<string, TenantPublicConfig>();

export interface UseTenantConfigReturn {
  config: TenantPublicConfig | null;
  isLoading: boolean;
  error: Error | null;
}

export function useTenantConfig(tenantSlug: string, apiBaseUrl: string = ''): UseTenantConfigReturn {
  const [config, setConfig] = useState<TenantPublicConfig | null>(cache.get(tenantSlug) ?? null);
  const [isLoading, setIsLoading] = useState(!cache.has(tenantSlug));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (cache.has(tenantSlug)) {
      setConfig(cache.get(tenantSlug)!);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetch(`${apiBaseUrl}/api/tenants/${tenantSlug}/public`)
      .then(res => {
        if (!res.ok) throw new Error(`Tenant config fetch failed: ${res.status}`);
        return res.json();
      })
      .then((data: TenantPublicConfig) => {
        if (cancelled) return;
        cache.set(tenantSlug, data);
        setConfig(data);
        setIsLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [tenantSlug, apiBaseUrl]);

  return { config, isLoading, error };
}

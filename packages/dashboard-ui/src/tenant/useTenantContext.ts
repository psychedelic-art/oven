import { useContext } from 'react';
import { useStore } from 'zustand';
import type { TenantStore } from './types';
import { TenantContext } from './TenantContextProvider';

/**
 * Read from the tenant context store.
 *
 * Usage:
 *   const id = useTenantContext(s => s.activeTenantId);
 *   const store = useTenantContext();
 */
export function useTenantContext(): TenantStore;
export function useTenantContext<T>(selector: (state: TenantStore) => T): T;
export function useTenantContext<T>(selector?: (state: TenantStore) => T) {
  const store = useContext(TenantContext);
  if (!store) {
    throw new Error(
      'useTenantContext must be used within a <TenantContextProvider>',
    );
  }
  if (selector) {
    return useStore(store, selector);
  }
  return useStore(store, (s) => s);
}

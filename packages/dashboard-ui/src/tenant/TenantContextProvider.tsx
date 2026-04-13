import React, { createContext, useRef } from 'react';
import type { StoreApi } from 'zustand/vanilla';
import type { TenantStore, TenantProviderProps } from './types';
import { createTenantStore } from './createTenantStore';

export const TenantContext = createContext<StoreApi<TenantStore> | null>(null);

export function TenantContextProvider({
  dataProvider,
  permissions,
  initialTenantId,
  children,
}: TenantProviderProps) {
  const storeRef = useRef<StoreApi<TenantStore> | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createTenantStore(dataProvider, permissions, initialTenantId);
  }

  return (
    <TenantContext.Provider value={storeRef.current}>
      {children}
    </TenantContext.Provider>
  );
}

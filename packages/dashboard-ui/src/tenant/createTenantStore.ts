import { createStore } from 'zustand/vanilla';
import type { TenantStore, DataProvider, Permissions } from './types';

/**
 * Factory function that creates a new tenant store.
 * Captures `dataProvider` and `permissions` by closure.
 *
 * WARNING: Do NOT call this at module-level — it must be called inside a
 * React component or provider to ensure per-instance isolation.
 */
export function createTenantStore(
  dataProvider: DataProvider,
  permissions: Permissions,
  initialTenantId?: number | null,
) {
  return createStore<TenantStore>((set, get) => ({
    activeTenantId: initialTenantId ?? null,
    tenants: [],
    isLoading: false,
    isAdminMode: permissions.has('tenants.list') && (initialTenantId ?? null) === null,

    setActiveTenantId: (id: number | null) => {
      set({
        activeTenantId: id,
        isAdminMode: permissions.has('tenants.list') && id === null,
      });
    },

    loadTenants: async () => {
      if (get().isLoading) return;
      set({ isLoading: true });
      try {
        const { data } = await dataProvider.getList('tenants', {
          pagination: { page: 1, perPage: 1000 },
        });
        set({ tenants: data, isLoading: false });
      } catch {
        set({ isLoading: false });
      }
    },
  }));
}

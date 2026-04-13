import { describe, it, expect, vi } from 'vitest';
import { createTenantStore } from '../tenant/createTenantStore';
import type { DataProvider, Permissions } from '../tenant/types';

function mockDataProvider(tenants = [
  { id: 1, name: 'Clinic A', slug: 'clinic-a' },
  { id: 2, name: 'Clinic B', slug: 'clinic-b' },
]): DataProvider {
  return {
    getList: vi.fn().mockResolvedValue({ data: tenants, total: tenants.length }),
  };
}

function mockPermissions(hasTenantsList = true): Permissions {
  return {
    has: (p: string) => p === 'tenants.list' && hasTenantsList,
  };
}

describe('createTenantStore', () => {
  it('returns a new store per call (no singleton)', () => {
    const dp = mockDataProvider();
    const perms = mockPermissions();
    const storeA = createTenantStore(dp, perms);
    const storeB = createTenantStore(dp, perms);
    expect(storeA).not.toBe(storeB);
  });

  it('initializes with null activeTenantId by default', () => {
    const store = createTenantStore(mockDataProvider(), mockPermissions());
    expect(store.getState().activeTenantId).toBeNull();
  });

  it('initializes with provided initialTenantId', () => {
    const store = createTenantStore(mockDataProvider(), mockPermissions(), 5);
    expect(store.getState().activeTenantId).toBe(5);
  });

  it('loadTenants calls dataProvider.getList exactly once', async () => {
    const dp = mockDataProvider();
    const store = createTenantStore(dp, mockPermissions());
    await store.getState().loadTenants();
    expect(dp.getList).toHaveBeenCalledOnce();
    expect(dp.getList).toHaveBeenCalledWith('tenants', {
      pagination: { page: 1, perPage: 1000 },
    });
  });

  it('loadTenants populates the tenants array', async () => {
    const store = createTenantStore(mockDataProvider(), mockPermissions());
    await store.getState().loadTenants();
    expect(store.getState().tenants).toHaveLength(2);
    expect(store.getState().tenants[0].name).toBe('Clinic A');
  });

  it('setActiveTenantId updates the active tenant', () => {
    const store = createTenantStore(mockDataProvider(), mockPermissions());
    store.getState().setActiveTenantId(5);
    expect(store.getState().activeTenantId).toBe(5);
  });

  it('setActiveTenantId(null) clears the active tenant', () => {
    const store = createTenantStore(mockDataProvider(), mockPermissions(), 5);
    store.getState().setActiveTenantId(null);
    expect(store.getState().activeTenantId).toBeNull();
  });

  it('isAdminMode is true when permissions include tenants.list and no tenant selected', () => {
    const store = createTenantStore(mockDataProvider(), mockPermissions(true));
    expect(store.getState().isAdminMode).toBe(true);
  });

  it('isAdminMode is false when a tenant is selected', () => {
    const store = createTenantStore(mockDataProvider(), mockPermissions(true), 5);
    expect(store.getState().isAdminMode).toBe(false);
  });

  it('isAdminMode is false when user lacks tenants.list permission', () => {
    const store = createTenantStore(mockDataProvider(), mockPermissions(false));
    expect(store.getState().isAdminMode).toBe(false);
  });

  it('isAdminMode updates when setActiveTenantId is called', () => {
    const store = createTenantStore(mockDataProvider(), mockPermissions(true));
    expect(store.getState().isAdminMode).toBe(true);
    store.getState().setActiveTenantId(1);
    expect(store.getState().isAdminMode).toBe(false);
    store.getState().setActiveTenantId(null);
    expect(store.getState().isAdminMode).toBe(true);
  });

  it('does not call dataProvider concurrently if loadTenants is in flight', async () => {
    const dp = mockDataProvider();
    let resolveGetList: (v: { data: never[]; total: number }) => void;
    (dp.getList as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((r) => { resolveGetList = r; }),
    );

    const store = createTenantStore(dp, mockPermissions());

    // Start two loads simultaneously
    const load1 = store.getState().loadTenants();
    const load2 = store.getState().loadTenants();

    resolveGetList!({ data: [], total: 0 });
    await Promise.all([load1, load2]);

    // Should only have called getList once due to isLoading guard
    expect(dp.getList).toHaveBeenCalledOnce();
  });

  it('handles dataProvider errors gracefully', async () => {
    const dp = mockDataProvider();
    (dp.getList as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    const store = createTenantStore(dp, mockPermissions());
    await store.getState().loadTenants();

    expect(store.getState().isLoading).toBe(false);
    expect(store.getState().tenants).toEqual([]);
  });
});

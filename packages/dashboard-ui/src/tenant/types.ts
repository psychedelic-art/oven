export type Tenant = {
  id: number;
  name: string;
  slug: string;
};

export type TenantStore = {
  activeTenantId: number | null;
  tenants: Tenant[];
  isLoading: boolean;
  isAdminMode: boolean;
  setActiveTenantId: (id: number | null) => void;
  loadTenants: () => Promise<void>;
};

export type Permissions = {
  has: (permission: string) => boolean;
};

export type DataProvider = {
  getList: (
    resource: string,
    params: { pagination: { page: number; perPage: number } },
  ) => Promise<{ data: Tenant[]; total: number }>;
};

export type TenantProviderProps = {
  dataProvider: DataProvider;
  permissions: Permissions;
  initialTenantId?: number | null;
  children: React.ReactNode;
};

export type TenantContextValue = {
  store: import('zustand/vanilla').StoreApi<TenantStore>;
};

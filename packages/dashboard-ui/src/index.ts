// Tenant context primitive
export {
  createTenantStore,
  TenantContextProvider,
  TenantContext,
  useTenantContext,
  TenantSelector,
} from './tenant';
export type {
  Tenant,
  TenantStore,
  TenantProviderProps,
  Permissions,
  DataProvider,
} from './tenant';

// Placeholder barrels — stable import paths for future sprints
export { FilterToolbar } from './filters';
export { PageHeader, EmptyState, LoadingSkeleton, ErrorBoundary, MenuSectionLabel } from './chrome';
export { DashboardPlaygroundShell } from './playground';

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { tenants, tenantMembers } from './schema';

// Select types (read from DB)
export type Tenant = InferSelectModel<typeof tenants>;
export type TenantMember = InferSelectModel<typeof tenantMembers>;

// Insert types (write to DB)
export type NewTenant = InferInsertModel<typeof tenants>;
export type NewTenantMember = InferInsertModel<typeof tenantMembers>;

// Member roles
export type TenantMemberRole = 'owner' | 'admin' | 'member';

// Public tenant config (assembled from identity + module-config)
export interface PublicTenantConfig {
  name: string;
  businessName: string | null;
  logo: string | null;
  timezone: string;
  locale: string;
  schedule: Record<string, { open: string; close: string }> | null;
  authorizedServices: string[];
  paymentMethods: string[];
  tone: string;
  schedulingUrl: string | null;
  welcomeMessageBusinessHours: string | null;
  welcomeMessageOutOfHours: string | null;
  isBusinessHours: boolean;
}

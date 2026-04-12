import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type {
  serviceCategories,
  services,
  providers,
  providerServices,
  billingPlans,
  planQuotas,
  tenantSubscriptions,
  subscriptionQuotaOverrides,
} from './schema';

// ─── Service Catalog ──────────────────────────────────────────

export type ServiceCategory = InferSelectModel<typeof serviceCategories>;
export type NewServiceCategory = InferInsertModel<typeof serviceCategories>;

export type Service = InferSelectModel<typeof services>;
export type NewService = InferInsertModel<typeof services>;

export type Provider = InferSelectModel<typeof providers>;
export type NewProvider = InferInsertModel<typeof providers>;

export type ProviderService = InferSelectModel<typeof providerServices>;
export type NewProviderService = InferInsertModel<typeof providerServices>;

// ─── Billing ──────────────────────────────────────────────────

export type BillingPlan = InferSelectModel<typeof billingPlans>;
export type NewBillingPlan = InferInsertModel<typeof billingPlans>;

export type PlanQuota = InferSelectModel<typeof planQuotas>;
export type NewPlanQuota = InferInsertModel<typeof planQuotas>;

// ─── Tenant Subscriptions ─────────────────────────────────────

export type TenantSubscription = InferSelectModel<typeof tenantSubscriptions>;
export type NewTenantSubscription = InferInsertModel<typeof tenantSubscriptions>;

export type QuotaOverride = InferSelectModel<typeof subscriptionQuotaOverrides>;
export type NewQuotaOverride = InferInsertModel<typeof subscriptionQuotaOverrides>;

// ─── Subscription Status ──────────────────────────────────────

export type SubscriptionStatus = 'active' | 'trial' | 'past_due' | 'cancelled' | 'expired';

// ─── Quota Period ─────────────────────────────────────────────

export type QuotaPeriod = 'monthly' | 'daily' | 'yearly';

// ─── Billing Cycle ────────────────────────────────────────────

export type BillingCycle = 'monthly' | 'yearly';

// ─── Effective Limit ──────────────────────────────────────────

export interface EffectiveLimit {
  service: string;
  unit: string;
  quota: number;
  period: string;
  source: 'plan' | 'override';
}

export interface TenantLimitsResponse {
  tenantId: number;
  planName: string;
  planSlug: string;
  limits: EffectiveLimit[];
}

// ─── Provider Config Schema Entry ─────────────────────────────

export interface ProviderConfigField {
  key: string;
  label: string;
  type: 'string' | 'secret' | 'number' | 'boolean';
  required?: boolean;
}

// ─── Public Plan (for pricing page) ──────────────────────────
// Strict marketing-safe subset of BillingPlan. Contains NO internal
// columns (isPublic, isSystem, enabled, createdAt, updatedAt).

export interface PublicBillingPlan {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  billingCycle: string | null;
  features: Record<string, unknown> | null;
  order: number;
  quotas: Array<{
    service: string;
    unit: string;
    quota: number;
    period: string;
  }>;
}

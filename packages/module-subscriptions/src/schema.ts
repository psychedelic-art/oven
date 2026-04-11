import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  unique,
} from 'drizzle-orm/pg-core';

// ─── Service Catalog ──────────────────────────────────────────

export const serviceCategories = pgTable('sub_service_categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  description: text('description'),
  icon: varchar('icon', { length: 64 }),
  order: integer('order').notNull().default(0),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const services = pgTable('sub_services', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').notNull(),
  name: varchar('name', { length: 128 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  description: text('description'),
  unit: varchar('unit', { length: 64 }).notNull(),
  enabled: boolean('enabled').notNull().default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('sub_services_category_idx').on(table.categoryId),
  index('sub_services_slug_idx').on(table.slug),
]);

// ─── Providers ────────────────────────────────────────────────

export const providers = pgTable('sub_providers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  description: text('description'),
  website: varchar('website', { length: 500 }),
  logo: varchar('logo', { length: 500 }),
  enabled: boolean('enabled').notNull().default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const providerServices = pgTable('sub_provider_services', {
  id: serial('id').primaryKey(),
  providerId: integer('provider_id').notNull(),
  serviceId: integer('service_id').notNull(),
  costPerUnit: integer('cost_per_unit'),
  currency: varchar('currency', { length: 10 }).default('USD'),
  isDefault: boolean('is_default').notNull().default(false),
  enabled: boolean('enabled').notNull().default(true),
  configSchema: jsonb('config_schema'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('sub_ps_provider_idx').on(table.providerId),
  index('sub_ps_service_idx').on(table.serviceId),
  unique('sub_ps_unique').on(table.providerId, table.serviceId),
]);

// ─── Billing ──────────────────────────────────────────────────

export const billingPlans = pgTable('sub_billing_plans', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  description: text('description'),
  price: integer('price'),
  currency: varchar('currency', { length: 10 }).default('COP'),
  billingCycle: varchar('billing_cycle', { length: 32 }).default('monthly'),
  features: jsonb('features'),
  isPublic: boolean('is_public').notNull().default(true),
  isSystem: boolean('is_system').notNull().default(false),
  enabled: boolean('enabled').notNull().default(true),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const planQuotas = pgTable('sub_plan_quotas', {
  id: serial('id').primaryKey(),
  planId: integer('plan_id').notNull(),
  serviceId: integer('service_id').notNull(),
  quota: integer('quota').notNull(),
  period: varchar('period', { length: 32 }).notNull().default('monthly'),
  pricePerUnit: integer('price_per_unit'),
  currency: varchar('currency', { length: 10 }).default('COP'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('sub_pq_plan_idx').on(table.planId),
  index('sub_pq_service_idx').on(table.serviceId),
  unique('sub_pq_unique').on(table.planId, table.serviceId),
]);

// ─── Tenant Subscriptions ─────────────────────────────────────

export const tenantSubscriptions = pgTable('sub_tenant_subscriptions', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  planId: integer('plan_id').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  startsAt: timestamp('starts_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
  trialEndsAt: timestamp('trial_ends_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('sub_ts_tenant_idx').on(table.tenantId),
  index('sub_ts_plan_idx').on(table.planId),
  index('sub_ts_status_idx').on(table.status),
]);

export const subscriptionQuotaOverrides = pgTable('sub_quota_overrides', {
  id: serial('id').primaryKey(),
  subscriptionId: integer('subscription_id').notNull(),
  serviceId: integer('service_id').notNull(),
  quota: integer('quota').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('sub_qo_sub_idx').on(table.subscriptionId),
  unique('sub_qo_unique').on(table.subscriptionId, table.serviceId),
]);

// ─── Usage Tracking ──────────────────────────────────────────

export const usageRecords = pgTable('sub_usage_records', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  subscriptionId: integer('subscription_id'),
  serviceId: integer('service_id').notNull(),
  amount: integer('amount').notNull(),
  unit: varchar('unit', { length: 64 }).notNull(),
  billingCycle: varchar('billing_cycle', { length: 32 }),
  upstreamCostCents: integer('upstream_cost_cents'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('sur_tenant_id_idx').on(table.tenantId),
  index('sur_service_id_idx').on(table.serviceId),
  index('sur_billing_cycle_idx').on(table.billingCycle),
  index('sur_created_at_idx').on(table.createdAt),
]);

// ─── Schema export ────────────────────────────────────────────

export const subscriptionsSchema = {
  serviceCategories,
  services,
  providers,
  providerServices,
  billingPlans,
  planQuotas,
  tenantSubscriptions,
  subscriptionQuotaOverrides,
  usageRecords,
};

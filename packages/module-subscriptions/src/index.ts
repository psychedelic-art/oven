import type { ModuleDefinition, EventSchemaMap } from '@oven/module-registry';
import { subscriptionsSchema } from './schema';
import { seedSubscriptions } from './seed';
import * as serviceCategoriesHandler from './api/service-categories.handler';
import * as serviceCategoriesByIdHandler from './api/service-categories-by-id.handler';
import * as servicesHandler from './api/services.handler';
import * as servicesByIdHandler from './api/services-by-id.handler';
import * as providersHandler from './api/providers.handler';
import * as providersByIdHandler from './api/providers-by-id.handler';
import * as providerServicesHandler from './api/provider-services.handler';
import * as providerServicesByIdHandler from './api/provider-services-by-id.handler';
import * as billingPlansHandler from './api/billing-plans.handler';
import * as billingPlansByIdHandler from './api/billing-plans-by-id.handler';
import * as billingPlansPublicHandler from './api/billing-plans-public.handler';
import * as planQuotasHandler from './api/plan-quotas.handler';
import * as planQuotasByIdHandler from './api/plan-quotas-by-id.handler';
import * as tenantSubscriptionsHandler from './api/tenant-subscriptions.handler';
import * as tenantSubscriptionsByIdHandler from './api/tenant-subscriptions-by-id.handler';
import * as tenantSubscriptionsByTenantHandler from './api/tenant-subscriptions-by-tenant.handler';
import * as tenantLimitsHandler from './api/tenant-limits.handler';
import * as tenantServiceLimitHandler from './api/tenant-service-limit.handler';
import * as quotaOverridesHandler from './api/quota-overrides.handler';
import * as quotaOverridesByIdHandler from './api/quota-overrides-by-id.handler';

const eventSchemas: EventSchemaMap = {
  'subscriptions.category.created': {
    id: { type: 'number', description: 'Category DB ID', required: true },
    name: { type: 'string', description: 'Category name' },
    slug: { type: 'string', description: 'Category slug' },
  },
  'subscriptions.category.updated': {
    id: { type: 'number', description: 'Category DB ID', required: true },
    name: { type: 'string', description: 'Category name' },
    slug: { type: 'string', description: 'Category slug' },
  },
  'subscriptions.category.deleted': {
    id: { type: 'number', description: 'Category DB ID', required: true },
    slug: { type: 'string', description: 'Category slug' },
  },
  'subscriptions.service.created': {
    id: { type: 'number', description: 'Service DB ID', required: true },
    name: { type: 'string', description: 'Service name' },
    slug: { type: 'string', description: 'Service slug' },
    categoryId: { type: 'number', description: 'Parent category ID' },
    unit: { type: 'string', description: 'Measurement unit' },
  },
  'subscriptions.service.updated': {
    id: { type: 'number', description: 'Service DB ID', required: true },
    name: { type: 'string', description: 'Service name' },
    slug: { type: 'string', description: 'Service slug' },
  },
  'subscriptions.service.deleted': {
    id: { type: 'number', description: 'Service DB ID', required: true },
    slug: { type: 'string', description: 'Service slug' },
  },
  'subscriptions.provider.created': {
    id: { type: 'number', description: 'Provider DB ID', required: true },
    name: { type: 'string', description: 'Provider name' },
    slug: { type: 'string', description: 'Provider slug' },
  },
  'subscriptions.provider.updated': {
    id: { type: 'number', description: 'Provider DB ID', required: true },
    name: { type: 'string', description: 'Provider name' },
    slug: { type: 'string', description: 'Provider slug' },
  },
  'subscriptions.provider.deleted': {
    id: { type: 'number', description: 'Provider DB ID', required: true },
    slug: { type: 'string', description: 'Provider slug' },
  },
  'subscriptions.plan.created': {
    id: { type: 'number', description: 'Plan DB ID', required: true },
    name: { type: 'string', description: 'Plan name' },
    slug: { type: 'string', description: 'Plan slug' },
    price: { type: 'number', description: 'Monthly price in cents' },
  },
  'subscriptions.plan.updated': {
    id: { type: 'number', description: 'Plan DB ID', required: true },
    name: { type: 'string', description: 'Plan name' },
    slug: { type: 'string', description: 'Plan slug' },
    price: { type: 'number', description: 'Monthly price in cents' },
  },
  'subscriptions.plan.deleted': {
    id: { type: 'number', description: 'Plan DB ID', required: true },
    slug: { type: 'string', description: 'Plan slug' },
  },
  'subscriptions.subscription.created': {
    id: { type: 'number', description: 'Subscription DB ID', required: true },
    tenantId: { type: 'number', description: 'Tenant DB ID', required: true },
    planId: { type: 'number', description: 'Plan DB ID', required: true },
    status: { type: 'string', description: 'Subscription status' },
  },
  'subscriptions.subscription.updated': {
    id: { type: 'number', description: 'Subscription DB ID', required: true },
    tenantId: { type: 'number', description: 'Tenant DB ID', required: true },
    planId: { type: 'number', description: 'Plan DB ID', required: true },
    status: { type: 'string', description: 'New status' },
  },
  'subscriptions.subscription.cancelled': {
    id: { type: 'number', description: 'Subscription DB ID', required: true },
    tenantId: { type: 'number', description: 'Tenant DB ID', required: true },
    planId: { type: 'number', description: 'Plan DB ID', required: true },
  },
  'subscriptions.quota.exceeded': {
    tenantId: { type: 'number', description: 'Tenant DB ID', required: true },
    serviceSlug: { type: 'string', description: 'Service slug', required: true },
    currentUsage: { type: 'number', description: 'Current period usage', required: true },
    quota: { type: 'number', description: 'Effective quota limit', required: true },
  },
};

export const subscriptionsModule: ModuleDefinition = {
  name: 'subscriptions',
  dependencies: ['config', 'tenants'],
  description: 'Dynamic billing, service catalog, and usage limit module. Models the platform as a service reseller with providers, services, plans, and tenant subscriptions.',
  capabilities: [
    'manage service catalog',
    'manage providers',
    'create billing plans',
    'manage tenant subscriptions',
    'check usage limits',
    'resolve provider for service',
  ],
  schema: subscriptionsSchema,
  seed: seedSubscriptions,
  resources: [
    { name: 'service-categories', options: { label: 'Categories' } },
    { name: 'services', options: { label: 'Services' } },
    { name: 'providers', options: { label: 'Providers' } },
    { name: 'provider-services', options: { label: 'Provider Services' } },
    { name: 'billing-plans', options: { label: 'Billing Plans' } },
    { name: 'tenant-subscriptions', options: { label: 'Subscriptions' } },
  ],
  menuItems: [
    { label: 'Categories', to: '/service-categories' },
    { label: 'Services', to: '/services' },
    { label: 'Providers', to: '/providers' },
    { label: 'Plans', to: '/billing-plans' },
    { label: 'Subscriptions', to: '/tenant-subscriptions' },
  ],
  apiHandlers: {
    // Service Catalog
    'service-categories': { GET: serviceCategoriesHandler.GET, POST: serviceCategoriesHandler.POST },
    'service-categories/[id]': {
      GET: serviceCategoriesByIdHandler.GET,
      PUT: serviceCategoriesByIdHandler.PUT,
      DELETE: serviceCategoriesByIdHandler.DELETE,
    },
    'services': { GET: servicesHandler.GET, POST: servicesHandler.POST },
    'services/[id]': {
      GET: servicesByIdHandler.GET,
      PUT: servicesByIdHandler.PUT,
      DELETE: servicesByIdHandler.DELETE,
    },
    'providers': { GET: providersHandler.GET, POST: providersHandler.POST },
    'providers/[id]': {
      GET: providersByIdHandler.GET,
      PUT: providersByIdHandler.PUT,
      DELETE: providersByIdHandler.DELETE,
    },
    'provider-services': { GET: providerServicesHandler.GET, POST: providerServicesHandler.POST },
    'provider-services/[id]': {
      GET: providerServicesByIdHandler.GET,
      PUT: providerServicesByIdHandler.PUT,
      DELETE: providerServicesByIdHandler.DELETE,
    },
    // Billing Plans
    'billing-plans': { GET: billingPlansHandler.GET, POST: billingPlansHandler.POST },
    'billing-plans/[id]': {
      GET: billingPlansByIdHandler.GET,
      PUT: billingPlansByIdHandler.PUT,
      DELETE: billingPlansByIdHandler.DELETE,
    },
    'billing-plans/public': { GET: billingPlansPublicHandler.GET },
    'billing-plans/[id]/quotas': { GET: planQuotasHandler.GET, POST: planQuotasHandler.POST },
    'billing-plans/[id]/quotas/[quotaId]': {
      PUT: planQuotasByIdHandler.PUT,
      DELETE: planQuotasByIdHandler.DELETE,
    },
    // Tenant Subscriptions
    'tenant-subscriptions': { GET: tenantSubscriptionsHandler.GET, POST: tenantSubscriptionsHandler.POST },
    'tenant-subscriptions/[id]': {
      GET: tenantSubscriptionsByIdHandler.GET,
      PUT: tenantSubscriptionsByIdHandler.PUT,
    },
    'tenant-subscriptions/by-tenant/[tenantId]': { GET: tenantSubscriptionsByTenantHandler.GET },
    'tenant-subscriptions/[tenantId]/limits': { GET: tenantLimitsHandler.GET },
    'tenant-subscriptions/[tenantId]/limits/[serviceSlug]': { GET: tenantServiceLimitHandler.GET },
    'tenant-subscriptions/[id]/overrides': { GET: quotaOverridesHandler.GET, POST: quotaOverridesHandler.POST },
    'tenant-subscriptions/[id]/overrides/[overrideId]': {
      PUT: quotaOverridesByIdHandler.PUT,
      DELETE: quotaOverridesByIdHandler.DELETE,
    },
  },
  configSchema: [
    {
      key: 'DEFAULT_PLAN_SLUG',
      type: 'string',
      description: 'Default billing plan assigned to new tenants',
      defaultValue: 'free',
      instanceScoped: false,
    },
    {
      key: 'TRIAL_DURATION_DAYS',
      type: 'number',
      description: 'Default trial period in days for new subscriptions',
      defaultValue: 14,
      instanceScoped: false,
    },
    {
      key: 'OVERAGE_ENABLED',
      type: 'boolean',
      description: 'Allow tenants to exceed plan quotas (billed per-unit)',
      defaultValue: false,
      instanceScoped: true,
    },
  ],
  events: {
    emits: [
      'subscriptions.category.created',
      'subscriptions.category.updated',
      'subscriptions.category.deleted',
      'subscriptions.service.created',
      'subscriptions.service.updated',
      'subscriptions.service.deleted',
      'subscriptions.provider.created',
      'subscriptions.provider.updated',
      'subscriptions.provider.deleted',
      'subscriptions.plan.created',
      'subscriptions.plan.updated',
      'subscriptions.plan.deleted',
      'subscriptions.subscription.created',
      'subscriptions.subscription.updated',
      'subscriptions.subscription.cancelled',
      'subscriptions.quota.exceeded',
    ],
    schemas: eventSchemas,
  },
  chat: {
    description: 'Dynamic billing and usage limit module. Manages service catalog (categories, services, providers), billing plans with per-service quotas, tenant subscriptions, and quota overrides.',
    capabilities: [
      'list services and providers',
      'check tenant usage limits',
      'get effective limit for a service',
      'resolve provider for a service',
      'list billing plans',
    ],
    actionSchemas: [
      {
        name: 'subscriptions.getTenantLimits',
        description: 'Get all effective usage limits for a tenant',
        parameters: {
          tenantId: { type: 'number', description: 'Tenant ID', required: true },
        },
        returns: { limits: { type: 'array' }, planName: { type: 'string' } },
        requiredPermissions: ['tenant-subscriptions.read'],
        endpoint: { method: 'GET', path: 'tenant-subscriptions/[tenantId]/limits' },
      },
      {
        name: 'subscriptions.getServiceLimit',
        description: 'Get effective limit for a specific service and tenant',
        parameters: {
          tenantId: { type: 'number', description: 'Tenant ID', required: true },
          serviceSlug: { type: 'string', description: 'Service slug', required: true },
        },
        returns: { quota: { type: 'number' }, source: { type: 'string' } },
        requiredPermissions: ['tenant-subscriptions.read'],
        endpoint: { method: 'GET', path: 'tenant-subscriptions/[tenantId]/limits/[serviceSlug]' },
      },
      {
        name: 'subscriptions.listPlans',
        description: 'List available billing plans',
        parameters: {
          isPublic: { type: 'boolean', description: 'Filter to public plans only' },
        },
        returns: { data: { type: 'array' }, total: { type: 'number' } },
        requiredPermissions: ['billing-plans.read'],
        endpoint: { method: 'GET', path: 'billing-plans' },
      },
    ],
  },
};

export { subscriptionsSchema } from './schema';
export { seedSubscriptions } from './seed';
export * from './types';

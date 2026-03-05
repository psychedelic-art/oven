import type { ModuleDefinition, EventSchemaMap } from '@oven/module-registry';
import { tenantsSchema } from './schema';
import { seedTenants } from './seed';
import * as tenantsHandler from './api/tenants.handler';
import * as tenantsByIdHandler from './api/tenants-by-id.handler';
import * as tenantsBySlugHandler from './api/tenants-by-slug.handler';
import * as tenantsPublicHandler from './api/tenants-public.handler';
import * as tenantMembersHandler from './api/tenant-members.handler';
import * as tenantMembersByIdHandler from './api/tenant-members-by-id.handler';
import * as businessHoursHandler from './api/tenants-business-hours.handler';

const eventSchemas: EventSchemaMap = {
  'tenants.tenant.created': {
    id: { type: 'number', description: 'Tenant DB ID', required: true },
    name: { type: 'string', description: 'Tenant display name' },
    slug: { type: 'string', description: 'URL-safe slug' },
  },
  'tenants.tenant.updated': {
    id: { type: 'number', description: 'Tenant DB ID', required: true },
    name: { type: 'string', description: 'Tenant display name' },
    slug: { type: 'string', description: 'URL-safe slug' },
  },
  'tenants.tenant.deleted': {
    id: { type: 'number', description: 'Tenant DB ID', required: true },
    slug: { type: 'string', description: 'URL-safe slug' },
  },
  'tenants.member.added': {
    tenantId: { type: 'number', description: 'Tenant DB ID', required: true },
    userId: { type: 'number', description: 'User DB ID', required: true },
    role: { type: 'string', description: 'Member role (owner/admin/member)' },
  },
  'tenants.member.removed': {
    tenantId: { type: 'number', description: 'Tenant DB ID', required: true },
    userId: { type: 'number', description: 'User DB ID', required: true },
  },
};

export const tenantsModule: ModuleDefinition = {
  name: 'tenants',
  dependencies: ['config'],
  description: 'Multi-tenant identity module with slim identity table and config-driven operational settings',
  capabilities: [
    'create tenants',
    'manage tenant members',
    'resolve tenant by slug',
    'check business hours',
  ],
  schema: tenantsSchema,
  seed: seedTenants,
  resources: [
    {
      name: 'tenants',
      options: { label: 'Tenants' },
    },
    {
      name: 'tenant-members',
      options: { label: 'Tenant Members' },
    },
  ],
  menuItems: [
    { label: 'Tenants', to: '/tenants' },
  ],
  apiHandlers: {
    'tenants': { GET: tenantsHandler.GET, POST: tenantsHandler.POST },
    'tenants/[id]': {
      GET: tenantsByIdHandler.GET,
      PUT: tenantsByIdHandler.PUT,
      DELETE: tenantsByIdHandler.DELETE,
    },
    'tenants/by-slug/[slug]': { GET: tenantsBySlugHandler.GET },
    'tenants/[slug]/public': { GET: tenantsPublicHandler.GET },
    'tenant-members': { GET: tenantMembersHandler.GET, POST: tenantMembersHandler.POST },
    'tenant-members/[id]': {
      GET: tenantMembersByIdHandler.GET,
      DELETE: tenantMembersByIdHandler.DELETE,
    },
    'tenants/[id]/business-hours': { GET: businessHoursHandler.GET },
  },
  configSchema: [
    // ─── Business Identity ────────────────────────────────────
    { key: 'NIT', type: 'string', description: 'Tax ID (NIT) for the business', defaultValue: null, instanceScoped: true },
    { key: 'BUSINESS_NAME', type: 'string', description: 'Legal business name', defaultValue: null, instanceScoped: true },
    { key: 'LOGO', type: 'string', description: 'Logo URL (via module-files)', defaultValue: null, instanceScoped: true },
    // ─── Localization ─────────────────────────────────────────
    { key: 'TIMEZONE', type: 'string', description: 'Business timezone (IANA format)', defaultValue: 'America/Bogota', instanceScoped: true },
    { key: 'LOCALE', type: 'string', description: 'Default language locale', defaultValue: 'es', instanceScoped: true },
    // ─── Schedule ─────────────────────────────────────────────
    { key: 'SCHEDULE', type: 'json', description: 'Per-day business hours: { monday: { open, close }, ... }', defaultValue: null, instanceScoped: true },
    // ─── Services & Payments ──────────────────────────────────
    { key: 'AUTHORIZED_SERVICES', type: 'json', description: 'List of services the tenant offers', defaultValue: [], instanceScoped: true },
    { key: 'PAYMENT_METHODS', type: 'json', description: 'Accepted payment methods', defaultValue: [], instanceScoped: true },
    // ─── Communication ────────────────────────────────────────
    { key: 'TONE', type: 'string', description: 'Communication tone: formal | friendly | casual', defaultValue: 'friendly', instanceScoped: true },
    { key: 'HUMAN_CONTACT_INFO', type: 'json', description: 'Human contact info: { phone, email, whatsapp }', defaultValue: null, instanceScoped: true },
    { key: 'EMERGENCY_INSTRUCTIONS', type: 'string', description: 'Emergency/escalation instructions for agents', defaultValue: null, instanceScoped: true },
    { key: 'SCHEDULING_URL', type: 'string', description: 'External scheduling/booking URL', defaultValue: null, instanceScoped: true },
    { key: 'WELCOME_MESSAGE_BUSINESS_HOURS', type: 'string', description: 'Welcome message shown during business hours', defaultValue: null, instanceScoped: true },
    { key: 'WELCOME_MESSAGE_OUT_OF_HOURS', type: 'string', description: 'Welcome message shown outside business hours', defaultValue: null, instanceScoped: true },
    // ─── Platform-Level Defaults ──────────────────────────────
    { key: 'MAX_MEMBERS_PER_TENANT', type: 'number', description: 'Maximum members per tenant', defaultValue: 50, instanceScoped: true },
  ],
  events: {
    emits: [
      'tenants.tenant.created',
      'tenants.tenant.updated',
      'tenants.tenant.deleted',
      'tenants.member.added',
      'tenants.member.removed',
    ],
    schemas: eventSchemas,
  },
  chat: {
    description: 'Multi-tenant identity module. Manages tenant organizations with slim identity tables. Operational config (schedule, tone, branding) is stored in module-config. Usage limits are managed by module-subscriptions.',
    capabilities: [
      'list tenants',
      'get tenant config',
      'check business hours',
      'manage members',
    ],
    actionSchemas: [
      {
        name: 'tenants.list',
        description: 'List all tenants',
        parameters: {
          enabled: { type: 'boolean', description: 'Filter by enabled status' },
        },
        returns: { data: { type: 'array' }, total: { type: 'number' } },
        requiredPermissions: ['tenants.read'],
        endpoint: { method: 'GET', path: 'tenants' },
      },
      {
        name: 'tenants.getPublic',
        description: 'Get public tenant configuration by slug (assembled from module-config)',
        parameters: {
          slug: { type: 'string', description: 'Tenant slug', required: true },
        },
        returns: { name: { type: 'string' }, schedule: { type: 'object' }, isBusinessHours: { type: 'boolean' } },
        requiredPermissions: [],
        endpoint: { method: 'GET', path: 'tenants/[slug]/public' },
      },
      {
        name: 'tenants.checkBusinessHours',
        description: 'Check if a tenant is currently within business hours',
        parameters: {
          id: { type: 'number', description: 'Tenant ID', required: true },
        },
        returns: { isBusinessHours: { type: 'boolean' }, timezone: { type: 'string' } },
        requiredPermissions: ['tenants.read'],
        endpoint: { method: 'GET', path: 'tenants/[id]/business-hours' },
      },
    ],
  },
};

export { tenantsSchema } from './schema';
export { seedTenants } from './seed';
export { computeBusinessHours } from './utils';
export * from './types';

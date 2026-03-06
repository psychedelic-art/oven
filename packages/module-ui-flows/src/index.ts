import type { ModuleDefinition, EventSchemaMap } from '@oven/module-registry';
import { uiFlowsSchema } from './schema';
import { seedUiFlows } from './seed';
import * as uiFlowsHandler from './api/ui-flows.handler';
import * as uiFlowsByIdHandler from './api/ui-flows-by-id.handler';
import * as uiFlowsPublishHandler from './api/ui-flows-publish.handler';
import * as uiFlowsVersionsHandler from './api/ui-flows-versions.handler';
import * as uiFlowsVersionsRestoreHandler from './api/ui-flows-versions-restore.handler';
import * as portalResolveHandler from './api/portal-resolve.handler';
import * as portalPageHandler from './api/portal-page.handler';
import * as portalThemeHandler from './api/portal-theme.handler';
import * as portalAnalyticsHandler from './api/portal-analytics.handler';
import * as uiFlowAnalyticsHandler from './api/ui-flow-analytics.handler';
import * as uiFlowPagesHandler from './api/ui-flow-pages.handler';

const eventSchemas: EventSchemaMap = {
  'ui-flows.flow.created': {
    id: { type: 'number', description: 'UI Flow DB ID', required: true },
    tenantId: { type: 'number', description: 'Owning tenant ID', required: true },
    name: { type: 'string', description: 'Flow display name' },
    slug: { type: 'string', description: 'URL-safe slug' },
  },
  'ui-flows.flow.updated': {
    id: { type: 'number', description: 'UI Flow DB ID', required: true },
    tenantId: { type: 'number', description: 'Owning tenant ID', required: true },
    name: { type: 'string', description: 'Flow display name' },
    version: { type: 'number', description: 'Current version number' },
  },
  'ui-flows.flow.published': {
    id: { type: 'number', description: 'UI Flow DB ID', required: true },
    tenantId: { type: 'number', description: 'Owning tenant ID', required: true },
    slug: { type: 'string', description: 'URL-safe slug' },
    version: { type: 'number', description: 'Published version number' },
    domain: { type: 'string', description: 'Portal domain (subdomain or custom)' },
  },
  'ui-flows.flow.archived': {
    id: { type: 'number', description: 'UI Flow DB ID', required: true },
    tenantId: { type: 'number', description: 'Owning tenant ID', required: true },
    slug: { type: 'string', description: 'URL-safe slug' },
  },
  'ui-flows.page.visited': {
    uiFlowId: { type: 'number', description: 'UI Flow DB ID', required: true },
    tenantId: { type: 'number', description: 'Owning tenant ID', required: true },
    pageSlug: { type: 'string', description: 'Visited page slug' },
    visitorId: { type: 'string', description: 'Anonymous visitor identifier' },
    metadata: { type: 'object', description: 'Visit metadata (user agent, referrer)' },
  },
  'ui-flows.form.submitted': {
    uiFlowId: { type: 'number', description: 'UI Flow DB ID', required: true },
    tenantId: { type: 'number', description: 'Owning tenant ID', required: true },
    pageSlug: { type: 'string', description: 'Page where form was submitted' },
    formId: { type: 'number', description: 'Form DB ID' },
    submissionId: { type: 'number', description: 'Form submission DB ID' },
  },
};

export const uiFlowsModule: ModuleDefinition = {
  name: 'ui-flows',
  dependencies: ['forms', 'tenants'],
  description: 'Dynamic tenant-facing page portals with routing, theming, and analytics',
  capabilities: [
    'create tenant portal',
    'publish portal to subdomain',
    'manage portal pages',
    'configure portal theme',
    'track portal analytics',
  ],
  schema: uiFlowsSchema,
  seed: seedUiFlows,
  resources: [
    {
      name: 'ui-flows',
      options: { label: 'UI Flows' },
    },
    {
      name: 'ui-flow-analytics',
      options: { label: 'Portal Analytics' },
    },
    {
      name: 'ui-flow-pages',
      options: { label: 'Flow Pages' },
    },
    {
      name: 'ui-flow-versions',
      options: { label: 'Flow Versions' },
    },
  ],
  menuItems: [
    { label: 'UI Flows', to: '/ui-flows' },
    { label: 'Portal Analytics', to: '/ui-flow-analytics' },
  ],
  apiHandlers: {
    'ui-flows': { GET: uiFlowsHandler.GET, POST: uiFlowsHandler.POST },
    'ui-flows/[id]': {
      GET: uiFlowsByIdHandler.GET,
      PUT: uiFlowsByIdHandler.PUT,
      DELETE: uiFlowsByIdHandler.DELETE,
    },
    'ui-flows/[id]/publish': { POST: uiFlowsPublishHandler.POST },
    'ui-flows/[id]/versions': { GET: uiFlowsVersionsHandler.GET },
    'ui-flows/[id]/versions/[versionId]/restore': { POST: uiFlowsVersionsRestoreHandler.POST },
    'portal/[tenantSlug]': { GET: portalResolveHandler.GET },
    'portal/[tenantSlug]/pages/[pageSlug]': { GET: portalPageHandler.GET },
    'portal/[tenantSlug]/theme': { GET: portalThemeHandler.GET },
    'portal/[tenantSlug]/analytics': { POST: portalAnalyticsHandler.POST },
    'ui-flow-analytics': { GET: uiFlowAnalyticsHandler.GET },
    'ui-flow-pages': { GET: uiFlowPagesHandler.GET },
  },
  configSchema: [
    {
      key: 'MAX_PAGES_PER_FLOW',
      type: 'number',
      description: 'Maximum pages per UI flow',
      defaultValue: 20,
      instanceScoped: true,
    },
    {
      key: 'ENABLE_CUSTOM_CSS',
      type: 'boolean',
      description: 'Allow tenants to inject custom CSS in portals',
      defaultValue: false,
      instanceScoped: true,
    },
    {
      key: 'ANALYTICS_RETENTION_DAYS',
      type: 'number',
      description: 'Days to retain analytics events before cleanup',
      defaultValue: 90,
      instanceScoped: true,
    },
    {
      key: 'DEFAULT_THEME',
      type: 'json',
      description: 'Default theme for new portals',
      defaultValue: '{"primaryColor":"#1976D2","fontFamily":"Inter"}',
      instanceScoped: false,
    },
    {
      key: 'ENABLE_CUSTOM_DOMAINS',
      type: 'boolean',
      description: 'Allow tenants to configure custom domains',
      defaultValue: true,
      instanceScoped: false,
    },
  ],
  events: {
    emits: [
      'ui-flows.flow.created',
      'ui-flows.flow.updated',
      'ui-flows.flow.published',
      'ui-flows.flow.archived',
      'ui-flows.page.visited',
      'ui-flows.form.submitted',
    ],
    schemas: eventSchemas,
  },
  chat: {
    description: 'Manages dynamic tenant-facing page portals with forms, FAQ, chat, and routing. Each tenant gets a branded portal on a subdomain.',
    capabilities: [
      'create UI flow',
      'publish portal',
      'list portal pages',
      'view portal analytics',
      'configure portal theme',
    ],
    actionSchemas: [
      {
        name: 'uiFlows.create',
        description: 'Create a new UI flow portal for a tenant',
        parameters: {
          tenantId: { type: 'number', description: 'Tenant ID', required: true },
          name: { type: 'string', description: 'Portal name', required: true },
          slug: { type: 'string', description: 'URL slug', required: true },
        },
        returns: { id: { type: 'number' }, slug: { type: 'string' } },
        requiredPermissions: ['ui-flows.create'],
        endpoint: { method: 'POST', path: 'ui-flows' },
      },
      {
        name: 'uiFlows.list',
        description: 'List UI flow portals with optional filters',
        parameters: {
          tenantId: { type: 'number', description: 'Filter by tenant' },
          status: { type: 'string', description: 'Filter by status (draft, published, archived)' },
        },
        returns: { data: { type: 'array' }, total: { type: 'number' } },
        requiredPermissions: ['ui-flows.read'],
        endpoint: { method: 'GET', path: 'ui-flows' },
      },
      {
        name: 'uiFlows.getPortal',
        description: 'Get the published portal definition for a tenant',
        parameters: {
          tenantSlug: { type: 'string', description: 'Tenant slug', required: true },
        },
        returns: { definition: { type: 'object' }, theme: { type: 'object' } },
        requiredPermissions: [],
        endpoint: { method: 'GET', path: 'portal/[tenantSlug]' },
      },
      {
        name: 'uiFlows.publish',
        description: 'Publish a UI flow, making it live on the tenant subdomain',
        parameters: {
          id: { type: 'number', description: 'UI Flow ID', required: true },
        },
        requiredPermissions: ['ui-flows.publish'],
        endpoint: { method: 'POST', path: 'ui-flows/[id]/publish' },
      },
      {
        name: 'uiFlows.analytics',
        description: 'Get portal analytics for a UI flow',
        parameters: {
          uiFlowId: { type: 'number', description: 'UI Flow ID' },
          dateFrom: { type: 'string', description: 'Start date (ISO 8601)' },
          dateTo: { type: 'string', description: 'End date (ISO 8601)' },
        },
        requiredPermissions: ['ui-flow-analytics.read'],
        endpoint: { method: 'GET', path: 'ui-flow-analytics' },
      },
    ],
  },
};

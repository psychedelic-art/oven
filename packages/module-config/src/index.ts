import type { ModuleDefinition, EventSchemaMap } from '@oven/module-registry';
import { configSchema } from './schema';
import { seedConfig } from './seed';
import * as moduleConfigsHandler from './api/module-configs.handler';
import * as moduleConfigsByIdHandler from './api/module-configs-by-id.handler';
import * as resolveHandler from './api/module-configs-resolve.handler';
import * as resolveBatchHandler from './api/module-configs-resolve-batch.handler';

const eventSchemas: EventSchemaMap = {
  'config.entry.created': {
    id: { type: 'number', description: 'Config entry DB ID', required: true },
    tenantId: { type: 'number', description: 'Tenant ID (null for platform-global)' },
    moduleName: { type: 'string', description: 'Module name', required: true },
    key: { type: 'string', description: 'Config key', required: true },
    scope: { type: 'string', description: 'Config scope (module/instance)' },
    scopeId: { type: 'string', description: 'Instance scope ID' },
  },
  'config.entry.updated': {
    id: { type: 'number', description: 'Config entry DB ID', required: true },
    tenantId: { type: 'number', description: 'Tenant ID (null for platform-global)' },
    moduleName: { type: 'string', description: 'Module name', required: true },
    key: { type: 'string', description: 'Config key', required: true },
    oldValue: { type: 'any', description: 'Previous value' },
    newValue: { type: 'any', description: 'New value' },
  },
  'config.entry.deleted': {
    id: { type: 'number', description: 'Config entry DB ID', required: true },
    tenantId: { type: 'number', description: 'Tenant ID (null for platform-global)' },
    moduleName: { type: 'string', description: 'Module name', required: true },
    key: { type: 'string', description: 'Config key', required: true },
  },
};

export const configModule: ModuleDefinition = {
  name: 'config',
  dependencies: [],
  description: 'Platform-wide configuration store with tenant-aware 5-tier cascade resolution',
  capabilities: [
    'store module config entries',
    'resolve config with cascade',
    'batch resolve multiple keys',
    'tenant-scoped config isolation',
  ],
  schema: configSchema,
  seed: seedConfig,
  resources: [
    {
      name: 'module-configs',
      options: { label: 'Module Configs' },
    },
  ],
  menuItems: [
    { label: 'Configs', to: '/module-configs' },
  ],
  apiHandlers: {
    'module-configs': { GET: moduleConfigsHandler.GET, POST: moduleConfigsHandler.POST },
    'module-configs/[id]': {
      GET: moduleConfigsByIdHandler.GET,
      PUT: moduleConfigsByIdHandler.PUT,
      DELETE: moduleConfigsByIdHandler.DELETE,
    },
    'module-configs/resolve': { GET: resolveHandler.GET },
    'module-configs/resolve-batch': { GET: resolveBatchHandler.GET },
  },
  configSchema: [],
  events: {
    emits: [
      'config.entry.created',
      'config.entry.updated',
      'config.entry.deleted',
    ],
    schemas: eventSchemas,
  },
  chat: {
    description: 'Platform-wide configuration store. Manages module settings with a 5-tier tenant-aware cascade: tenant instance > tenant module > platform instance > platform module > schema default.',
    capabilities: [
      'list config entries',
      'resolve config value',
      'batch resolve config values',
      'update config entry',
    ],
    actionSchemas: [
      {
        name: 'config.resolve',
        description: 'Resolve a config value using the 5-tier cascade',
        parameters: {
          moduleName: { type: 'string', description: 'Module name', required: true },
          key: { type: 'string', description: 'Config key', required: true },
          tenantId: { type: 'number', description: 'Tenant ID for tenant-scoped resolution' },
          scopeId: { type: 'string', description: 'Instance ID for instance-scoped resolution' },
        },
        returns: { value: { type: 'any' }, source: { type: 'string' } },
        requiredPermissions: ['module-configs.read'],
        endpoint: { method: 'GET', path: 'module-configs/resolve' },
      },
      {
        name: 'config.resolveBatch',
        description: 'Resolve multiple config values in one call',
        parameters: {
          moduleName: { type: 'string', description: 'Module name', required: true },
          keys: { type: 'string', description: 'Comma-separated config keys', required: true },
          tenantId: { type: 'number', description: 'Tenant ID for tenant-scoped resolution' },
        },
        returns: { results: { type: 'object' } },
        requiredPermissions: ['module-configs.read'],
        endpoint: { method: 'GET', path: 'module-configs/resolve-batch' },
      },
      {
        name: 'config.list',
        description: 'List config entries with filtering',
        parameters: {
          moduleName: { type: 'string', description: 'Filter by module' },
          scope: { type: 'string', description: 'Filter by scope' },
          tenantId: { type: 'number', description: 'Filter by tenant' },
        },
        returns: { data: { type: 'array' }, total: { type: 'number' } },
        requiredPermissions: ['module-configs.read'],
        endpoint: { method: 'GET', path: 'module-configs' },
      },
    ],
  },
};

export { configSchema } from './schema';
export { seedConfig } from './seed';
export * from './types';

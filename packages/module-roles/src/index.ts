import type { ModuleDefinition } from '@oven/module-registry/types';
import { rolesSchema } from './schema';

export const rolesModule: ModuleDefinition = {
  name: 'roles',
  dependencies: [],

  schema: rolesSchema,

  resources: [
    { name: 'roles' },
    { name: 'permissions' },
    { name: 'hierarchy-nodes' },
    { name: 'rls-policies' },
    { name: 'api-endpoint-permissions' },
  ],

  customRoutes: [
    { path: '/rls-policies/:id/editor', component: {} as any },
  ],

  menuItems: [
    { label: 'Roles', to: '/roles' },
    { label: 'Permissions', to: '/permissions' },
    { label: 'Hierarchy', to: '/hierarchy-nodes' },
    { label: 'RLS Policies', to: '/rls-policies' },
    { label: 'API Permissions', to: '/api-endpoint-permissions' },
  ],

  apiHandlers: {
    'roles': {},
    'roles/[id]': {},
    'permissions': {},
    'permissions/[id]': {},
    'role-permissions': {},
    'role-permissions/[id]': {},
    'hierarchy-nodes': {},
    'hierarchy-nodes/[id]': {},
    'rls-policies': {},
    'rls-policies/[id]': {},
    'rls-policies/[id]/apply': {},
    'rls-policies/[id]/preview': {},
    'rls-policies/[id]/versions': {},
    'rls-policies/[id]/versions/[versionId]': {},
    'rls-policies/[id]/versions/[versionId]/restore': {},
    'api-endpoints': {},
    'api-endpoint-permissions': {},
  },

  events: {
    emits: [
      'roles.role.created',
      'roles.role.updated',
      'roles.role.deleted',
      'roles.permission.created',
      'roles.permission.updated',
      'roles.rls.created',
      'roles.rls.updated',
      'roles.rls.applied',
      'roles.rls.disabled',
      'roles.hierarchy.created',
      'roles.hierarchy.updated',
      'roles.hierarchy.deleted',
    ],
    schemas: {
      'roles.role.created': {
        id: { type: 'number', required: true },
        name: { type: 'string', required: true },
        slug: { type: 'string', required: true },
      },
      'roles.role.updated': {
        id: { type: 'number', required: true },
        name: { type: 'string', required: true },
        slug: { type: 'string', required: true },
      },
      'roles.role.deleted': {
        id: { type: 'number', required: true },
        name: { type: 'string', required: true },
      },
      'roles.rls.applied': {
        id: { type: 'number', required: true },
        name: { type: 'string', required: true },
        targetTable: { type: 'string', required: true },
        compiledSql: { type: 'string', required: true },
      },
    },
  },

  seed: async (db: any) => {
    const { seed } = await import('./seed');
    await seed(db);
  },
};

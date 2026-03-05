import type { ModuleDefinition, EventSchemaMap } from '@oven/module-registry';
import { formsSchema } from './schema';
import { seedForms } from './seed';
import * as formsHandler from './api/forms.handler';
import * as formsByIdHandler from './api/forms-by-id.handler';
import * as formsRenderHandler from './api/forms-render.handler';
import * as formSubmissionsHandler from './api/form-submissions.handler';
import * as formSubmissionsByIdHandler from './api/form-submissions-by-id.handler';
import * as formComponentsHandler from './api/form-components.handler';
import * as formComponentsByIdHandler from './api/form-components-by-id.handler';
import * as formDataSourcesHandler from './api/form-data-sources.handler';
import * as formDataSourcesByIdHandler from './api/form-data-sources-by-id.handler';
import * as formVersionsHandler from './api/form-versions.handler';

const eventSchemas: EventSchemaMap = {
  'forms.form.created': {
    id: { type: 'number', description: 'Form DB ID', required: true },
    tenantId: { type: 'number', description: 'Tenant ID', required: true },
    name: { type: 'string', description: 'Form name', required: true },
    slug: { type: 'string', description: 'Form slug', required: true },
  },
  'forms.form.updated': {
    id: { type: 'number', description: 'Form DB ID', required: true },
    tenantId: { type: 'number', description: 'Tenant ID', required: true },
    name: { type: 'string', description: 'Form name', required: true },
  },
  'forms.form.published': {
    id: { type: 'number', description: 'Form DB ID', required: true },
    tenantId: { type: 'number', description: 'Tenant ID', required: true },
    version: { type: 'number', description: 'Published version number', required: true },
  },
  'forms.form.archived': {
    id: { type: 'number', description: 'Form DB ID', required: true },
    tenantId: { type: 'number', description: 'Tenant ID', required: true },
    name: { type: 'string', description: 'Form name', required: true },
  },
  'forms.submission.created': {
    id: { type: 'number', description: 'Submission DB ID', required: true },
    tenantId: { type: 'number', description: 'Tenant ID', required: true },
    formId: { type: 'number', description: 'Form ID', required: true },
    formVersion: { type: 'number', description: 'Form version at time of submission' },
    submittedBy: { type: 'number', description: 'User ID of submitter' },
  },
  'forms.component.registered': {
    id: { type: 'number', description: 'Component DB ID', required: true },
    name: { type: 'string', description: 'Component name', required: true },
    slug: { type: 'string', description: 'Component slug', required: true },
    category: { type: 'string', description: 'Component category', required: true },
  },
};

export const formsModule: ModuleDefinition = {
  name: 'forms',
  dependencies: ['roles'],
  description: 'Enterprise interface builder for dynamic form creation, versioning, component registry, data-source binding, and submission capture',
  capabilities: [
    'create and version forms with JSON definitions',
    'publish forms for end-user rendering',
    'register reusable components with data contracts',
    'bind external data sources to form fields',
    'capture and query form submissions',
  ],
  schema: formsSchema,
  seed: seedForms,
  resources: [
    {
      name: 'forms',
      options: { label: 'Forms' },
    },
    {
      name: 'form-submissions',
      options: { label: 'Form Submissions' },
    },
    {
      name: 'form-components',
      options: { label: 'Form Components' },
    },
    {
      name: 'form-data-sources',
      options: { label: 'Form Data Sources' },
    },
    {
      name: 'form-versions',
      options: { label: 'Form Versions' },
    },
  ],
  menuItems: [
    { label: 'Forms', to: '/forms' },
    { label: 'Components', to: '/form-components' },
    { label: 'Submissions', to: '/form-submissions' },
  ],
  apiHandlers: {
    'forms': { GET: formsHandler.GET, POST: formsHandler.POST },
    'forms/[id]': {
      GET: formsByIdHandler.GET,
      PUT: formsByIdHandler.PUT,
      DELETE: formsByIdHandler.DELETE,
    },
    'forms/[id]/render': { GET: formsRenderHandler.GET },
    'form-submissions': { GET: formSubmissionsHandler.GET, POST: formSubmissionsHandler.POST },
    'form-submissions/[id]': { GET: formSubmissionsByIdHandler.GET },
    'form-components': { GET: formComponentsHandler.GET, POST: formComponentsHandler.POST },
    'form-components/[id]': {
      GET: formComponentsByIdHandler.GET,
      PUT: formComponentsByIdHandler.PUT,
      DELETE: formComponentsByIdHandler.DELETE,
    },
    'form-data-sources': { GET: formDataSourcesHandler.GET, POST: formDataSourcesHandler.POST },
    'form-data-sources/[id]': {
      GET: formDataSourcesByIdHandler.GET,
      PUT: formDataSourcesByIdHandler.PUT,
      DELETE: formDataSourcesByIdHandler.DELETE,
    },
    'form-versions': { GET: formVersionsHandler.GET },
  },
  configSchema: [
    {
      key: 'MAX_COMPONENTS_PER_FORM',
      type: 'number',
      default: 200,
      description: 'Maximum number of components allowed in a single form definition',
    },
    {
      key: 'MAX_DATA_SOURCES_PER_FORM',
      type: 'number',
      default: 20,
      description: 'Maximum number of data sources that can be bound to a single form',
    },
    {
      key: 'SUBMISSION_RETENTION_DAYS',
      type: 'number',
      default: 0,
      description: 'Number of days to retain form submissions (0 = indefinite)',
    },
  ],
  events: {
    emits: [
      'forms.form.created',
      'forms.form.updated',
      'forms.form.published',
      'forms.form.archived',
      'forms.submission.created',
      'forms.component.registered',
    ],
    schemas: eventSchemas,
  },
  chat: {
    description: 'Enterprise interface builder module. Manages dynamic forms with versioned definitions, reusable component registries, data-source bindings, and submission capture.',
    capabilities: [
      'list and search forms',
      'create new forms',
      'list form submissions',
      'manage form components',
      'manage form data sources',
    ],
    actionSchemas: [
      {
        name: 'forms.list',
        description: 'List forms with optional filtering by tenant, status, or search term',
        parameters: {
          tenantId: { type: 'number', description: 'Filter by tenant ID' },
          status: { type: 'string', description: 'Filter by status (draft, published, archived)' },
          q: { type: 'string', description: 'Search forms by name' },
        },
        returns: { data: { type: 'array' }, total: { type: 'number' } },
        requiredPermissions: ['forms.read'],
        endpoint: { method: 'GET', path: 'forms' },
      },
      {
        name: 'forms.create',
        description: 'Create a new form with definition and configuration',
        parameters: {
          tenantId: { type: 'number', description: 'Tenant ID', required: true },
          name: { type: 'string', description: 'Form name', required: true },
          slug: { type: 'string', description: 'URL-safe slug', required: true },
          description: { type: 'string', description: 'Form description' },
          definition: { type: 'object', description: 'Form JSON definition' },
        },
        returns: { id: { type: 'number' }, name: { type: 'string' } },
        requiredPermissions: ['forms.create'],
        endpoint: { method: 'POST', path: 'forms' },
      },
      {
        name: 'forms.listSubmissions',
        description: 'List form submissions with optional filtering',
        parameters: {
          tenantId: { type: 'number', description: 'Filter by tenant ID' },
          formId: { type: 'number', description: 'Filter by form ID' },
        },
        returns: { data: { type: 'array' }, total: { type: 'number' } },
        requiredPermissions: ['form-submissions.read'],
        endpoint: { method: 'GET', path: 'form-submissions' },
      },
    ],
  },
};

export { formsSchema } from './schema';
export { seedForms } from './seed';
export * from './types';

import type { ModuleDefinition, EventSchemaMap } from '@oven/module-registry';
import { workflowsSchema } from './schema';
import { seedWorkflows } from './seed';
import * as workflowsHandler from './api/workflows.handler';
import * as workflowsByIdHandler from './api/workflows-by-id.handler';
import * as workflowsExecuteHandler from './api/workflows-execute.handler';
import * as executionsHandler from './api/executions.handler';
import * as executionsByIdHandler from './api/executions-by-id.handler';
import * as executionsCancelHandler from './api/executions-cancel.handler';
import * as moduleConfigsHandler from './api/module-configs.handler';
import * as moduleConfigsByIdHandler from './api/module-configs-by-id.handler';
import * as moduleConfigsResolveHandler from './api/module-configs-resolve.handler';
import * as nodeTypesHandler from './api/node-types.handler';
import * as workflowVersionsHandler from './api/workflow-versions.handler';
import * as workflowVersionsByIdHandler from './api/workflow-versions-by-id.handler';
import * as workflowVersionsRestoreHandler from './api/workflow-versions-restore.handler';
import * as workflowsCompileHandler from './api/workflows-compile.handler';

const eventSchemas: EventSchemaMap = {
  'workflows.workflow.created': {
    id: { type: 'number', description: 'Workflow DB ID', required: true },
    name: { type: 'string', description: 'Workflow name', required: true },
    slug: { type: 'string', description: 'Workflow slug', required: true },
  },
  'workflows.workflow.updated': {
    id: { type: 'number', description: 'Workflow DB ID', required: true },
    name: { type: 'string', description: 'Workflow name', required: true },
    version: { type: 'number', description: 'New version number', required: true },
  },
  'workflows.workflow.deleted': {
    id: { type: 'number', description: 'Workflow DB ID', required: true },
    name: { type: 'string', description: 'Workflow name', required: true },
  },
  'workflows.execution.started': {
    executionId: { type: 'number', description: 'Execution DB ID', required: true },
    workflowId: { type: 'number', description: 'Workflow DB ID', required: true },
    workflowName: { type: 'string', description: 'Workflow name' },
  },
  'workflows.execution.completed': {
    executionId: { type: 'number', description: 'Execution DB ID', required: true },
    context: { type: 'object', description: 'Final execution context' },
  },
  'workflows.execution.failed': {
    executionId: { type: 'number', description: 'Execution DB ID', required: true },
    error: { type: 'string', description: 'Error message', required: true },
  },
  'workflows.node.started': {
    executionId: { type: 'number', description: 'Execution DB ID', required: true },
    nodeId: { type: 'string', description: 'Node state name', required: true },
    nodeType: { type: 'string', description: 'Node category', required: true },
  },
  'workflows.node.completed': {
    executionId: { type: 'number', description: 'Execution DB ID', required: true },
    nodeId: { type: 'string', description: 'Node state name', required: true },
    output: { type: 'object', description: 'Node output data' },
    durationMs: { type: 'number', description: 'Execution time in ms' },
  },
  'workflows.node.failed': {
    executionId: { type: 'number', description: 'Execution DB ID', required: true },
    nodeId: { type: 'string', description: 'Node state name', required: true },
    error: { type: 'string', description: 'Error message', required: true },
  },
};

export const workflowsModule: ModuleDefinition = {
  name: 'workflows',
  dependencies: [],
  schema: workflowsSchema,
  seed: seedWorkflows,

  resources: [
    { name: 'workflows', options: { label: 'Workflows' } },
    { name: 'workflow-executions', options: { label: 'Executions' } },
    { name: 'module-configs', options: { label: 'Module Configs' } },
  ],

  menuItems: [
    { label: 'Workflows', to: '/workflows' },
    { label: 'Executions', to: '/workflow-executions' },
    { label: 'Configs', to: '/module-configs' },
  ],

  events: {
    emits: [
      'workflows.workflow.created',
      'workflows.workflow.updated',
      'workflows.workflow.deleted',
      'workflows.execution.started',
      'workflows.execution.completed',
      'workflows.execution.failed',
      'workflows.node.started',
      'workflows.node.completed',
      'workflows.node.failed',
    ],
    schemas: eventSchemas,
  },

  apiHandlers: {
    'workflows': {
      GET: workflowsHandler.GET,
      POST: workflowsHandler.POST,
    },
    'workflows/[id]': {
      GET: workflowsByIdHandler.GET,
      PUT: workflowsByIdHandler.PUT,
      DELETE: workflowsByIdHandler.DELETE,
    },
    'workflows/[id]/execute': {
      POST: workflowsExecuteHandler.POST,
    },
    'workflow-executions': {
      GET: executionsHandler.GET,
    },
    'workflow-executions/[id]': {
      GET: executionsByIdHandler.GET,
    },
    'workflow-executions/[id]/cancel': {
      POST: executionsCancelHandler.POST,
    },
    'module-configs': {
      GET: moduleConfigsHandler.GET,
      POST: moduleConfigsHandler.POST,
    },
    'module-configs/[id]': {
      GET: moduleConfigsByIdHandler.GET,
      PUT: moduleConfigsByIdHandler.PUT,
      DELETE: moduleConfigsByIdHandler.DELETE,
    },
    'module-configs/resolve': {
      GET: moduleConfigsResolveHandler.GET,
    },
    'node-types': {
      GET: nodeTypesHandler.GET,
    },
    'workflows/[id]/versions': {
      GET: workflowVersionsHandler.GET,
    },
    'workflows/[id]/versions/[versionId]': {
      GET: workflowVersionsByIdHandler.GET,
    },
    'workflows/[id]/versions/[versionId]/restore': {
      POST: workflowVersionsRestoreHandler.POST,
    },
    'workflows/[id]/compile': {
      POST: workflowsCompileHandler.POST,
    },
  },
};

export { workflowsSchema } from './schema';
export { seedWorkflows } from './seed';
export { workflowEngine } from './engine';
export { nodeRegistry } from './node-registry';
export * from './types';

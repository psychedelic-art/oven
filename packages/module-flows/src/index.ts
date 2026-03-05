import type { ModuleDefinition, EventSchemaMap } from '@oven/module-registry';
import { flowsSchema } from './schema';
import { seedFlows } from './seed';
import * as flowsHandler from './api/flows.handler';
import * as flowsByIdHandler from './api/flows-by-id.handler';
import * as flowsStagesHandler from './api/flows-stages.handler';
import * as flowItemsHandler from './api/flow-items.handler';
import * as flowItemsByIdHandler from './api/flow-items-by-id.handler';
import * as flowItemsTransitionHandler from './api/flow-items-transition.handler';
import * as flowItemsCommentsHandler from './api/flow-items-comments.handler';
import * as flowItemsReviewsHandler from './api/flow-items-reviews.handler';
import * as flowVersionsHandler from './api/flow-versions.handler';

const eventSchemas: EventSchemaMap = {
  'flows.flow.created': {
    id: { type: 'number', description: 'Flow DB ID', required: true },
    tenantId: { type: 'number', description: 'Tenant ID', required: true },
    name: { type: 'string', description: 'Flow name', required: true },
    slug: { type: 'string', description: 'Flow slug', required: true },
  },
  'flows.flow.updated': {
    id: { type: 'number', description: 'Flow DB ID', required: true },
    tenantId: { type: 'number', description: 'Tenant ID', required: true },
    name: { type: 'string', description: 'Flow name', required: true },
  },
  'flows.item.created': {
    id: { type: 'number', description: 'Flow item DB ID', required: true },
    flowId: { type: 'number', description: 'Parent flow ID', required: true },
    tenantId: { type: 'number', description: 'Tenant ID', required: true },
    contentType: { type: 'string', description: 'Content type of the item', required: true },
    contentId: { type: 'number', description: 'Content ID reference' },
  },
  'flows.item.stage-changed': {
    id: { type: 'number', description: 'Flow item DB ID', required: true },
    flowId: { type: 'number', description: 'Parent flow ID', required: true },
    fromStageId: { type: 'number', description: 'Previous stage ID' },
    toStageId: { type: 'number', description: 'New stage ID', required: true },
    action: { type: 'string', description: 'Transition action', required: true },
    performedBy: { type: 'number', description: 'User who performed the transition' },
  },
  'flows.item.completed': {
    id: { type: 'number', description: 'Flow item DB ID', required: true },
    flowId: { type: 'number', description: 'Parent flow ID', required: true },
    tenantId: { type: 'number', description: 'Tenant ID', required: true },
  },
  'flows.item.cancelled': {
    id: { type: 'number', description: 'Flow item DB ID', required: true },
    flowId: { type: 'number', description: 'Parent flow ID', required: true },
    tenantId: { type: 'number', description: 'Tenant ID', required: true },
  },
  'flows.comment.created': {
    id: { type: 'number', description: 'Comment DB ID', required: true },
    flowItemId: { type: 'number', description: 'Parent flow item ID', required: true },
    authorId: { type: 'number', description: 'Author user ID', required: true },
    type: { type: 'string', description: 'Comment type' },
  },
  'flows.review.submitted': {
    id: { type: 'number', description: 'Review DB ID', required: true },
    flowItemId: { type: 'number', description: 'Parent flow item ID', required: true },
    reviewerId: { type: 'number', description: 'Reviewer user ID', required: true },
    decision: { type: 'string', description: 'Review decision', required: true },
  },
};

export const flowsModule: ModuleDefinition = {
  name: 'flows',
  dependencies: ['roles'],
  description: 'Content pipeline system with configurable stages, transitions, reviews, and comments',
  capabilities: [
    'define flow templates with ordered stages',
    'move content items through pipeline stages',
    'track stage transitions with audit log',
    'support reviews and comments on flow items',
    'version flow definitions',
  ],
  schema: flowsSchema,
  seed: seedFlows,
  resources: [
    {
      name: 'flows',
      options: { label: 'Flows' },
    },
    {
      name: 'flow-items',
      options: { label: 'Flow Items' },
    },
    {
      name: 'flow-reviews',
      options: { label: 'Flow Reviews' },
    },
    {
      name: 'flow-versions',
      options: { label: 'Flow Versions' },
    },
  ],
  menuItems: [
    { label: 'Flows', to: '/flows' },
    { label: 'Flow Items', to: '/flow-items' },
  ],
  apiHandlers: {
    'flows': { GET: flowsHandler.GET, POST: flowsHandler.POST },
    'flows/[id]': {
      GET: flowsByIdHandler.GET,
      PUT: flowsByIdHandler.PUT,
      DELETE: flowsByIdHandler.DELETE,
    },
    'flows/[id]/stages': { GET: flowsStagesHandler.GET },
    'flow-items': { GET: flowItemsHandler.GET, POST: flowItemsHandler.POST },
    'flow-items/[id]': {
      GET: flowItemsByIdHandler.GET,
      PUT: flowItemsByIdHandler.PUT,
    },
    'flow-items/[id]/transition': { POST: flowItemsTransitionHandler.POST },
    'flow-items/[id]/comments': { GET: flowItemsCommentsHandler.GET, POST: flowItemsCommentsHandler.POST },
    'flow-items/[id]/reviews': { GET: flowItemsReviewsHandler.GET, POST: flowItemsReviewsHandler.POST },
    'flow-versions': { GET: flowVersionsHandler.GET },
  },
  configSchema: [
    { key: 'MAX_STAGES_PER_FLOW', type: 'number', defaultValue: 20, description: 'Maximum number of stages per flow' },
    { key: 'MAX_ITEMS_PER_FLOW', type: 'number', defaultValue: 500, description: 'Maximum number of active items per flow' },
    { key: 'AUTO_ARCHIVE_COMPLETED_DAYS', type: 'number', defaultValue: 30, description: 'Days after completion before auto-archiving items' },
  ],
  events: {
    emits: [
      'flows.flow.created',
      'flows.flow.updated',
      'flows.item.created',
      'flows.item.stage-changed',
      'flows.item.completed',
      'flows.item.cancelled',
      'flows.comment.created',
      'flows.review.submitted',
    ],
    schemas: eventSchemas,
  },
  chat: {
    description: 'Content pipeline system. Manages flow templates with ordered stages, moves content items through pipelines, tracks transitions, and supports reviews and comments.',
    capabilities: [
      'list flow templates',
      'create flow items in a pipeline',
      'transition items between stages',
      'view reviews and comments',
    ],
    actionSchemas: [
      {
        name: 'flows.list',
        description: 'List flow templates with optional filters',
        parameters: {
          tenantId: { type: 'number', description: 'Filter by tenant ID' },
          enabled: { type: 'boolean', description: 'Filter by enabled status' },
          q: { type: 'string', description: 'Search by name' },
        },
        returns: { data: { type: 'array' }, total: { type: 'number' } },
        requiredPermissions: ['flows.read'],
        endpoint: { method: 'GET', path: 'flows' },
      },
      {
        name: 'flows.createItem',
        description: 'Create a new content item in a flow pipeline',
        parameters: {
          tenantId: { type: 'number', description: 'Tenant ID', required: true },
          flowId: { type: 'number', description: 'Flow ID to add the item to', required: true },
          contentType: { type: 'string', description: 'Content type of the item', required: true },
          contentId: { type: 'number', description: 'ID of the content being tracked' },
          contentSnapshot: { type: 'object', description: 'Snapshot of the content at creation' },
          metadata: { type: 'object', description: 'Additional metadata' },
          assignedTo: { type: 'number', description: 'User ID to assign to' },
        },
        returns: { id: { type: 'number' }, status: { type: 'string' } },
        requiredPermissions: ['flow-items.create'],
        endpoint: { method: 'POST', path: 'flow-items' },
      },
      {
        name: 'flows.transition',
        description: 'Transition a flow item to a different stage',
        parameters: {
          id: { type: 'number', description: 'Flow item ID', required: true },
          toStageId: { type: 'number', description: 'Target stage ID', required: true },
          action: { type: 'string', description: 'Transition action name', required: true },
          reason: { type: 'string', description: 'Reason for the transition' },
        },
        returns: { id: { type: 'number' }, currentStageId: { type: 'number' }, status: { type: 'string' } },
        requiredPermissions: ['flow-items.transition'],
        endpoint: { method: 'POST', path: 'flow-items/[id]/transition' },
      },
    ],
  },
};

export { flowsSchema } from './schema';
export { seedFlows } from './seed';
export * from './types';

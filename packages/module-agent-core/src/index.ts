import type { ModuleDefinition, EventSchemaMap } from '@oven/module-registry';
import { agentCoreSchema } from './schema';
import { seedAgentCore } from './seed';
import * as agentsHandler from './api/agents.handler';
import * as agentsByIdHandler from './api/agents-by-id.handler';
import * as agentsInvokeHandler from './api/agents-invoke.handler';
import * as agentNodesHandler from './api/agent-nodes.handler';
import * as agentNodesByIdHandler from './api/agent-nodes-by-id.handler';
import * as agentSessionsHandler from './api/agent-sessions.handler';
import * as agentSessionsByIdHandler from './api/agent-sessions-by-id.handler';
import * as agentSessionsMessagesHandler from './api/agent-sessions-messages.handler';
import * as agentExecutionsHandler from './api/agent-executions.handler';
import * as agentExecutionsByIdHandler from './api/agent-executions-by-id.handler';
import * as agentVersionsHandler from './api/agent-versions.handler';
import * as agentToolsHandler from './api/agent-tools.handler';

// ─── Event Schemas ──────────────────────────────────────────

const eventSchemas: EventSchemaMap = {
  'agents.agent.created': { id: { type: 'number', required: true }, tenantId: { type: 'number' }, name: { type: 'string' }, slug: { type: 'string' } },
  'agents.agent.updated': { id: { type: 'number', required: true }, tenantId: { type: 'number' }, name: { type: 'string' }, slug: { type: 'string' }, version: { type: 'number' } },
  'agents.agent.deleted': { id: { type: 'number', required: true }, slug: { type: 'string' } },
  'agents.session.created': { id: { type: 'number', required: true }, agentId: { type: 'number', required: true }, userId: { type: 'number' } },
  'agents.session.archived': { id: { type: 'number', required: true }, agentId: { type: 'number', required: true }, userId: { type: 'number' } },
  'agents.message.sent': { id: { type: 'number', required: true }, sessionId: { type: 'number', required: true }, role: { type: 'string' } },
  'agents.execution.started': { id: { type: 'number', required: true }, agentId: { type: 'number', required: true }, sessionId: { type: 'number' } },
  'agents.execution.completed': { id: { type: 'number', required: true }, agentId: { type: 'number', required: true }, sessionId: { type: 'number' }, status: { type: 'string' }, tokenUsage: { type: 'object' }, latencyMs: { type: 'number' } },
  'agents.execution.failed': { id: { type: 'number', required: true }, agentId: { type: 'number', required: true }, sessionId: { type: 'number' }, error: { type: 'string' } },
  'agents.tool.invoked': { executionId: { type: 'number', required: true }, toolName: { type: 'string', required: true }, moduleSlug: { type: 'string' }, status: { type: 'string' } },
  'agents.node.created': { id: { type: 'number', required: true }, name: { type: 'string' }, category: { type: 'string' } },
  'agents.node.updated': { id: { type: 'number', required: true }, name: { type: 'string' }, category: { type: 'string' } },
  'agents.node.deleted': { id: { type: 'number', required: true } },
};

// ─── Module Definition ──────────────────────────────────────

export const agentCoreModule: ModuleDefinition = {
  name: 'agent-core',
  dependencies: ['ai'],
  description: 'Agent management layer. Defines, configures, and invokes AI agents with tool bindings, multimodal input, and exposed parameters.',
  capabilities: [
    'create agents',
    'invoke agents',
    'manage node definitions',
    'test agents in playground',
    'list available tools',
  ],
  schema: agentCoreSchema,
  seed: seedAgentCore,
  resources: [
    { name: 'agents', options: { label: 'Agents' } },
    { name: 'agent-nodes', options: { label: 'Node Definitions' } },
    { name: 'agent-sessions', options: { label: 'Agent Sessions' } },
    { name: 'agent-executions', options: { label: 'Agent Executions' } },
  ],
  menuItems: [
    { label: 'Agents', to: '/agents' },
    { label: 'Node Definitions', to: '/agent-nodes' },
    { label: 'Sessions', to: '/agent-sessions' },
    { label: 'Executions', to: '/agent-executions' },
  ],
  apiHandlers: {
    'agents': { GET: agentsHandler.GET, POST: agentsHandler.POST },
    'agents/[id]': { GET: agentsByIdHandler.GET, PUT: agentsByIdHandler.PUT, DELETE: agentsByIdHandler.DELETE },
    'agents/[id]/versions': { GET: agentVersionsHandler.GET },
    'agents/[id]/invoke': { POST: agentsInvokeHandler.POST },
    'agents/tools': { GET: agentToolsHandler.GET },
    'agent-nodes': { GET: agentNodesHandler.GET, POST: agentNodesHandler.POST },
    'agent-nodes/[id]': { GET: agentNodesByIdHandler.GET, PUT: agentNodesByIdHandler.PUT, DELETE: agentNodesByIdHandler.DELETE },
    'agent-sessions': { GET: agentSessionsHandler.GET, POST: agentSessionsHandler.POST },
    'agent-sessions/[id]': { GET: agentSessionsByIdHandler.GET, DELETE: agentSessionsByIdHandler.DELETE },
    'agent-sessions/[id]/messages': { GET: agentSessionsMessagesHandler.GET, POST: agentSessionsMessagesHandler.POST },
    'agent-executions': { GET: agentExecutionsHandler.GET },
    'agent-executions/[id]': { GET: agentExecutionsByIdHandler.GET },
  },
  configSchema: [
    { key: 'MAX_TOOL_BINDINGS_PER_AGENT', type: 'number', description: 'Maximum tool bindings per agent', defaultValue: 50, instanceScoped: true },
    { key: 'DEFAULT_MAX_TOKENS', type: 'number', description: 'Default max tokens for agent responses', defaultValue: 4096, instanceScoped: true },
    { key: 'EXECUTION_TIMEOUT_MS', type: 'number', description: 'Maximum execution duration in ms', defaultValue: 120000, instanceScoped: false },
    { key: 'TOOL_WRAPPER_REFRESH_INTERVAL', type: 'number', description: 'Seconds between Tool Wrapper registry refreshes', defaultValue: 60, instanceScoped: false },
  ],
  events: {
    emits: [
      'agents.agent.created', 'agents.agent.updated', 'agents.agent.deleted',
      'agents.session.created', 'agents.session.archived',
      'agents.message.sent',
      'agents.execution.started', 'agents.execution.completed', 'agents.execution.failed',
      'agents.tool.invoked',
      'agents.node.created', 'agents.node.updated', 'agents.node.deleted',
    ],
    schemas: eventSchemas,
  },
  chat: {
    description: 'Agent management layer. Defines, configures, and invokes AI agents with tool bindings, multimodal input, and exposed parameters.',
    capabilities: ['create agents', 'invoke agents', 'manage node definitions', 'test agents in playground', 'list available tools'],
    actionSchemas: [
      {
        name: 'agents.list',
        description: 'List all agent definitions',
        parameters: { tenantId: { type: 'number' }, enabled: { type: 'boolean' } },
        returns: { data: { type: 'array' }, total: { type: 'number' } },
        requiredPermissions: ['agents.read'],
        endpoint: { method: 'GET', path: 'agents' },
      },
      {
        name: 'agents.invoke',
        description: 'Invoke an agent by slug — send messages and get a response',
        parameters: {
          slug: { type: 'string', required: true },
          messages: { type: 'array', required: true },
          params: { type: 'object', description: 'Override exposed parameters' },
          stream: { type: 'boolean' },
        },
        requiredPermissions: ['agents.invoke'],
        endpoint: { method: 'POST', path: 'agents/[slug]/invoke' },
      },
      {
        name: 'agents.listTools',
        description: 'List all available tools discovered from the registry',
        parameters: {},
        requiredPermissions: ['agents.read'],
        endpoint: { method: 'GET', path: 'agents/tools' },
      },
    ],
  },
};

// ─── Re-exports ─────────────────────────────────────────────

export { agentCoreSchema } from './schema';
export { agents, agentVersions, agentNodeDefinitions, agentSessions, agentMessages, agentExecutions } from './schema';
export { seedAgentCore } from './seed';
export * from './types';
export { invokeAgent } from './engine/agent-invoker';
export { discoverTools, getToolsForAgent, executeTool, clearToolCache } from './engine/tool-wrapper';
export { getOrCreateSession, appendMessage, getSessionMessages, archiveSession } from './engine/session-manager';

import type { ModuleDefinition, EventSchemaMap } from '@oven/module-registry';
import { workflowAgentsSchema } from './schema';
import { seedWorkflowAgents } from './seed';
import * as agentWorkflowsHandler from './api/agent-workflows.handler';
import * as agentWorkflowsByIdHandler from './api/agent-workflows-by-id.handler';
import * as agentWorkflowsExecuteHandler from './api/agent-workflows-execute.handler';
import * as agentWorkflowExecutionsHandler from './api/agent-workflow-executions.handler';
import * as agentWorkflowExecutionsByIdHandler from './api/agent-workflow-executions-by-id.handler';
import * as agentWorkflowExecutionsResumeHandler from './api/agent-workflow-executions-resume.handler';
import * as agentWorkflowExecutionsCancelHandler from './api/agent-workflow-executions-cancel.handler';
import * as agentWorkflowVersionsHandler from './api/agent-workflow-versions.handler';
import * as agentMemoryHandler from './api/agent-memory.handler';
import * as mcpServerDefinitionsHandler from './api/mcp-server-definitions.handler';

// ─── Event Schemas ──────────────────────────────────────────

const eventSchemas: EventSchemaMap = {
  'workflow-agents.workflow.created': { id: { type: 'number', required: true }, name: { type: 'string' }, slug: { type: 'string' } },
  'workflow-agents.workflow.updated': { id: { type: 'number', required: true }, name: { type: 'string' }, version: { type: 'number' } },
  'workflow-agents.workflow.deleted': { id: { type: 'number', required: true }, name: { type: 'string' } },
  'workflow-agents.execution.started': { executionId: { type: 'number', required: true }, workflowId: { type: 'string' } },
  'workflow-agents.execution.completed': { executionId: { type: 'number', required: true }, context: { type: 'object' }, stepsExecuted: { type: 'number' } },
  'workflow-agents.execution.failed': { executionId: { type: 'number', required: true }, error: { type: 'string' } },
  'workflow-agents.execution.paused': { executionId: { type: 'number', required: true }, currentState: { type: 'string' } },
  'workflow-agents.node.started': { executionId: { type: 'number', required: true }, nodeId: { type: 'string' }, nodeType: { type: 'string' } },
  'workflow-agents.node.completed': { executionId: { type: 'number', required: true }, nodeId: { type: 'string' }, nodeType: { type: 'string' }, output: { type: 'object' }, durationMs: { type: 'number' } },
  'workflow-agents.node.failed': { executionId: { type: 'number', required: true }, nodeId: { type: 'string' }, error: { type: 'string' } },
  'workflow-agents.execution.resumed': { executionId: { type: 'number', required: true } },
  'workflow-agents.execution.cancelled': { executionId: { type: 'number', required: true } },
  'workflow-agents.checkpoint.saved': { executionId: { type: 'number', required: true }, currentState: { type: 'string' }, stepsExecuted: { type: 'number' } },
  'workflow-agents.human_review.pending': { executionId: { type: 'number', required: true }, nodeId: { type: 'string' }, proposal: { type: 'object' } },
  'workflow-agents.cost.updated': { executionId: { type: 'number', required: true }, totalTokens: { type: 'object' }, totalCostCents: { type: 'number' } },
};

// ─── Module Definition ──────────────────────────────────────

export const workflowAgentsModule: ModuleDefinition = {
  name: 'workflow-agents',
  dependencies: ['workflows', 'agent-core', 'ai'],
  description: 'Graph-based agent reasoning. Defines agent workflows as directed graphs with LLM, tool, condition, memory, and human-review nodes. Executes multi-step reasoning with loops, branching, and state accumulation.',
  capabilities: [
    'create agent workflows',
    'execute multi-step reasoning',
    'manage agent memory',
    'auto-generate MCP server definitions',
  ],
  schema: workflowAgentsSchema,
  seed: seedWorkflowAgents,
  resources: [
    { name: 'agent-workflows', options: { label: 'Agent Workflows' } },
    { name: 'agent-workflow-executions', options: { label: 'Workflow Executions' } },
    { name: 'agent-memory', options: { label: 'Agent Memory' } },
    { name: 'mcp-server-definitions', options: { label: 'MCP Servers' } },
  ],
  menuItems: [
    { label: 'Agent Workflows', to: '/agent-workflows' },
    { label: 'Workflow Executions', to: '/agent-workflow-executions' },
    { label: 'Agent Memory', to: '/agent-memory' },
    { label: 'MCP Servers', to: '/mcp-server-definitions' },
  ],
  apiHandlers: {
    'agent-workflows': { GET: agentWorkflowsHandler.GET, POST: agentWorkflowsHandler.POST },
    'agent-workflows/[id]': { GET: agentWorkflowsByIdHandler.GET, PUT: agentWorkflowsByIdHandler.PUT, DELETE: agentWorkflowsByIdHandler.DELETE },
    'agent-workflows/[id]/execute': { POST: agentWorkflowsExecuteHandler.POST },
    'agent-workflows/[id]/versions': { GET: agentWorkflowVersionsHandler.GET },
    'agent-workflow-executions': { GET: agentWorkflowExecutionsHandler.GET },
    'agent-workflow-executions/[id]': { GET: agentWorkflowExecutionsByIdHandler.GET },
    'agent-workflow-executions/[id]/resume': { POST: agentWorkflowExecutionsResumeHandler.POST },
    'agent-workflow-executions/[id]/cancel': { POST: agentWorkflowExecutionsCancelHandler.POST },
    'agent-memory': { GET: agentMemoryHandler.GET },
    'agent-memory/[id]': { DELETE: agentMemoryHandler.DELETE },
    'mcp-server-definitions': { GET: mcpServerDefinitionsHandler.GET },
  },
  configSchema: [
    { key: 'AGENT_WORKFLOW_MAX_STEPS', type: 'number', description: 'Default max execution steps', defaultValue: 50, instanceScoped: false },
    { key: 'AGENT_WORKFLOW_TIMEOUT_MS', type: 'number', description: 'Default execution timeout in ms', defaultValue: 120000, instanceScoped: false },
    { key: 'AGENT_MEMORY_ENABLED', type: 'boolean', description: 'Enable agent long-term memory', defaultValue: false, instanceScoped: true },
  ],
  events: eventSchemas,
};

// ─── Re-exports ─────────────────────────────────────────────

export { workflowAgentsSchema } from './schema';
export { runAgentWorkflow } from './engine/workflow-engine';
export type { WorkflowExecutionResult } from './engine/workflow-engine';
export { executeNode, resolveInputs, evaluateGuard } from './engine/node-executor';
export { compileWorkflowToToolSchema, compileAndStoreMCP } from './engine/mcp-compiler';
export type { MCPToolSchema } from './engine/mcp-compiler';
export { compileToLangGraph } from './engine/langgraph-compiler';
export type { LangGraphOutput } from './engine/langgraph-compiler';
export { saveCheckpoint, loadCheckpoint, resumeFromCheckpoint, transitionStatus } from './engine/checkpoint-manager';
export type { CheckpointData, ResumeData } from './engine/checkpoint-manager';
export { CostTracker } from './engine/cost-tracker';
export type { CostEntry, ExecutionCostSummary } from './engine/cost-tracker';
export type * from './types';

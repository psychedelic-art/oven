// ─── Agent Workflow ─────────────────────────────────────────

export type WorkflowAgentStatus = 'draft' | 'active' | 'archived';

export interface AgentWorkflow {
  id: number;
  tenantId: number | null;
  name: string;
  slug: string;
  description: string | null;
  agentId: number | null;
  definition: AgentWorkflowDefinition;
  agentConfig: AgentConfig | null;
  memoryConfig: MemoryConfig | null;
  status: WorkflowAgentStatus;
  version: number;
  category: string | null;
  tags: string[] | null;
  isTemplate: boolean;
  clonedFrom: number | null;
  templateSlug: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Agent Workflow Definition ──────────────────────────────
// Extends the existing WorkflowDefinition pattern from module-workflows.
// Uses the same state machine structure: states with invoke.src referencing node slugs.

export interface AgentWorkflowDefinition {
  id: string;
  initial: string;
  context?: Record<string, unknown>;
  states: Record<string, AgentStateDefinition>;
}

export interface AgentStateDefinition {
  type?: 'final';
  invoke?: {
    src: string; // Node slug from agent_node_definitions (e.g., 'llm', 'tool-executor', 'rag')
    input?: Record<string, unknown>; // Input mapping with $.path expressions
    onDone?: string | { target: string; guard?: GuardDefinition };
    onError?: string;
  };
  on?: Record<string, string | { target: string; guard?: GuardDefinition }>;
  always?: string | Array<{ target: string; guard?: GuardDefinition }>;
}

export interface GuardDefinition {
  type: 'condition';
  params: {
    key: string;
    operator: '==' | '!=' | '>' | '<' | 'exists' | 'contains' | 'empty';
    value?: unknown;
  };
}

// ─── Agent Config ───────────────────────────────────────────

export interface AgentConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  maxSteps?: number; // Safety limit for execution steps (default 50)
  timeoutMs?: number; // Max execution time (default 120000)
  toolBindings?: string[]; // Tools this agent can use
}

// ─── Memory Config ──────────────────────────────────────────

export interface MemoryConfig {
  enabled: boolean;
  vectorStoreId?: number;
  maxMemories?: number;
  embeddingModel?: string;
}

// ─── Execution ──────────────────────────────────────────────

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';

export interface AgentWorkflowExecution {
  id: number;
  workflowId: number;
  tenantId: number | null;
  status: ExecutionStatus;
  triggerSource: string | null;
  triggerPayload: Record<string, unknown> | null;
  context: Record<string, unknown>;
  currentState: string;
  checkpoint: Record<string, unknown> | null;
  stepsExecuted: number;
  startedAt: Date;
  completedAt: Date | null;
  error: string | null;
}

// ─── Node Execution ─────────────────────────────────────────

export interface AgentNodeExecution {
  id: number;
  executionId: number;
  nodeId: string;
  nodeType: string;
  status: ExecutionStatus;
  input: unknown;
  output: unknown;
  error: string | null;
  startedAt: Date;
  completedAt: Date | null;
  durationMs: number | null;
}

// ─── Agent Memory ───────────────────────────────────────────

export interface AgentMemory {
  id: number;
  tenantId: number | null;
  agentId: number | null;
  key: string;
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Node Execution Context ─────────────────────────────────

export interface NodeExecutionContext {
  input: Record<string, unknown>;
  context: Record<string, unknown>; // Accumulated workflow context
  config: AgentConfig;
  executionId: number;
  tenantId?: number;
}

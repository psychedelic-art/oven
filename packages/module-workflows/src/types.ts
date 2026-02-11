// ─── Workflow Definition Types ──────────────────────────────────

/** Schema property for workflow trigger payload */
export interface PayloadProperty {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  defaultValue?: unknown;
}

/** The serializable XState machine definition stored in the DB */
export interface WorkflowDefinition {
  /** XState state machine ID */
  id: string;
  /** Initial state name */
  initial: string;
  /** Context schema — initial data passed to the machine */
  context?: Record<string, unknown>;
  /** Payload schema — defines the trigger contract (what properties the workflow expects) */
  payloadSchema?: PayloadProperty[];
  /** State map — each key is a state name */
  states: Record<string, WorkflowStateDefinition>;
}

export interface WorkflowStateDefinition {
  /** Type of state: normal, final, parallel */
  type?: 'final' | 'parallel';
  /** Entry actions to execute when entering this state */
  entry?: WorkflowAction[];
  /** Transitions: event name → target state */
  on?: Record<string, WorkflowTransition | WorkflowTransition[]>;
  /** For parallel states — child state machines */
  states?: Record<string, WorkflowStateDefinition>;
  /** Auto-transition after entry actions complete */
  always?: WorkflowTransition | WorkflowTransition[];
  /** Invoke an async service (API call, etc.) */
  invoke?: WorkflowInvoke;
  /** Loop definition — for forEach and while loop states */
  loop?: LoopDefinition;
}

/** Loop configuration for forEach and while loop nodes */
export interface LoopDefinition {
  /** Loop type: iterate over an array or repeat while a condition holds */
  type: 'forEach' | 'while';
  /** ForEach: $.path expression to the array to iterate over */
  collection?: string;
  /** While: condition to evaluate each iteration */
  condition?: WorkflowGuard;
  /** States to execute inside the loop body */
  bodyStates: Record<string, WorkflowStateDefinition>;
  /** Initial state within the loop body */
  bodyInitial: string;
  /** Max iterations safety limit (default 100) */
  maxIterations?: number;
  /** Max duration in ms (default 50000 for Vercel safety) */
  timeoutMs?: number;
  /** Parallel batch size: 0 = sequential, >0 = Promise.all batches */
  parallelBatchSize?: number;
  /** ForEach: variable name for current item (default "item") */
  itemVariable?: string;
  /** ForEach: variable name for current index (default "index") */
  indexVariable?: string;
}

export interface WorkflowTransition {
  target: string;
  guard?: WorkflowGuard;
  actions?: WorkflowAction[];
}

export interface WorkflowGuard {
  type: string;
  params: Record<string, unknown>;
}

export interface WorkflowAction {
  type: string;
  params?: Record<string, unknown>;
}

export interface WorkflowInvoke {
  /** Service ID — references a node-registry entry */
  src: string;
  /** Input mapping: keys are param names, values are $.path expressions */
  input?: Record<string, unknown>;
  /** Transition on success */
  onDone?: WorkflowTransition | string;
  /** Transition on failure */
  onError?: WorkflowTransition | string;
}

// ─── Node Registry Types ────────────────────────────────────────

export type NodeCategory =
  | 'api-call'
  | 'event-emit'
  | 'condition'
  | 'transform'
  | 'delay'
  | 'utility'
  | 'variable'
  | 'data'
  | 'loop';

export interface NodeTypeDefinition {
  /** Unique node ID, e.g. "maps.tiles.create" or "core.condition" */
  id: string;
  /** Human-readable label */
  label: string;
  /** Which module this belongs to (or "core" for built-ins) */
  module: string;
  /** Category for grouping in palette */
  category: NodeCategory;
  /** Description of what this node does */
  description: string;
  /** Input parameters this node expects */
  inputs: NodeParamDefinition[];
  /** Output parameters this node produces */
  outputs: NodeParamDefinition[];
  /** The HTTP method for api-call nodes */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** The API route pattern for api-call nodes */
  route?: string;
}

export interface NodeParamDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  example?: unknown;
}

// ─── Context Flow Types (used by editor) ────────────────────────

/** A variable available in the workflow context at a specific node */
export interface ContextVariable {
  /** Variable name, e.g. "id", "username" */
  name: string;
  /** Variable type, e.g. "number", "string" */
  type: string;
  /** Human-readable source label, e.g. "Trigger Payload" or "Get Player" */
  source: string;
  /** Source node ID */
  sourceNodeId: string;
  /** Full $.path expression to reference this variable, e.g. "$.id" or "$.getPlayer_output.username" */
  path: string;
}

// ─── Execution Types ────────────────────────────────────────────

export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type NodeExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface WorkflowExecutionSummary {
  id: number;
  workflowId: number;
  workflowName?: string;
  status: WorkflowStatus;
  currentState: string;
  triggerEvent: string | null;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
}

export interface NodeExecutionDetail {
  id: number;
  executionId: number;
  nodeId: string;
  nodeType: string;
  status: NodeExecutionStatus;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
}

// ─── Version History Types ──────────────────────────────────────

export interface WorkflowVersionSummary {
  id: number;
  workflowId: number;
  version: number;
  definition: WorkflowDefinition;
  description: string | null;
  createdAt: string;
}

// ─── Config Types ───────────────────────────────────────────────

export type ConfigScope = 'module' | 'instance';

export interface ResolvedConfig {
  key: string;
  value: unknown;
  scope: ConfigScope;
  scopeId: string | null;
  source: 'instance' | 'module' | 'default';
}

// ─── Execution Strategy Types ───────────────────────────────────

export type ExecutionMode = 'network' | 'direct';

export interface ExecutionStrategy {
  executeApiCall(
    nodeConfig: { route: string; method: string; module: string },
    input: Record<string, unknown>
  ): Promise<Record<string, unknown>>;
}

import type { Node, Edge } from '@xyflow/react';

// ─── Agent Node Data ────────────────────────────────────────

export interface AgentNodeData {
  label: string;
  nodeSlug: string; // 'llm', 'tool-executor', 'rag', 'condition', etc.
  category: string;
  color: string;
  icon: string;
  config: Record<string, unknown>;
  inputMapping: Record<string, unknown>;
  onDoneTarget?: string;
  onErrorTarget?: string;
  _isEntry?: boolean; // True for the workflow entry point node
  [key: string]: unknown; // Allow execution overlay data
}

export type AgentFlowNode = Node<AgentNodeData>;
export type AgentFlowEdge = Edge;

// ─── Right Panel Modes ──────────────────────────────────────

export type RightPanelMode = 'inspector' | 'agentConfig' | 'memoryConfig' | 'versions' | 'execution';

// ─── Store Interface ────────────────────────────────────────

export interface AgentWorkflowEditorState {
  // Graph data
  nodes: AgentFlowNode[];
  edges: AgentFlowEdge[];
  selectedNodeId: string | null;

  // Workflow metadata
  workflowId: number | null;
  workflowName: string;
  workflowSlug: string;

  // Agent config
  agentConfig: {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    maxSteps: number;
    toolBindings: string[];
  };

  // Memory config
  memoryConfig: {
    enabled: boolean;
    maxMemories: number;
    embeddingModel: string;
  };

  // UI state
  rightPanel: RightPanelMode;
  isDirty: boolean;
  isSaving: boolean;
  error: string | null;

  // Actions
  setNodes: (nodes: AgentFlowNode[]) => void;
  setEdges: (edges: AgentFlowEdge[]) => void;
  selectNode: (nodeId: string | null) => void;
  updateNodeData: (nodeId: string, data: Partial<AgentNodeData>) => void;
  addNode: (node: AgentFlowNode) => void;
  removeNode: (nodeId: string) => void;
  setRightPanel: (mode: RightPanelMode) => void;
  setAgentConfig: (config: Partial<AgentWorkflowEditorState['agentConfig']>) => void;
  setMemoryConfig: (config: Partial<AgentWorkflowEditorState['memoryConfig']>) => void;
  markDirty: () => void;
  markClean: () => void;
  setError: (error: string | null) => void;
}

// ─── Node Type Registry ─────────────────────────────────────

export interface AgentNodeTypeDefinition {
  slug: string;
  label: string;
  category: string;
  color: string;
  icon: string;
  description: string;
  defaultConfig: Record<string, unknown>;
  configFields: Array<{
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'select' | 'boolean' | 'json';
    options?: Array<{ value: string; label: string }>;
    defaultValue?: unknown;
    helperText?: string;
  }>;
}

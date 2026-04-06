import { createStore } from 'zustand/vanilla';
import type { AgentWorkflowEditorState, AgentFlowNode, AgentFlowEdge, AgentNodeData, RightPanelMode } from './types';

export function createAgentWorkflowEditorStore() {
  return createStore<AgentWorkflowEditorState>((set, get) => ({
    // Graph data
    nodes: [],
    edges: [],
    selectedNodeId: null,

    // Workflow metadata
    workflowId: null,
    workflowName: '',
    workflowSlug: '',

    // Agent config
    agentConfig: {
      model: 'fast',
      temperature: 0.7,
      maxTokens: 4096,
      systemPrompt: '',
      maxSteps: 50,
      toolBindings: [],
    },

    // Memory config
    memoryConfig: {
      enabled: false,
      maxMemories: 100,
      embeddingModel: 'text-embedding-3-small',
    },

    // UI state
    rightPanel: 'inspector' as RightPanelMode,
    isDirty: false,
    isSaving: false,
    error: null,

    // Actions
    setNodes: (nodes) => set({ nodes, isDirty: true }),
    setEdges: (edges) => set({ edges, isDirty: true }),

    selectNode: (nodeId) => set({
      selectedNodeId: nodeId,
      rightPanel: nodeId ? 'inspector' : get().rightPanel,
    }),

    updateNodeData: (nodeId, data) => set(state => ({
      nodes: state.nodes.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n,
      ),
      isDirty: true,
    })),

    addNode: (node) => set(state => ({
      nodes: [...state.nodes, node],
      isDirty: true,
    })),

    removeNode: (nodeId) => set(state => ({
      nodes: state.nodes.filter(n => n.id !== nodeId),
      edges: state.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      isDirty: true,
    })),

    setRightPanel: (mode) => set({ rightPanel: mode }),

    setAgentConfig: (config) => set(state => ({
      agentConfig: { ...state.agentConfig, ...config },
      isDirty: true,
    })),

    setMemoryConfig: (config) => set(state => ({
      memoryConfig: { ...state.memoryConfig, ...config },
      isDirty: true,
    })),

    markDirty: () => set({ isDirty: true }),
    markClean: () => set({ isDirty: false, isSaving: false }),
    setError: (error) => set({ error }),
  }));
}

export type AgentWorkflowEditorStore = ReturnType<typeof createAgentWorkflowEditorStore>;

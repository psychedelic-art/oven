import { createStore } from 'zustand/vanilla';
import type { Node, Edge } from '@xyflow/react';
import type {
  NavigationConfig,
  PortalSettings,
} from '@oven/module-ui-flows/types';
import type { UiFlowEditorStore, HistorySnapshot } from './types';
import { definitionToNodes, nodesToDefinition } from '../utils/definition-converter';

// Re-export converters so existing consumers of `store/uiFlowStore` still work
export { definitionToNodes, nodesToDefinition };

const MAX_HISTORY = 50;

// ─── History helpers ────────────────────────────────────────────

function createSnapshot(state: { nodes: Node[]; edges: Edge[]; navigation: NavigationConfig; settings: PortalSettings }): HistorySnapshot {
  return {
    nodes: structuredClone(state.nodes),
    edges: structuredClone(state.edges),
    navigation: structuredClone(state.navigation),
    settings: structuredClone(state.settings),
  };
}

// ─── Store factory ──────────────────────────────────────────────

export interface CreateUiFlowEditorStoreOptions {
  flowId: number;
  flowSlug: string;
  flowName: string;
  initialDefinition?: UiFlowDefinition;
  initialTheme?: { primaryColor: string; [key: string]: unknown };
  adapter: PersistenceAdapter;
}

export function createUiFlowEditorStore(options: CreateUiFlowEditorStoreOptions) {
  const {
    flowId,
    flowSlug,
    flowName,
    initialDefinition,
    initialTheme,
    adapter,
  } = options;

  const initial = definitionToNodes(initialDefinition);
  const initialNav = initialDefinition?.navigation ?? { type: 'sidebar' as const, items: [] };
  const initialSettings = initialDefinition?.settings ?? {};

  const initialSnapshot: HistorySnapshot = {
    nodes: structuredClone(initial.nodes),
    edges: structuredClone(initial.edges),
    navigation: structuredClone(initialNav),
    settings: structuredClone(initialSettings),
  };

  return createStore<UiFlowEditorStore>((set, get) => ({
    // ── State ──
    flowId,
    flowSlug,
    flowName,
    adapter,
    nodes: initial.nodes,
    edges: initial.edges,
    selectedNode: null,
    rightPanel: null,
    publishDialogOpen: false,
    theme: initialTheme ?? { primaryColor: '#1976D2' },
    navigation: initialNav,
    settings: initialSettings,
    saving: false,
    loading: false,
    snackbar: { open: false, message: '', severity: 'success' as const },

    // History
    history: [initialSnapshot],
    historyIndex: 0,

    // ── Actions ──
    setNodes: (nodesOrUpdater) =>
      set((state) => ({
        nodes:
          typeof nodesOrUpdater === 'function'
            ? nodesOrUpdater(state.nodes)
            : nodesOrUpdater,
      })),

    setEdges: (edgesOrUpdater) =>
      set((state) => ({
        edges:
          typeof edgesOrUpdater === 'function'
            ? edgesOrUpdater(state.edges)
            : edgesOrUpdater,
      })),

    setSelectedNode: (node) => set({ selectedNode: node }),

    updateNodeData: (nodeId, data) =>
      set((state) => ({
        nodes: state.nodes.map((n) =>
          n.id === nodeId ? { ...n, data } : n,
        ),
        selectedNode:
          state.selectedNode?.id === nodeId
            ? { ...state.selectedNode, data }
            : state.selectedNode,
      })),

    setRightPanel: (panel) => set({ rightPanel: panel }),
    setPublishDialogOpen: (open) => set({ publishDialogOpen: open }),

    setTheme: (theme) => set({ theme }),
    setNavigation: (navigation) => set({ navigation }),
    setSettings: (settings) => set({ settings }),

    showSnackbar: (message, severity) =>
      set({ snackbar: { open: true, message, severity } }),
    hideSnackbar: () =>
      set((state) => ({ snackbar: { ...state.snackbar, open: false } })),

    setLoading: (loading) => set({ loading }),

    // ── Undo/Redo ──
    pushHistory: () => {
      const state = get();
      const snapshot = createSnapshot(state);
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(snapshot);
      // Cap at MAX_HISTORY
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      set({
        history: newHistory,
        historyIndex: newHistory.length - 1,
      });
    },

    undo: () => {
      const state = get();
      if (state.historyIndex <= 0) return;
      const newIndex = state.historyIndex - 1;
      const snapshot = state.history[newIndex];
      set({
        historyIndex: newIndex,
        nodes: structuredClone(snapshot.nodes),
        edges: structuredClone(snapshot.edges),
        navigation: structuredClone(snapshot.navigation),
        settings: structuredClone(snapshot.settings),
        selectedNode: null,
      });
    },

    redo: () => {
      const state = get();
      if (state.historyIndex >= state.history.length - 1) return;
      const newIndex = state.historyIndex + 1;
      const snapshot = state.history[newIndex];
      set({
        historyIndex: newIndex,
        nodes: structuredClone(snapshot.nodes),
        edges: structuredClone(snapshot.edges),
        navigation: structuredClone(snapshot.navigation),
        settings: structuredClone(snapshot.settings),
        selectedNode: null,
      });
    },

    canUndo: () => get().historyIndex > 0,
    canRedo: () => get().historyIndex < get().history.length - 1,

    // ── Persistence (adapter-delegated) ──
    save: async () => {
      const state = get();
      set({ saving: true });
      try {
        const definition = nodesToDefinition(
          state.nodes,
          state.edges,
          state.navigation,
          state.settings,
        );
        await adapter.save(definition, state.theme);
        set({
          saving: false,
          snackbar: {
            open: true,
            message: 'UI Flow saved!',
            severity: 'success',
          },
        });
      } catch (err) {
        set({
          saving: false,
          snackbar: {
            open: true,
            message: `Save failed: ${err instanceof Error ? err.message : String(err)}`,
            severity: 'error',
          },
        });
      }
    },

    publish: async () => {
      try {
        await adapter.publish();
        set({
          publishDialogOpen: false,
          snackbar: {
            open: true,
            message: 'Published successfully!',
            severity: 'success',
          },
        });
      } catch (err) {
        set({
          snackbar: {
            open: true,
            message: `Publish failed: ${err instanceof Error ? err.message : String(err)}`,
            severity: 'error',
          },
        });
      }
    },
  }));
}

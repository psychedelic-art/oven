import type { Node, Edge } from '@xyflow/react';
import type {
  UiFlowDefinition,
  ThemeConfig,
  NavigationConfig,
  PortalSettings,
} from '@oven/module-ui-flows/types';

// ─── Version ────────────────────────────────────────────────────

export interface FlowVersion {
  id: number;
  version: number;
  description: string;
  createdAt: string;
}

// ─── Persistence Adapter ────────────────────────────────────────

export interface PersistenceAdapter {
  /** Save the current flow definition and theme to the backend */
  save(definition: UiFlowDefinition, theme: ThemeConfig): Promise<void>;

  /** Load a flow by ID, returning its definition and theme */
  load(flowId: number): Promise<{
    definition: UiFlowDefinition;
    theme: ThemeConfig;
  }>;

  /** Publish the flow (create a version snapshot, make live) */
  publish(): Promise<void>;

  /** List published version snapshots */
  listVersions?(flowId: number): Promise<FlowVersion[]>;

  /** Restore a specific version */
  restoreVersion?(flowId: number, versionId: number): Promise<void>;
}

// ─── Snackbar ───────────────────────────────────────────────────

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
}

// ─── History Snapshot ────────────────────────────────────────────

export interface HistorySnapshot {
  nodes: Node[];
  edges: Edge[];
  navigation: NavigationConfig;
  settings: PortalSettings;
}

// ─── UI State ───────────────────────────────────────────────────

export type RightPanelType = 'inspector' | 'theme' | 'navigation' | 'versions' | 'preview' | null;

export interface UiFlowEditorState {
  // Flow identity
  flowId: number;
  flowSlug: string;
  flowName: string;

  // Adapter reference (for panels that need direct access)
  adapter: PersistenceAdapter;

  // ReactFlow data
  nodes: Node[];
  edges: Edge[];

  // UI panels
  selectedNode: Node | null;
  rightPanel: RightPanelType;
  publishDialogOpen: boolean;

  // Flow configuration
  theme: ThemeConfig;
  navigation: NavigationConfig;
  settings: PortalSettings;

  // Async status
  saving: boolean;
  loading: boolean;

  // Notifications
  snackbar: SnackbarState;

  // Undo/Redo history
  history: HistorySnapshot[];
  historyIndex: number;
}

// ─── Actions ────────────────────────────────────────────────────

export interface UiFlowEditorActions {
  // ReactFlow state (supports updater functions for applyNodeChanges/applyEdgeChanges)
  setNodes: (nodes: Node[] | ((prev: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void;

  // Node selection
  setSelectedNode: (node: Node | null) => void;
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void;

  // Panel visibility
  setRightPanel: (panel: RightPanelType) => void;
  setPublishDialogOpen: (open: boolean) => void;

  // Flow configuration
  setTheme: (theme: ThemeConfig) => void;
  setNavigation: (navigation: NavigationConfig) => void;
  setSettings: (settings: PortalSettings) => void;

  // Snackbar
  showSnackbar: (message: string, severity: 'success' | 'error') => void;
  hideSnackbar: () => void;

  // Persistence operations (delegate to adapter)
  save: () => Promise<void>;
  publish: () => Promise<void>;

  // Loading
  setLoading: (loading: boolean) => void;

  // Undo/Redo
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export type UiFlowEditorStore = UiFlowEditorState & UiFlowEditorActions;

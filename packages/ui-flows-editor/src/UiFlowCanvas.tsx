import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, Button, Typography, Snackbar, Alert, IconButton, Tooltip } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PublishIcon from '@mui/icons-material/Publish';
import PaletteIcon from '@mui/icons-material/Palette';
import MenuIcon from '@mui/icons-material/Menu';

import { HomeNode } from './nodes/HomeNode';
import { LandingPageNode } from './nodes/LandingPageNode';
import { FormPageNode } from './nodes/FormPageNode';
import { FaqPageNode } from './nodes/FaqPageNode';
import { ChatPageNode } from './nodes/ChatPageNode';
import { CustomPageNode } from './nodes/CustomPageNode';
import { PagePalette } from './panels/PagePalette';
import { PageInspector } from './panels/PageInspector';
import { ThemePanel } from './panels/ThemePanel';
import { NavigationPanel } from './panels/NavigationPanel';
import { PublishDialog } from './components/PublishDialog';
import type {
  UiFlowDefinition,
  UiFlowPageDefinition,
  ThemeConfig,
  NavigationConfig,
} from '@oven/module-ui-flows/types';

// Register custom node types
const nodeTypes = {
  home: HomeNode,
  landing: LandingPageNode,
  form: FormPageNode,
  faq: FaqPageNode,
  chat: ChatPageNode,
  custom: CustomPageNode,
};

interface UiFlowCanvasProps {
  flowId: number;
  flowSlug: string;
  flowName: string;
  initialDefinition?: UiFlowDefinition;
  initialTheme?: ThemeConfig;
  onSave?: (definition: UiFlowDefinition, themeConfig: ThemeConfig) => Promise<void>;
  onPublish?: () => Promise<void>;
}

let nodeIdCounter = 0;
function generateNodeId(prefix: string = 'page'): string {
  nodeIdCounter++;
  return `${prefix}_${nodeIdCounter}_${Date.now().toString(36)}`;
}

/** Convert definition pages to ReactFlow nodes */
function definitionToNodes(definition?: UiFlowDefinition): { nodes: Node[]; edges: Edge[] } {
  if (!definition?.pages?.length) {
    return {
      nodes: [
        {
          id: 'home',
          type: 'home',
          position: { x: 300, y: 50 },
          data: { title: 'Home', slug: 'home' },
        },
      ],
      edges: [],
    };
  }

  const nodes: Node[] = definition.pages.map((page, index) => ({
    id: page.id,
    type: page.type === 'landing' || page.type === 'form' || page.type === 'faq' ||
          page.type === 'chat' || page.type === 'custom' ? page.type : 'landing',
    position: page.position ?? { x: 300, y: 50 + index * 150 },
    data: {
      title: page.title,
      slug: page.slug,
      formRef: page.formRef,
      ...page.config,
    },
  }));

  // Create edges from navigation items
  const edges: Edge[] = [];
  if (definition.navigation?.items) {
    for (let i = 0; i < definition.navigation.items.length - 1; i++) {
      const from = definition.navigation.items[i];
      const to = definition.navigation.items[i + 1];
      edges.push({
        id: `nav-${from.pageId}-${to.pageId}`,
        source: from.pageId,
        target: to.pageId,
        sourceHandle: 'output',
        targetHandle: 'input',
      });
    }
  }

  return { nodes, edges };
}

/** Convert ReactFlow nodes back to definition */
function nodesToDefinition(
  nodes: Node[],
  edges: Edge[],
  navigation: NavigationConfig,
  settings: UiFlowDefinition['settings'],
): UiFlowDefinition {
  const pages: UiFlowPageDefinition[] = nodes.map((node) => ({
    id: node.id,
    slug: (node.data as any)?.slug || node.id,
    title: (node.data as any)?.title || '',
    type: (node.type as any) || 'landing',
    formRef: (node.data as any)?.formRef,
    config: extractConfig(node),
    position: node.position,
  }));

  return { pages, navigation, settings };
}

function extractConfig(node: Node): Record<string, unknown> {
  const data = node.data as any;
  const config: Record<string, unknown> = {};
  // Copy non-standard fields as config
  const standardKeys = ['title', 'slug', 'formRef', 'label'];
  for (const [key, value] of Object.entries(data ?? {})) {
    if (!standardKeys.includes(key) && value !== undefined && value !== '') {
      config[key] = value;
    }
  }
  return Object.keys(config).length > 0 ? config : {};
}

function UiFlowCanvasInner({
  flowId,
  flowSlug,
  flowName,
  initialDefinition,
  initialTheme,
  onSave,
  onPublish,
}: UiFlowCanvasProps) {
  // Initialize from definition
  const initial = useMemo(() => definitionToNodes(initialDefinition), [initialDefinition]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [rightPanel, setRightPanel] = useState<'inspector' | 'theme' | 'navigation' | null>(null);
  const [theme, setTheme] = useState<ThemeConfig>(
    initialTheme ?? { primaryColor: '#1976D2' }
  );
  const [navigation, setNavigation] = useState<NavigationConfig>(
    initialDefinition?.navigation ?? { type: 'sidebar', items: [] }
  );
  const [settings] = useState(initialDefinition?.settings ?? {});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Get pages list for navigation panel
  const currentPages = useMemo<UiFlowPageDefinition[]>(() =>
    nodes.map((n) => ({
      id: n.id,
      slug: (n.data as any)?.slug || n.id,
      title: (n.data as any)?.title || '',
      type: (n.type as any) || 'landing',
      position: n.position,
    })),
    [nodes]
  );

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
    setRightPanel('inspector');
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    if (rightPanel === 'inspector') setRightPanel(null);
  }, [rightPanel]);

  const onUpdateNode = useCallback(
    (nodeId: string, data: Record<string, any>) => {
      setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data } : n)));
      setSelectedNode((prev) => (prev && prev.id === nodeId ? { ...prev, data } : prev));
    },
    [setNodes]
  );

  // Handle drop from palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const pageType = event.dataTransfer.getData('application/ui-flow-page');
      if (!pageType) return;

      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      const position = {
        x: event.clientX - (bounds?.left ?? 0) - 90,
        y: event.clientY - (bounds?.top ?? 0) - 25,
      };

      const newNode: Node = {
        id: generateNodeId(pageType),
        type: pageType,
        position,
        data: {
          title: `New ${pageType.charAt(0).toUpperCase() + pageType.slice(1)} Page`,
          slug: pageType === 'home' ? 'home' : `${pageType}-${Date.now().toString(36).slice(-4)}`,
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  // Save
  const handleSave = useCallback(async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      const definition = nodesToDefinition(nodes, edges, navigation, settings);
      await onSave(definition, theme);
      setSnackbar({ open: true, message: 'UI Flow saved!', severity: 'success' });
    } catch (err) {
      setSnackbar({
        open: true,
        message: `Save failed: ${err instanceof Error ? err.message : String(err)}`,
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  }, [nodes, edges, navigation, settings, theme, onSave]);

  return (
    <Box sx={{ display: 'flex', height: '100%', width: '100%' }}>
      {/* Left: Page Palette */}
      <PagePalette />

      {/* Center: ReactFlow Canvas */}
      <Box ref={reactFlowWrapper} sx={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode="Delete"
          multiSelectionKeyCode="Shift"
        >
          <Background />
          <Controls />
          <MiniMap
            nodeColor={(n) => {
              switch (n.type) {
                case 'home': return '#4caf50';
                case 'landing': return '#2196f3';
                case 'form': return '#ff9800';
                case 'faq': return '#9c27b0';
                case 'chat': return '#e91e63';
                case 'custom': return '#607d8b';
                default: return '#90a4ae';
              }
            }}
          />

          {/* Top toolbar */}
          <Panel position="top-right">
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
              {onPublish && (
                <Button
                  variant="contained"
                  size="small"
                  color="success"
                  startIcon={<PublishIcon />}
                  onClick={() => setPublishDialogOpen(true)}
                >
                  Publish
                </Button>
              )}
              <Tooltip title="Theme">
                <IconButton
                  size="small"
                  onClick={() => setRightPanel(rightPanel === 'theme' ? null : 'theme')}
                  sx={{
                    bgcolor: rightPanel === 'theme' ? 'primary.main' : 'background.paper',
                    color: rightPanel === 'theme' ? 'white' : 'text.secondary',
                    '&:hover': { bgcolor: rightPanel === 'theme' ? 'primary.dark' : 'action.hover' },
                    boxShadow: 1,
                  }}
                >
                  <PaletteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Navigation">
                <IconButton
                  size="small"
                  onClick={() => setRightPanel(rightPanel === 'navigation' ? null : 'navigation')}
                  sx={{
                    bgcolor: rightPanel === 'navigation' ? 'primary.main' : 'background.paper',
                    color: rightPanel === 'navigation' ? 'white' : 'text.secondary',
                    '&:hover': { bgcolor: rightPanel === 'navigation' ? 'primary.dark' : 'action.hover' },
                    boxShadow: 1,
                  }}
                >
                  <MenuIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Panel>

          <Panel position="top-left">
            <Typography variant="caption" color="text.secondary" sx={{ bgcolor: 'white', px: 1, py: 0.5, borderRadius: 1 }}>
              {nodes.length} pages &middot; {edges.length} links
            </Typography>
          </Panel>
        </ReactFlow>
      </Box>

      {/* Right panels */}
      {rightPanel === 'inspector' && selectedNode && (
        <PageInspector
          selectedNode={selectedNode}
          onUpdateNode={onUpdateNode}
          onClose={() => { setSelectedNode(null); setRightPanel(null); }}
        />
      )}

      {rightPanel === 'theme' && (
        <ThemePanel
          theme={theme}
          onChange={setTheme}
          onClose={() => setRightPanel(null)}
        />
      )}

      {rightPanel === 'navigation' && (
        <NavigationPanel
          navigation={navigation}
          pages={currentPages}
          onChange={setNavigation}
          onClose={() => setRightPanel(null)}
        />
      )}

      {/* Publish Dialog */}
      {onPublish && (
        <PublishDialog
          open={publishDialogOpen}
          onClose={() => setPublishDialogOpen(false)}
          onPublish={onPublish}
          flowName={flowName}
        />
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/**
 * UiFlowCanvas — The main visual portal editor component.
 * Wraps ReactFlow with custom page nodes, palette, and inspector.
 */
export function UiFlowCanvas(props: UiFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <UiFlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

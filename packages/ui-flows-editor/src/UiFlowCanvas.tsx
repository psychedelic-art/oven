import React, { useCallback, useRef, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type Node,
  type NodeChange,
  type EdgeChange,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, Button, Typography, Snackbar, Alert, IconButton, Tooltip } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PublishIcon from '@mui/icons-material/Publish';
import PaletteIcon from '@mui/icons-material/Palette';
import MenuIcon from '@mui/icons-material/Menu';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import HistoryIcon from '@mui/icons-material/History';
import VisibilityIcon from '@mui/icons-material/Visibility';

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
import { PreviewPanel } from './panels/PreviewPanel';
import { VersionHistoryPanel } from './panels/VersionHistoryPanel';
import { PublishDialog } from './components/PublishDialog';
import { useUiFlowEditorStore, definitionToNodes } from './store';
import type { UiFlowPageDefinition } from '@oven/module-ui-flows/types';

// Register custom node types
const nodeTypes = {
  home: HomeNode,
  landing: LandingPageNode,
  form: FormPageNode,
  faq: FaqPageNode,
  chat: ChatPageNode,
  custom: CustomPageNode,
};

let nodeIdCounter = 0;
function generateNodeId(prefix: string = 'page'): string {
  nodeIdCounter++;
  return `${prefix}_${nodeIdCounter}_${Date.now().toString(36)}`;
}

function UiFlowCanvasInner() {
  // ── Store selectors ──
  const nodes = useUiFlowEditorStore((s) => s.nodes);
  const edges = useUiFlowEditorStore((s) => s.edges);
  const setNodes = useUiFlowEditorStore((s) => s.setNodes);
  const setEdges = useUiFlowEditorStore((s) => s.setEdges);
  const selectedNode = useUiFlowEditorStore((s) => s.selectedNode);
  const setSelectedNode = useUiFlowEditorStore((s) => s.setSelectedNode);
  const updateNodeData = useUiFlowEditorStore((s) => s.updateNodeData);
  const rightPanel = useUiFlowEditorStore((s) => s.rightPanel);
  const setRightPanel = useUiFlowEditorStore((s) => s.setRightPanel);
  const saving = useUiFlowEditorStore((s) => s.saving);
  const theme = useUiFlowEditorStore((s) => s.theme);
  const setTheme = useUiFlowEditorStore((s) => s.setTheme);
  const navigation = useUiFlowEditorStore((s) => s.navigation);
  const setNavigation = useUiFlowEditorStore((s) => s.setNavigation);
  const flowName = useUiFlowEditorStore((s) => s.flowName);
  const publishDialogOpen = useUiFlowEditorStore((s) => s.publishDialogOpen);
  const setPublishDialogOpen = useUiFlowEditorStore((s) => s.setPublishDialogOpen);
  const snackbar = useUiFlowEditorStore((s) => s.snackbar);
  const hideSnackbar = useUiFlowEditorStore((s) => s.hideSnackbar);
  const save = useUiFlowEditorStore((s) => s.save);
  const publish = useUiFlowEditorStore((s) => s.publish);
  const flowId = useUiFlowEditorStore((s) => s.flowId);
  const flowSlug = useUiFlowEditorStore((s) => s.flowSlug);
  const adapter = useUiFlowEditorStore((s) => s.adapter);
  const settings = useUiFlowEditorStore((s) => s.settings);
  const setSettings = useUiFlowEditorStore((s) => s.setSettings);
  const undo = useUiFlowEditorStore((s) => s.undo);
  const redo = useUiFlowEditorStore((s) => s.redo);
  const canUndo = useUiFlowEditorStore((s) => s.canUndo);
  const canRedo = useUiFlowEditorStore((s) => s.canRedo);
  const pushHistory = useUiFlowEditorStore((s) => s.pushHistory);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const historyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced history push — avoids flooding stack during drags
  const debouncedPushHistory = useCallback(() => {
    if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
    historyTimeoutRef.current = setTimeout(() => {
      pushHistory();
    }, 500);
  }, [pushHistory]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) ||
        ((e.ctrlKey || e.metaKey) && e.key === 'y')
      ) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // ReactFlow change handlers — apply changes via zustand
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      debouncedPushHistory();
    },
    [setNodes, debouncedPushHistory],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
      debouncedPushHistory();
    },
    [setEdges, debouncedPushHistory],
  );

  // Get pages list for navigation panel
  const currentPages = useMemo<UiFlowPageDefinition[]>(
    () =>
      nodes.map((n) => ({
        id: n.id,
        slug: (n.data as Record<string, unknown>)?.slug as string || n.id,
        title: (n.data as Record<string, unknown>)?.title as string || '',
        type: (n.type as UiFlowPageDefinition['type']) || 'landing',
        position: n.position,
      })),
    [nodes],
  );

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
      setRightPanel('inspector');
    },
    [setSelectedNode, setRightPanel],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    if (rightPanel === 'inspector') setRightPanel(null);
  }, [rightPanel, setSelectedNode, setRightPanel]);

  const onUpdateNode = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      updateNodeData(nodeId, data);
    },
    [updateNodeData],
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
    [setNodes],
  );

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
                onClick={save}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                variant="contained"
                size="small"
                color="success"
                startIcon={<PublishIcon />}
                onClick={() => setPublishDialogOpen(true)}
              >
                Publish
              </Button>
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
              <Tooltip title="Preview">
                <IconButton
                  size="small"
                  onClick={() => setRightPanel(rightPanel === 'preview' ? null : 'preview')}
                  sx={{
                    bgcolor: rightPanel === 'preview' ? 'primary.main' : 'background.paper',
                    color: rightPanel === 'preview' ? 'white' : 'text.secondary',
                    '&:hover': { bgcolor: rightPanel === 'preview' ? 'primary.dark' : 'action.hover' },
                    boxShadow: 1,
                  }}
                >
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Version History">
                <IconButton
                  size="small"
                  onClick={() => setRightPanel(rightPanel === 'versions' ? null : 'versions')}
                  sx={{
                    bgcolor: rightPanel === 'versions' ? 'primary.main' : 'background.paper',
                    color: rightPanel === 'versions' ? 'white' : 'text.secondary',
                    '&:hover': { bgcolor: rightPanel === 'versions' ? 'primary.dark' : 'action.hover' },
                    boxShadow: 1,
                  }}
                >
                  <HistoryIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Box sx={{ width: '1px', height: 24, bgcolor: 'divider', mx: 0.5 }} />
              <Tooltip title="Undo (Ctrl+Z)">
                <span>
                  <IconButton
                    size="small"
                    onClick={undo}
                    disabled={!canUndo()}
                    sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
                  >
                    <UndoIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Redo (Ctrl+Shift+Z)">
                <span>
                  <IconButton
                    size="small"
                    onClick={redo}
                    disabled={!canRedo()}
                    sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
                  >
                    <RedoIcon fontSize="small" />
                  </IconButton>
                </span>
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

      {rightPanel === 'preview' && (
        <PreviewPanel
          flowSlug={flowSlug}
          pageSlug={selectedNode ? ((selectedNode.data as Record<string, unknown>)?.slug as string) ?? null : null}
          onClose={() => setRightPanel(null)}
        />
      )}

      {rightPanel === 'versions' && (
        <VersionHistoryPanel
          flowId={flowId}
          adapter={adapter}
          onRestore={() => {
            adapter.load(flowId).then(({ definition, theme: loadedTheme }) => {
              const result = definitionToNodes(definition);
              setNodes(result.nodes);
              setEdges(result.edges);
              setNavigation(definition.navigation ?? { type: 'sidebar' as const, items: [] });
              setSettings(definition.settings ?? {});
              setTheme(loadedTheme);
              pushHistory();
            });
          }}
          onClose={() => setRightPanel(null)}
        />
      )}

      {/* Publish Dialog */}
      <PublishDialog
        open={publishDialogOpen}
        onClose={() => setPublishDialogOpen(false)}
        onPublish={publish}
        flowName={flowName}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={hideSnackbar}
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
 * Must be used within a <UiFlowEditorProvider>.
 * Wraps ReactFlow with custom page nodes, palette, and inspector.
 */
export function UiFlowCanvas() {
  return (
    <ReactFlowProvider>
      <UiFlowCanvasInner />
    </ReactFlowProvider>
  );
}

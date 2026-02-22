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
import PreviewIcon from '@mui/icons-material/Preview';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import HistoryIcon from '@mui/icons-material/History';

import { TableNode } from './nodes/TableNode';
import { ConditionNode } from './nodes/ConditionNode';
import { LogicGateNode } from './nodes/LogicGateNode';
import { ContextNode } from './nodes/ContextNode';
import { ActionNode } from './nodes/ActionNode';
import { SubqueryNode } from './nodes/SubqueryNode';
import { NodePalette } from './panels/NodePalette';
import { NodeInspector } from './panels/NodeInspector';
import { SqlPreview } from './panels/SqlPreview';
import { VersionHistory } from './panels/VersionHistory';
import { definitionToSqlPreview } from './utils/definition-to-sql';

const nodeTypes = {
  table: TableNode,
  condition: ConditionNode,
  logicGate: LogicGateNode,
  context: ContextNode,
  action: ActionNode,
  subquery: SubqueryNode,
};

export interface RlsPolicyDefinition {
  nodes: Array<{ id: string; type: string; position: { x: number; y: number }; data: Record<string, unknown> }>;
  edges: Array<{ id: string; source: string; target: string; sourceHandle?: string; targetHandle?: string }>;
}

export interface RlsPolicyCanvasProps {
  policyId: number;
  policySlug: string;
  targetTable: string;
  initialDefinition?: RlsPolicyDefinition;
  currentVersion: number;
  onSave?: (definition: RlsPolicyDefinition) => Promise<void>;
  onApply?: () => Promise<void>;
  onPreview?: (definition: RlsPolicyDefinition) => Promise<string | null>;
  availableTables?: string[];
}

let nodeIdCounter = 0;
function generateNodeId(prefix: string = 'node'): string {
  nodeIdCounter++;
  return `${prefix}_${nodeIdCounter}_${Date.now().toString(36)}`;
}

function RlsPolicyCanvasInner({
  policyId,
  policySlug,
  targetTable,
  initialDefinition,
  currentVersion,
  onSave,
  onApply,
  onPreview,
  availableTables = [],
}: RlsPolicyCanvasProps) {
  // Initialize from definition or default
  const initial = useMemo(() => {
    if (initialDefinition && initialDefinition.nodes.length > 0) {
      return {
        nodes: initialDefinition.nodes as Node[],
        edges: initialDefinition.edges as Edge[],
      };
    }
    // Default: context → condition → action
    return {
      nodes: [
        {
          id: 'ctx_user',
          type: 'context',
          position: { x: 100, y: 50 },
          data: { label: 'Current User', variable: 'current_user_id' },
        },
        {
          id: 'cond_owner',
          type: 'condition',
          position: { x: 100, y: 200 },
          data: { label: 'Owner Check', column: 'player_id', operator: '=', valueRef: 'ctx_user' },
        },
        {
          id: 'action_allow',
          type: 'action',
          position: { x: 140, y: 380 },
          data: { label: 'Allow', action: 'ALLOW' },
        },
      ] as Node[],
      edges: [
        { id: 'e1', source: 'ctx_user', target: 'cond_owner', sourceHandle: 'output' },
        { id: 'e2', source: 'cond_owner', target: 'action_allow', sourceHandle: 'output' },
      ] as Edge[],
    };
  }, [initialDefinition]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [previewSql, setPreviewSql] = useState<string>('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Live SQL preview
  const liveSqlPreview = useMemo(() => {
    const simpleNodes = nodes.map((n) => ({ id: n.id, type: n.type!, data: n.data as Record<string, any> }));
    const simpleEdges = edges.map((e) => ({ id: e.id, source: e.source, target: e.target }));
    return definitionToSqlPreview(simpleNodes, simpleEdges);
  }, [nodes, edges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onUpdateNode = useCallback(
    (nodeId: string, data: Record<string, any>) => {
      setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data } : n)));
      setSelectedNode((prev) => (prev && prev.id === nodeId ? { ...prev, data } : prev));
    },
    [setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData('application/rls-node');
      if (!raw) return;

      const { type, data } = JSON.parse(raw);
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      const position = {
        x: event.clientX - (bounds?.left ?? 0) - 80,
        y: event.clientY - (bounds?.top ?? 0) - 20,
      };

      const newNode: Node = {
        id: generateNodeId(type),
        type,
        position,
        data,
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  // Build definition from current state
  const getDefinition = useCallback((): RlsPolicyDefinition => ({
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type!,
      position: n.position,
      data: n.data as Record<string, unknown>,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? undefined,
      targetHandle: e.targetHandle ?? undefined,
    })),
  }), [nodes, edges]);

  const handleSave = useCallback(async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(getDefinition());
      setSnackbar({ open: true, message: 'Policy saved!', severity: 'success' });
    } catch (err) {
      setSnackbar({
        open: true,
        message: `Save failed: ${err instanceof Error ? err.message : String(err)}`,
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  }, [getDefinition, onSave]);

  const handlePreview = useCallback(async () => {
    if (!onPreview) return;
    try {
      const sql = await onPreview(getDefinition());
      if (sql) setPreviewSql(sql);
    } catch (err) {
      setSnackbar({
        open: true,
        message: `Preview failed: ${err instanceof Error ? err.message : String(err)}`,
        severity: 'error',
      });
    }
  }, [getDefinition, onPreview]);

  const handleApply = useCallback(async () => {
    if (!onApply) return;
    try {
      await onApply();
      setSnackbar({ open: true, message: 'Policy applied to database!', severity: 'success' });
    } catch (err) {
      setSnackbar({
        open: true,
        message: `Apply failed: ${err instanceof Error ? err.message : String(err)}`,
        severity: 'error',
      });
    }
  }, [onApply]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Left: Node Palette */}
        <NodePalette />

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
                  case 'table': return '#26a69a';
                  case 'condition': return '#ff9800';
                  case 'logicGate': return '#5c6bc0';
                  case 'context': return '#4caf50';
                  case 'action': return '#ef5350';
                  case 'subquery': return '#00838f';
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
                {onPreview && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<PreviewIcon />}
                    onClick={handlePreview}
                  >
                    Preview SQL
                  </Button>
                )}
                {onApply && (
                  <Button
                    variant="contained"
                    size="small"
                    color="success"
                    startIcon={<PlayArrowIcon />}
                    onClick={handleApply}
                  >
                    Apply
                  </Button>
                )}
                <Tooltip title="Version History">
                  <IconButton
                    size="small"
                    onClick={() => setHistoryOpen((o) => !o)}
                    sx={{
                      bgcolor: historyOpen ? 'primary.main' : 'background.paper',
                      color: historyOpen ? 'white' : 'text.secondary',
                      '&:hover': { bgcolor: historyOpen ? 'primary.dark' : 'action.hover' },
                      boxShadow: 1,
                    }}
                  >
                    <HistoryIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Panel>

            <Panel position="top-left">
              <Typography variant="caption" color="text.secondary" sx={{ bgcolor: 'white', px: 1, py: 0.5, borderRadius: 1 }}>
                {nodes.length} nodes &middot; {edges.length} edges &middot; Table: {targetTable}
              </Typography>
            </Panel>
          </ReactFlow>
        </Box>

        {/* Right: Inspector or Version History */}
        {selectedNode && !historyOpen && (
          <NodeInspector
            selectedNode={selectedNode}
            onUpdateNode={onUpdateNode}
            onClose={() => setSelectedNode(null)}
            availableTables={availableTables}
          />
        )}
        {historyOpen && (
          <VersionHistory
            policyId={policyId}
            currentVersion={currentVersion}
            onRestore={(definition) => {
              const def = definition as RlsPolicyDefinition;
              if (def && def.nodes) {
                setNodes(def.nodes as Node[]);
                setEdges((def.edges ?? []) as Edge[]);
                setSelectedNode(null);
                setSnackbar({ open: true, message: 'Restored from version history!', severity: 'success' });
              }
            }}
            onClose={() => setHistoryOpen(false)}
          />
        )}
      </Box>

      {/* Bottom: SQL Preview */}
      <SqlPreview
        policyId={policyId}
        sql={previewSql || liveSqlPreview}
      />

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

export function RlsPolicyCanvas(props: RlsPolicyCanvasProps) {
  return (
    <ReactFlowProvider>
      <RlsPolicyCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

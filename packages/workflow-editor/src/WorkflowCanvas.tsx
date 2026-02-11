import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
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
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import HistoryIcon from '@mui/icons-material/History';
import CodeIcon from '@mui/icons-material/Code';

import { TriggerNode } from './nodes/TriggerNode';
import { ApiCallNode } from './nodes/ApiCallNode';
import { ConditionNode } from './nodes/ConditionNode';
import { TransformNode } from './nodes/TransformNode';
import { EventEmitNode } from './nodes/EventEmitNode';
import { DelayNode } from './nodes/DelayNode';
import { EndNode } from './nodes/EndNode';
import { SetVariableNode } from './nodes/SetVariableNode';
import { SqlQueryNode } from './nodes/SqlQueryNode';
import { ForEachNode } from './nodes/ForEachNode';
import { WhileLoopNode } from './nodes/WhileLoopNode';
import { NodePalette } from './panels/NodePalette';
import { NodeInspector } from './panels/NodeInspector';
import { ExecuteDialog } from './components/ExecuteDialog';
import { VersionHistory } from './panels/VersionHistory';
import { CompileDialog } from './components/CompileDialog';
import { reactFlowToXState } from './utils/reactflow-to-xstate';
import { xStateToReactFlow } from './utils/xstate-to-reactflow';
import { computeContextFlow } from './utils/context-flow';
import type { NodeTypeDefinition, WorkflowDefinition, PayloadProperty } from '@oven/module-workflows/types';

// Register custom node types
const nodeTypes = {
  trigger: TriggerNode,
  apiCall: ApiCallNode,
  condition: ConditionNode,
  transform: TransformNode,
  eventEmit: EventEmitNode,
  delay: DelayNode,
  end: EndNode,
  setVariable: SetVariableNode,
  sqlQuery: SqlQueryNode,
  forEach: ForEachNode,
  whileLoop: WhileLoopNode,
};

interface WorkflowCanvasProps {
  /** Workflow ID (from DB) */
  workflowId: number;
  /** Workflow slug for XState machine ID */
  workflowSlug: string;
  /** Initial definition loaded from DB */
  initialDefinition?: WorkflowDefinition;
  /** All available node types from the node registry */
  availableNodeTypes: NodeTypeDefinition[];
  /** Callback when workflow is saved */
  onSave?: (definition: WorkflowDefinition) => Promise<void>;
  /** Callback when workflow is executed */
  onExecute?: (payload: Record<string, unknown>) => Promise<void>;
}

let nodeIdCounter = 0;
function generateNodeId(prefix: string = 'node'): string {
  nodeIdCounter++;
  return `${prefix}_${nodeIdCounter}_${Date.now().toString(36)}`;
}

function WorkflowCanvasInner({
  workflowId,
  workflowSlug,
  initialDefinition,
  availableNodeTypes,
  onSave,
  onExecute,
}: WorkflowCanvasProps) {
  // Build node type map for lookups
  const nodeTypeMap = useMemo(() => {
    const map = new Map<string, NodeTypeDefinition>();
    for (const nt of availableNodeTypes) {
      map.set(nt.id, nt);
    }
    return map;
  }, [availableNodeTypes]);

  // Initialize nodes/edges from definition
  const initial = useMemo(() => {
    if (initialDefinition && Object.keys(initialDefinition.states).length > 0) {
      return xStateToReactFlow(initialDefinition);
    }
    // Default: trigger → end
    return {
      nodes: [
        {
          id: 'trigger',
          type: 'trigger',
          position: { x: 300, y: 50 },
          data: { label: 'Start' },
        },
        {
          id: 'end',
          type: 'end',
          position: { x: 300, y: 300 },
          data: { label: 'End' },
        },
      ] as Node[],
      edges: [
        {
          id: 'trigger-end',
          source: 'trigger',
          target: 'end',
          sourceHandle: 'output',
        },
      ] as Edge[],
    };
  }, [initialDefinition]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [compileDialogOpen, setCompileDialogOpen] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(1);
  const [lastPayload, setLastPayload] = useState<Record<string, unknown> | undefined>();
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Fetch last execution payload when execute dialog opens
  useEffect(() => {
    if (!executeDialogOpen || !workflowId) return;
    (async () => {
      try {
        const params = new URLSearchParams({
          sort: '["id","DESC"]',
          range: '[0,0]',
          filter: JSON.stringify({ workflowId }),
        });
        const res = await fetch(`/api/workflow-executions?${params}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0 && data[0].triggerPayload) {
            setLastPayload(data[0].triggerPayload as Record<string, unknown>);
          }
        }
      } catch {
        // Non-critical — just won't show auto-inference
      }
    })();
  }, [executeDialogOpen, workflowId]);

  // Compute context flow whenever nodes or edges change
  const contextFlow = useMemo(() => {
    // Find trigger node's payload schema
    const triggerNode = nodes.find((n) => n.type === 'trigger');
    const payloadSchema = (triggerNode?.data as any)?.payloadSchema as PayloadProperty[] | undefined;

    return computeContextFlow(nodes, edges, nodeTypeMap, payloadSchema);
  }, [nodes, edges, nodeTypeMap]);

  // Get available variables for the selected node
  const selectedNodeVariables = useMemo(() => {
    if (!selectedNode) return [];
    return contextFlow.get(selectedNode.id)?.available ?? [];
  }, [selectedNode, contextFlow]);

  // Get payload schema from the trigger node
  const payloadSchema = useMemo(() => {
    const triggerNode = nodes.find((n) => n.type === 'trigger');
    return (triggerNode?.data as any)?.payloadSchema as PayloadProperty[] | undefined;
  }, [nodes]);

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  // Handle node selection
  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Update node data from inspector
  const onUpdateNode = useCallback(
    (nodeId: string, data: Record<string, any>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data } : n))
      );
      setSelectedNode((prev) =>
        prev && prev.id === nodeId ? { ...prev, data } : prev
      );
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

      const data = event.dataTransfer.getData('application/workflow-node');
      if (!data) return;

      const nodeType: NodeTypeDefinition = JSON.parse(data);

      // Map node registry categories to ReactFlow node types
      let rfNodeType = 'apiCall';
      const nodeData: Record<string, any> = { label: nodeType.label };

      switch (nodeType.category) {
        case 'api-call':
          rfNodeType = 'apiCall';
          nodeData.nodeTypeId = nodeType.id;
          nodeData.inputMapping = {};
          break;
        case 'event-emit':
          rfNodeType = 'eventEmit';
          nodeData.eventName = '';
          break;
        case 'condition':
          rfNodeType = 'condition';
          break;
        case 'transform':
          rfNodeType = 'transform';
          nodeData.mapping = {};
          break;
        case 'delay':
          rfNodeType = 'delay';
          nodeData.ms = 1000;
          break;
        case 'variable':
          rfNodeType = 'setVariable';
          nodeData.variableName = '';
          nodeData.variableValue = '';
          break;
        case 'data':
          rfNodeType = 'sqlQuery';
          nodeData.query = '';
          nodeData.params = [];
          break;
        case 'loop':
          if (nodeType.id === 'core.whileLoop') {
            rfNodeType = 'whileLoop';
            nodeData.key = '';
            nodeData.operator = '==';
            nodeData.value = '';
            nodeData.maxIterations = 100;
            nodeData.timeoutMs = 50000;
          } else {
            rfNodeType = 'forEach';
            nodeData.collection = '';
            nodeData.itemVariable = 'item';
            nodeData.indexVariable = 'index';
            nodeData.maxIterations = 100;
            nodeData.timeoutMs = 50000;
            nodeData.parallelBatchSize = 0;
          }
          break;
        default:
          // Check for quick-add built-in types
          if (nodeType.id === 'core.trigger') rfNodeType = 'trigger';
          else if (nodeType.id === 'core.end') rfNodeType = 'end';
          else if (nodeType.id === 'core.condition') rfNodeType = 'condition';
          else if (nodeType.id === 'core.delay') {
            rfNodeType = 'delay';
            nodeData.ms = 1000;
          } else if (nodeType.id === 'core.setVariable') {
            rfNodeType = 'setVariable';
            nodeData.variableName = '';
            nodeData.variableValue = '';
          } else if (nodeType.id === 'core.sql') {
            rfNodeType = 'sqlQuery';
            nodeData.query = '';
            nodeData.params = [];
          }
      }

      // Get position relative to the ReactFlow wrapper
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      const position = {
        x: event.clientX - (bounds?.left ?? 0) - 80,
        y: event.clientY - (bounds?.top ?? 0) - 20,
      };

      const newNode: Node = {
        id: generateNodeId(rfNodeType),
        type: rfNodeType,
        position,
        data: nodeData,
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  // Save workflow
  const handleSave = useCallback(async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      const definition = reactFlowToXState(nodes, edges, workflowSlug);
      await onSave(definition);
      setSnackbar({ open: true, message: 'Workflow saved!', severity: 'success' });
    } catch (err) {
      setSnackbar({
        open: true,
        message: `Save failed: ${err instanceof Error ? err.message : String(err)}`,
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  }, [nodes, edges, workflowSlug, onSave]);

  // Execute workflow
  const handleExecute = useCallback(async (payload: Record<string, unknown>) => {
    if (!onExecute) return;
    await onExecute(payload);
  }, [onExecute]);

  return (
    <Box sx={{ display: 'flex', height: '100%', width: '100%' }}>
      {/* Left: Node Palette */}
      <NodePalette nodeTypes={availableNodeTypes} />

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
                case 'trigger': return '#4caf50';
                case 'apiCall': return '#42a5f5';
                case 'condition': return '#ff9800';
                case 'transform': return '#ab47bc';
                case 'eventEmit': return '#e91e63';
                case 'delay': return '#78909c';
                case 'end': return '#ef5350';
                case 'setVariable': return '#ffb300';
                case 'sqlQuery': return '#26a69a';
                case 'forEach': return '#00838f';
                case 'whileLoop': return '#5e35b1';
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
              {onExecute && (
                <Button
                  variant="contained"
                  size="small"
                  color="success"
                  startIcon={<PlayArrowIcon />}
                  onClick={() => setExecuteDialogOpen(true)}
                >
                  Execute
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
              <Tooltip title="Compile to Code">
                <IconButton
                  size="small"
                  onClick={() => setCompileDialogOpen(true)}
                  sx={{
                    bgcolor: 'background.paper',
                    color: 'text.secondary',
                    '&:hover': { bgcolor: 'action.hover' },
                    boxShadow: 1,
                  }}
                >
                  <CodeIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Panel>

          <Panel position="top-left">
            <Typography variant="caption" color="text.secondary" sx={{ bgcolor: 'white', px: 1, py: 0.5, borderRadius: 1 }}>
              {nodes.length} nodes &middot; {edges.length} edges
            </Typography>
          </Panel>
        </ReactFlow>
      </Box>

      {/* Right: Node Inspector */}
      {selectedNode && (
        <NodeInspector
          selectedNode={selectedNode}
          onUpdateNode={onUpdateNode}
          onClose={() => setSelectedNode(null)}
          nodeTypeMap={nodeTypeMap}
          availableVariables={selectedNodeVariables}
        />
      )}

      {/* Right: Version History Panel */}
      {historyOpen && (
        <VersionHistory
          workflowId={workflowId}
          currentVersion={currentVersion}
          onRestore={(definition) => {
            // Reload the canvas with the restored definition
            const restored = xStateToReactFlow(definition as WorkflowDefinition);
            setNodes(restored.nodes);
            setEdges(restored.edges);
            setSelectedNode(null);
            setCurrentVersion((v) => v + 1);
            setSnackbar({ open: true, message: 'Workflow restored from version history!', severity: 'success' });
          }}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      {/* Execute Dialog */}
      <ExecuteDialog
        open={executeDialogOpen}
        onClose={() => setExecuteDialogOpen(false)}
        onExecute={handleExecute}
        payloadSchema={payloadSchema}
        workflowName={workflowSlug}
        workflowId={workflowId}
        lastPayload={lastPayload}
        onApplyInferredSchema={(schema) => {
          // Apply inferred schema to the trigger node
          const triggerNode = nodes.find((n) => n.type === 'trigger');
          if (triggerNode) {
            onUpdateNode(triggerNode.id, { ...triggerNode.data, payloadSchema: schema });
          }
        }}
      />

      {/* Compile Dialog */}
      <CompileDialog
        open={compileDialogOpen}
        onClose={() => setCompileDialogOpen(false)}
        workflowId={workflowId}
        workflowSlug={workflowSlug}
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

/**
 * WorkflowCanvas — The main visual workflow editor component.
 * Wraps ReactFlow with custom nodes, palette, and inspector.
 */
export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

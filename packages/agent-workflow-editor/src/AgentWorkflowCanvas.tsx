'use client';

import React, { useCallback, useRef, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  addEdge,
  useNodesState,
  useEdgesState,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, Button, Chip, Divider, IconButton, Tooltip } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import SettingsIcon from '@mui/icons-material/Settings';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import HistoryIcon from '@mui/icons-material/History';
import BugReportIcon from '@mui/icons-material/BugReport';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { AgentNode } from './nodes/AgentNode';
import { AgentNodePalette } from './panels/AgentNodePalette';
import { AgentNodeInspector } from './panels/AgentNodeInspector';
import { AgentConfigPanel } from './panels/AgentConfigPanel';
import { VersionHistoryPanel } from './panels/VersionHistoryPanel';
import { ExecutionTracePanel } from './panels/ExecutionTracePanel';
import { ValidationPanel } from './panels/ValidationPanel';
import { validateAgentWorkflow } from './validation/validateAgentWorkflow';
import { applyExecutionOverlay } from './utils/execution-trace';
import type { ExecutionTrace } from './utils/execution-trace';
import type { ValidationResult } from './validation/validateAgentWorkflow';
import { definitionToFlow, flowToDefinition } from './store/converters';
import { getNodeType } from './store/node-registry';
import { computeAgentContextFlow } from './utils/agent-context-flow';
import type { ContextVariable } from './utils/agent-context-flow';
import type { AgentNodeTypeDefinition, AgentFlowNode, AgentNodeData, RightPanelMode } from './store/types';

// ─── Props ──────────────────────────────────────────────────

export interface AgentWorkflowCanvasProps {
  workflowId?: number;
  definition: Record<string, unknown>;
  agentConfig?: Record<string, unknown>;
  memoryConfig?: Record<string, unknown>;
  onSave: (data: { definition: Record<string, unknown>; agentConfig: Record<string, unknown>; memoryConfig: Record<string, unknown> }) => void;
  onExecute?: () => void;
}

// ─── Custom Node Types ──────────────────────────────────────

const nodeTypes = { agentNode: AgentNode };

// ─── Canvas Inner (requires ReactFlowProvider) ──────────────

function AgentWorkflowCanvasInner({ workflowId, definition, agentConfig: initAgentConfig, memoryConfig: initMemoryConfig, onSave, onExecute }: AgentWorkflowCanvasProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => definitionToFlow(definition as never),
    [definition],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [rightPanel, setRightPanel] = React.useState<RightPanelMode>('inspector');
  const [isDirty, setIsDirty] = React.useState(false);
  const [validationResult, setValidationResult] = React.useState<ValidationResult | null>(null);
  const [showValidation, setShowValidation] = React.useState(false);
  const [executionTrace, setExecutionTrace] = React.useState<ExecutionTrace | null>(null);

  const [agentConfig, setAgentConfig] = React.useState({
    model: 'fast',
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: '',
    maxSteps: 50,
    toolBindings: [] as string[],
    ...initAgentConfig,
  });

  const [memoryConfig, setMemoryConfig] = React.useState({
    enabled: false,
    maxMemories: 100,
    embeddingModel: 'text-embedding-3-small',
    ...initMemoryConfig,
  });

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const nodeIdCounter = useRef(nodes.length + 1);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // Compute context flow — tracks available variables at each node
  const contextFlow = useMemo(() => computeAgentContextFlow(nodes as AgentFlowNode[], edges), [nodes, edges]);
  const selectedNodeFlow = selectedNodeId ? contextFlow.get(selectedNodeId) : undefined;

  const onConnect: OnConnect = useCallback((params) => {
    setEdges(eds => addEdge({ ...params, type: 'smoothstep' }, eds));
    setIsDirty(true);
  }, [setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: AgentFlowNode) => {
    setSelectedNodeId(node.id);
    setRightPanel('inspector');
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleAddNode = useCallback((nodeType: AgentNodeTypeDefinition) => {
    const id = `${nodeType.slug}_${nodeIdCounter.current++}`;
    const newNode: AgentFlowNode = {
      id,
      type: 'agentNode',
      position: { x: 300, y: 100 + nodes.length * 120 },
      data: {
        label: id,
        nodeSlug: nodeType.slug,
        category: nodeType.category,
        color: nodeType.color,
        icon: nodeType.icon,
        config: { ...nodeType.defaultConfig },
        inputMapping: {},
      },
    };
    setNodes(nds => [...nds, newNode]);
    setSelectedNodeId(id);
    setRightPanel('inspector');
    setIsDirty(true);
  }, [nodes.length, setNodes]);

  const handleUpdateNodeData = useCallback((data: Partial<AgentNodeData>) => {
    if (!selectedNodeId) return;
    setNodes(nds => nds.map(n =>
      n.id === selectedNodeId ? { ...n, data: { ...n.data, ...data } } : n,
    ));
    setIsDirty(true);
  }, [selectedNodeId, setNodes]);

  const handleDeleteNode = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes(nds => nds.filter(n => n.id !== selectedNodeId));
    setEdges(eds => eds.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
    setIsDirty(true);
  }, [selectedNodeId, setNodes, setEdges]);

  const handleValidate = useCallback(() => {
    const result = validateAgentWorkflow(nodes as AgentFlowNode[], edges);
    setValidationResult(result);
    setShowValidation(true);
    return result;
  }, [nodes, edges]);

  const handleSave = useCallback(() => {
    const result = handleValidate();
    if (!result.valid) return; // Block save on errors
    const def = flowToDefinition(nodes as AgentFlowNode[], edges);
    onSave({ definition: def as unknown as Record<string, unknown>, agentConfig, memoryConfig });
    setIsDirty(false);
  }, [nodes, edges, agentConfig, memoryConfig, onSave, handleValidate]);

  // Auto-layout function — repositions nodes in clean vertical flow
  const handleAutoLayout = useCallback(() => {
    const sorted = [...nodes].sort((a, b) => {
      if (a.data._isEntry) return -1;
      if (b.data._isEntry) return 1;
      if (a.data.nodeSlug === 'end') return 1;
      if (b.data.nodeSlug === 'end') return -1;
      return 0;
    });
    const updated = sorted.map((node, i) => ({
      ...node,
      position: { x: 400, y: 50 + i * 160 },
    }));
    setNodes(updated);
    setIsDirty(true);
  }, [nodes, setNodes]);

  const handleLoadTrace = useCallback((trace: ExecutionTrace) => {
    setExecutionTrace(trace);
    // Apply execution overlay to nodes
    const overlayed = applyExecutionOverlay(nodes as AgentFlowNode[], trace);
    setNodes(overlayed);
  }, [nodes, setNodes]);

  const handleRestoreVersion = useCallback((restoredDefinition: Record<string, unknown>) => {
    const { nodes: newNodes, edges: newEdges } = definitionToFlow(restoredDefinition as never);
    setNodes(newNodes);
    setEdges(newEdges);
    setIsDirty(true);
    setRightPanel('inspector');
  }, [setNodes, setEdges]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const data = event.dataTransfer.getData('application/agent-node');
    if (!data) return;
    try {
      const nodeType = JSON.parse(data) as AgentNodeTypeDefinition;
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;
      handleAddNode(nodeType);
    } catch { /* ignore */ }
  }, [handleAddNode]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <Box sx={{ display: 'flex', height: '100%', width: '100%' }}>
      {/* Left: Node Palette */}
      <AgentNodePalette onAddNode={handleAddNode} />

      {/* Center: Canvas */}
      <Box ref={reactFlowWrapper} sx={{ flex: 1, height: '100%' }} onDrop={handleDrop} onDragOver={handleDragOver}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode="Delete"
        >
          <Background gap={20} size={1} />
          <Controls />
          <MiniMap
            nodeStrokeWidth={3}
            pannable
            zoomable
          />

          {/* Top toolbar */}
          <Panel position="top-right">
            <Box sx={{ display: 'flex', gap: 1, bgcolor: 'white', p: 1, borderRadius: 1, boxShadow: 2 }}>
              {isDirty && <Chip label="Unsaved" size="small" color="warning" />}
              {validationResult && !validationResult.valid && (
                <Chip icon={<ErrorOutlineIcon />} label={`${validationResult.errorCount} errors`} size="small" color="error"
                  onClick={() => setShowValidation(!showValidation)} sx={{ cursor: 'pointer' }} />
              )}
              {validationResult?.valid && (
                <Chip icon={<CheckCircleIcon />} label="Valid" size="small" color="success" sx={{ cursor: 'pointer' }}
                  onClick={() => setShowValidation(!showValidation)} />
              )}
              <Tooltip title="Auto Layout">
                <IconButton size="small" onClick={handleAutoLayout}>
                  <AutoFixHighIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Validate">
                <IconButton size="small" onClick={handleValidate}>
                  <CheckCircleIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Version History">
                <IconButton size="small" onClick={() => setRightPanel(rightPanel === 'versions' ? 'inspector' : 'versions')}>
                  <HistoryIcon fontSize="small" color={rightPanel === 'versions' ? 'primary' : 'inherit'} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Execution Debug">
                <IconButton size="small" onClick={() => setRightPanel(rightPanel === 'execution' ? 'inspector' : 'execution')}>
                  <BugReportIcon fontSize="small" color={rightPanel === 'execution' ? 'primary' : 'inherit'} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Agent Settings">
                <IconButton size="small" onClick={() => setRightPanel(rightPanel === 'agentConfig' ? 'inspector' : 'agentConfig')}>
                  <SettingsIcon fontSize="small" color={rightPanel === 'agentConfig' ? 'primary' : 'inherit'} />
                </IconButton>
              </Tooltip>
              {onExecute && (
                <Button size="small" variant="outlined" startIcon={<PlayArrowIcon />} onClick={() => {
                  const result = handleValidate();
                  if (result.valid) onExecute();
                }}>
                  Execute
                </Button>
              )}
              <Button
                size="small"
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={!isDirty}
              >
                Save
              </Button>
            </Box>
          </Panel>
        </ReactFlow>
      </Box>

      {/* Right: Inspector or Config Panel */}
      {rightPanel === 'inspector' && selectedNode && (
        <AgentNodeInspector
          nodeId={selectedNode.id}
          data={selectedNode.data}
          onUpdate={handleUpdateNodeData}
          onDelete={handleDeleteNode}
          availableVariables={selectedNodeFlow?.available}
          producedVariables={selectedNodeFlow?.produced}
        />
      )}
      {rightPanel === 'agentConfig' && (
        <AgentConfigPanel
          config={agentConfig}
          memoryConfig={memoryConfig}
          onConfigChange={c => { setAgentConfig(prev => ({ ...prev, ...c })); setIsDirty(true); }}
          onMemoryChange={c => { setMemoryConfig(prev => ({ ...prev, ...c })); setIsDirty(true); }}
        />
      )}
      {rightPanel === 'versions' && definition && (
        <VersionHistoryPanel
          workflowId={workflowId ?? 0}
          currentDefinition={props.definition}
          onRestore={handleRestoreVersion}
        />
      )}
      {rightPanel === 'execution' && (
        <ExecutionTracePanel
          workflowId={workflowId ?? 0}
          onLoadTrace={handleLoadTrace}
          selectedNodeId={selectedNodeId}
        />
      )}

      {/* Bottom: Validation Panel */}
      {showValidation && validationResult && (
        <Box sx={{ position: 'absolute', bottom: 0, left: 240, right: rightPanel !== 'inspector' || selectedNode ? 320 : 0, zIndex: 10, bgcolor: 'white', borderTop: 2, borderColor: validationResult.valid ? 'success.main' : 'error.main', boxShadow: 3 }}>
          <ValidationPanel
            result={validationResult}
            onNavigateToNode={(nodeId) => { setSelectedNodeId(nodeId); setRightPanel('inspector'); setShowValidation(false); }}
          />
        </Box>
      )}
    </Box>
  );
}

// ─── Main Export (wraps with Provider) ──────────────────────

export function AgentWorkflowCanvas(props: AgentWorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <AgentWorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

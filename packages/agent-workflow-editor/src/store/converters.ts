import type { AgentFlowNode, AgentFlowEdge, AgentNodeData } from './types';
import { getNodeType } from './node-registry';

// ─── Types from module-workflow-agents ───────────────────────

interface AgentWorkflowDefinition {
  id: string;
  initial: string;
  context?: Record<string, unknown>;
  states: Record<string, AgentStateDefinition>;
}

interface AgentStateDefinition {
  type?: 'final';
  invoke?: {
    src: string;
    input?: Record<string, unknown>;
    onDone?: string | { target: string; guard?: unknown };
    onError?: string;
  };
  always?: string | Array<{ target: string; guard?: unknown }>;
}

// ─── Definition → React Flow Nodes/Edges ────────────────────

export function definitionToFlow(definition: AgentWorkflowDefinition): {
  nodes: AgentFlowNode[];
  edges: AgentFlowEdge[];
} {
  const nodes: AgentFlowNode[] = [];
  const edges: AgentFlowEdge[] = [];
  const stateNames = Object.keys(definition.states);

  // Layout: simple vertical arrangement
  let y = 50;
  const X_CENTER = 300;
  const Y_SPACING = 150;

  for (const [stateName, stateDef] of Object.entries(definition.states)) {
    const nodeSlug = stateDef.type === 'final' ? 'end' : (stateDef.invoke?.src ?? 'transform');
    const nodeDef = getNodeType(nodeSlug);

    const nodeData: AgentNodeData = {
      label: stateName,
      nodeSlug,
      category: nodeDef?.category ?? 'Logic',
      color: nodeDef?.color ?? '#78909C',
      icon: nodeDef?.icon ?? '⚙️',
      config: stateDef.invoke?.input ?? {},
      inputMapping: stateDef.invoke?.input ?? {},
      onDoneTarget: extractTarget(stateDef.invoke?.onDone),
      onErrorTarget: stateDef.invoke?.onError,
    };

    nodes.push({
      id: stateName,
      type: 'agentNode',
      position: { x: X_CENTER, y },
      data: nodeData,
    });

    y += Y_SPACING;

    // Create edges
    if (stateDef.invoke?.onDone) {
      const target = extractTarget(stateDef.invoke.onDone);
      if (target) {
        edges.push({
          id: `${stateName}->${target}`,
          source: stateName,
          target,
          sourceHandle: 'done',
          label: 'done',
          type: 'smoothstep',
        });
      }
    }

    if (stateDef.invoke?.onError) {
      edges.push({
        id: `${stateName}-error->${stateDef.invoke.onError}`,
        source: stateName,
        target: stateDef.invoke.onError,
        sourceHandle: 'error',
        label: 'error',
        type: 'smoothstep',
        style: { stroke: '#EF5350' },
      });
    }

    // Always transitions
    if (stateDef.always) {
      const transitions = typeof stateDef.always === 'string'
        ? [{ target: stateDef.always }]
        : Array.isArray(stateDef.always)
          ? stateDef.always.map(t => typeof t === 'string' ? { target: t } : t)
          : [];
      for (const t of transitions) {
        edges.push({
          id: `${stateName}-always->${t.target}`,
          source: stateName,
          target: t.target,
          sourceHandle: 'done',
          label: t.guard ? 'guarded' : '',
          type: 'smoothstep',
          style: t.guard ? { strokeDasharray: '5,5' } : undefined,
        });
      }
    }
  }

  return { nodes, edges };
}

// ─── React Flow → Definition ────────────────────────────────

export function flowToDefinition(
  nodes: AgentFlowNode[],
  edges: AgentFlowEdge[],
): AgentWorkflowDefinition {
  const states: Record<string, AgentStateDefinition> = {};

  // Find entry node (topmost or first non-end node)
  const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y);
  const entryNode = sortedNodes.find(n => n.data.nodeSlug !== 'end');
  const initial = entryNode?.id ?? 'start';

  for (const node of nodes) {
    const data = node.data;

    if (data.nodeSlug === 'end') {
      states[node.id] = { type: 'final' };
      continue;
    }

    // Find outgoing edges
    const doneEdge = edges.find(e => e.source === node.id && e.sourceHandle !== 'error');
    const errorEdge = edges.find(e => e.source === node.id && e.sourceHandle === 'error');

    const stateDef: AgentStateDefinition = {};

    if (data.nodeSlug) {
      stateDef.invoke = {
        src: data.nodeSlug,
        input: Object.keys(data.config).length > 0 ? data.config : undefined,
        onDone: doneEdge?.target,
        onError: errorEdge?.target,
      };
    }

    states[node.id] = stateDef;
  }

  return {
    id: 'agent-workflow',
    initial,
    states,
  };
}

// ─── Helpers ────────────────────────────────────────────────

function extractTarget(onDone: string | { target: string } | undefined): string | undefined {
  if (!onDone) return undefined;
  if (typeof onDone === 'string') return onDone;
  return onDone.target;
}

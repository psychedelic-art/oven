import type { AgentFlowNode, AgentFlowEdge } from '../store/types';

// ─── Context Variable ───────────────────────────────────────

export interface ContextVariable {
  name: string;       // Display name (e.g., "text", "context")
  type: string;       // 'string' | 'number' | 'boolean' | 'object' | 'array'
  source: string;     // Display source (e.g., "LLM: respond", "RAG: retrieve")
  sourceNodeId: string;
  path: string;       // $.path reference (e.g., "$.respond.text")
}

// ─── Node Output Definitions ────────────────────────────────
// What each node type produces as output variables.

const NODE_OUTPUTS: Record<string, Array<{ name: string; type: string }>> = {
  llm: [
    { name: 'text', type: 'string' },
    { name: 'tokens', type: 'object' },
    { name: 'toolCalls', type: 'array' },
  ],
  rag: [
    { name: 'context', type: 'array' },
    { name: 'resultCount', type: 'number' },
    { name: 'query', type: 'string' },
    { name: 'topResultConfident', type: 'boolean' },
  ],
  'tool-executor': [
    { name: 'toolResults', type: 'array' },
  ],
  condition: [
    { name: 'branch', type: 'string' },
  ],
  transform: [
    { name: 'result', type: 'object' },
  ],
  memory: [
    { name: 'memories', type: 'array' },
    { name: 'stored', type: 'boolean' },
  ],
  'human-review': [
    { name: 'decision', type: 'string' },
    { name: 'feedback', type: 'string' },
  ],
  subagent: [
    { name: 'text', type: 'string' },
    { name: 'tokens', type: 'object' },
    { name: 'toolsUsed', type: 'array' },
    { name: 'latencyMs', type: 'number' },
  ],
  prompt: [
    { name: 'systemPrompt', type: 'string' },
  ],
  switch: [
    { name: 'route', type: 'string' },
    { name: 'matchedCase', type: 'string' },
    { name: 'value', type: 'string' },
  ],
  loop: [
    { name: 'items', type: 'array' },
    { name: 'iterationCount', type: 'number' },
  ],
};

// ─── Trigger Variables (always available) ───────────────────

const TRIGGER_VARIABLES: ContextVariable[] = [
  { name: 'message', type: 'string', source: 'Trigger', sourceNodeId: 'trigger', path: '$.trigger.message' },
  { name: 'messages', type: 'array', source: 'Trigger', sourceNodeId: 'trigger', path: '$.trigger.messages' },
  { name: 'question', type: 'string', source: 'Trigger', sourceNodeId: 'trigger', path: '$.trigger.question' },
];

// ─── Compute Context Flow ───────────────────────────────────
// Traverses the graph in topological order and computes what variables
// are available at each node based on upstream outputs.

export function computeAgentContextFlow(
  nodes: AgentFlowNode[],
  edges: AgentFlowEdge[],
): Map<string, { available: ContextVariable[]; produced: ContextVariable[] }> {
  const result = new Map<string, { available: ContextVariable[]; produced: ContextVariable[] }>();

  // Build adjacency for topological sort
  const inDegree = new Map<string, number>();
  const children = new Map<string, string[]>();
  for (const node of nodes) {
    inDegree.set(node.id, 0);
    children.set(node.id, []);
  }
  for (const edge of edges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    const kids = children.get(edge.source) ?? [];
    kids.push(edge.target);
    children.set(edge.source, kids);
  }

  // Kahn's topological sort
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const accumulated = new Map<string, ContextVariable[]>();
  const sorted: string[] = [];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    sorted.push(nodeId);
    const node = nodes.find(n => n.id === nodeId);
    if (!node) continue;

    // Collect variables from all parent nodes
    const available = [...TRIGGER_VARIABLES];
    for (const edge of edges) {
      if (edge.target === nodeId) {
        const parentVars = accumulated.get(edge.source) ?? [];
        for (const v of parentVars) {
          if (!available.some(a => a.path === v.path)) {
            available.push(v);
          }
        }
      }
    }

    // Compute what this node produces
    const produced = getNodeOutputs(node);

    result.set(nodeId, { available, produced });

    // Accumulate for children
    accumulated.set(nodeId, [...available, ...produced]);

    // Process children
    for (const childId of children.get(nodeId) ?? []) {
      inDegree.set(childId, (inDegree.get(childId) ?? 0) - 1);
      if (inDegree.get(childId) === 0) queue.push(childId);
    }
  }

  // Handle nodes not reached by topological sort (disconnected)
  for (const node of nodes) {
    if (!result.has(node.id)) {
      result.set(node.id, { available: [...TRIGGER_VARIABLES], produced: getNodeOutputs(node) });
    }
  }

  return result;
}

// ─── Get Node Outputs ───────────────────────────────────────

function getNodeOutputs(node: AgentFlowNode): ContextVariable[] {
  const nodeSlug = node.data.nodeSlug;
  const outputs = NODE_OUTPUTS[nodeSlug] ?? [];
  const nodeLabel = `${node.data.icon} ${node.data.label}`;

  return outputs.map(out => ({
    name: out.name,
    type: out.type,
    source: nodeLabel,
    sourceNodeId: node.id,
    path: `$.${node.id}.${out.name}`,
  }));
}

// ─── Group Variables by Source ───────────────────────────────

export function groupVariablesBySource(variables: ContextVariable[]): Array<{
  source: string;
  sourceNodeId: string;
  variables: ContextVariable[];
}> {
  const groups = new Map<string, { source: string; sourceNodeId: string; variables: ContextVariable[] }>();
  for (const v of variables) {
    const existing = groups.get(v.sourceNodeId);
    if (existing) {
      existing.variables.push(v);
    } else {
      groups.set(v.sourceNodeId, { source: v.source, sourceNodeId: v.sourceNodeId, variables: [v] });
    }
  }
  return Array.from(groups.values());
}

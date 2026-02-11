import type { Node, Edge } from '@xyflow/react';
import type {
  NodeTypeDefinition,
  PayloadProperty,
  ContextVariable,
} from '@oven/module-workflows/types';

/**
 * Topological sort of the node graph.
 * Returns node IDs in execution order (parents before children).
 */
function topologicalSort(nodes: Node[], edges: Edge[]): string[] {
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialize
  for (const node of nodes) {
    graph.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  // Build adjacency
  for (const edge of edges) {
    const children = graph.get(edge.source) ?? [];
    children.push(edge.target);
    graph.set(edge.source, children);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  // Kahn's algorithm
  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    sorted.push(id);
    for (const child of graph.get(id) ?? []) {
      const newDegree = (inDegree.get(child) ?? 1) - 1;
      inDegree.set(child, newDegree);
      if (newDegree === 0) queue.push(child);
    }
  }

  return sorted;
}

/**
 * Get the parents of a node (nodes that have edges pointing to it).
 */
function getParents(nodeId: string, edges: Edge[]): string[] {
  return edges.filter((e) => e.target === nodeId).map((e) => e.source);
}

/**
 * Compute the context flow for each node in the workflow graph.
 *
 * Returns a Map<nodeId, { available, produced }> where:
 * - available: all variables reachable at this node (from upstream outputs + trigger payload)
 * - produced: variables this node adds to the context
 *
 * @param nodes - ReactFlow nodes
 * @param edges - ReactFlow edges
 * @param nodeTypeMap - Map of nodeTypeId → NodeTypeDefinition (from registry)
 * @param payloadSchema - The trigger payload schema defining input properties
 */
export function computeContextFlow(
  nodes: Node[],
  edges: Edge[],
  nodeTypeMap: Map<string, NodeTypeDefinition>,
  payloadSchema?: PayloadProperty[]
): Map<string, { available: ContextVariable[]; produced: ContextVariable[] }> {
  const result = new Map<string, { available: ContextVariable[]; produced: ContextVariable[] }>();
  const sorted = topologicalSort(nodes, edges);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Accumulated context per node (what's available AFTER this node runs)
  const contextAfter = new Map<string, ContextVariable[]>();

  for (const nodeId of sorted) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;

    const data = (node.data ?? {}) as Record<string, any>;
    const nodeType = node.type ?? 'unknown';

    // Collect available variables from all parents
    const parentIds = getParents(nodeId, edges);
    const availableSet = new Map<string, ContextVariable>();

    for (const parentId of parentIds) {
      const parentContext = contextAfter.get(parentId) ?? [];
      for (const v of parentContext) {
        // Use path as unique key to avoid duplicates
        availableSet.set(v.path, v);
      }
    }

    // If this is a trigger node with no parents, seed with payload schema
    if (nodeType === 'trigger' && parentIds.length === 0 && payloadSchema) {
      for (const prop of payloadSchema) {
        const variable: ContextVariable = {
          name: prop.name,
          type: prop.type,
          source: 'Trigger Payload',
          sourceNodeId: nodeId,
          path: `$.${prop.name}`,
        };
        availableSet.set(variable.path, variable);
      }
    }

    const available = Array.from(availableSet.values());

    // Compute what this node produces
    const produced: ContextVariable[] = [];
    const nodeLabel = data.label ?? nodeId;

    if (nodeType === 'apiCall' && data.nodeTypeId) {
      const typeDef = nodeTypeMap.get(data.nodeTypeId);
      if (typeDef) {
        for (const output of typeDef.outputs) {
          // Flat output (direct merge)
          produced.push({
            name: output.name,
            type: output.type,
            source: nodeLabel,
            sourceNodeId: nodeId,
            path: `$.${output.name}`,
          });
          // Namespaced output
          produced.push({
            name: `${nodeId}_output.${output.name}`,
            type: output.type,
            source: `${nodeLabel} (namespaced)`,
            sourceNodeId: nodeId,
            path: `$.${nodeId}_output.${output.name}`,
          });
        }
      }
    } else if (nodeType === 'setVariable') {
      const varName = data.variableName ?? '';
      if (varName) {
        produced.push({
          name: varName,
          type: 'string', // We don't know the type until runtime
          source: `Set Variable: ${varName}`,
          sourceNodeId: nodeId,
          path: `$.${varName}`,
        });
      }
    } else if (nodeType === 'sqlQuery') {
      produced.push({
        name: 'rows',
        type: 'array',
        source: nodeLabel,
        sourceNodeId: nodeId,
        path: `$.rows`,
      });
      produced.push({
        name: 'rowCount',
        type: 'number',
        source: nodeLabel,
        sourceNodeId: nodeId,
        path: `$.rowCount`,
      });
      produced.push({
        name: `${nodeId}_output.rows`,
        type: 'array',
        source: `${nodeLabel} (namespaced)`,
        sourceNodeId: nodeId,
        path: `$.${nodeId}_output.rows`,
      });
    } else if (nodeType === 'transform') {
      const mapping = data.mapping ?? {};
      for (const key of Object.keys(mapping)) {
        produced.push({
          name: key,
          type: 'string',
          source: nodeLabel,
          sourceNodeId: nodeId,
          path: `$.${key}`,
        });
      }
    } else if (nodeType === 'forEach') {
      const itemVar = data.itemVariable ?? 'item';
      const indexVar = data.indexVariable ?? 'index';
      produced.push({
        name: itemVar,
        type: 'object',
        source: nodeLabel,
        sourceNodeId: nodeId,
        path: `$.${itemVar}`,
      });
      produced.push({
        name: indexVar,
        type: 'number',
        source: nodeLabel,
        sourceNodeId: nodeId,
        path: `$.${indexVar}`,
      });
      produced.push({
        name: 'results',
        type: 'array',
        source: nodeLabel,
        sourceNodeId: nodeId,
        path: `$.results`,
      });
      produced.push({
        name: 'iterationCount',
        type: 'number',
        source: nodeLabel,
        sourceNodeId: nodeId,
        path: `$.iterationCount`,
      });
    } else if (nodeType === 'whileLoop') {
      produced.push({
        name: 'iterationCount',
        type: 'number',
        source: nodeLabel,
        sourceNodeId: nodeId,
        path: `$.iterationCount`,
      });
    } else if (nodeType === 'trigger' && payloadSchema) {
      // Trigger passes through payload — produced = payload schema
      for (const prop of payloadSchema) {
        produced.push({
          name: prop.name,
          type: prop.type,
          source: 'Trigger Payload',
          sourceNodeId: nodeId,
          path: `$.${prop.name}`,
        });
      }
    }

    result.set(nodeId, { available, produced });

    // Context after this node = available + produced
    const afterContext = [...available, ...produced];
    contextAfter.set(nodeId, afterContext);
  }

  return result;
}

/**
 * Group context variables by their source for display in the UI.
 */
export function groupVariablesBySource(
  variables: ContextVariable[]
): { source: string; sourceNodeId: string; variables: ContextVariable[] }[] {
  const groups = new Map<string, { sourceNodeId: string; variables: ContextVariable[] }>();

  for (const v of variables) {
    // Skip namespaced duplicates for cleaner UI
    if (v.name.includes('_output.')) continue;

    const existing = groups.get(v.source);
    if (existing) {
      existing.variables.push(v);
    } else {
      groups.set(v.source, { sourceNodeId: v.sourceNodeId, variables: [v] });
    }
  }

  return Array.from(groups.entries()).map(([source, data]) => ({
    source,
    ...data,
  }));
}

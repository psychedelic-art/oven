/**
 * Client-side SQL preview generator.
 * Produces a simplified preview of the RLS policy SQL from the visual definition.
 * The server-side compiler (rls-compiler.ts) is the authoritative source —
 * this is just for quick inline previews in the editor.
 */

interface RlsNode {
  id: string;
  type: string;
  data: Record<string, any>;
}

interface RlsEdge {
  id: string;
  source: string;
  target: string;
}

const CONTEXT_VAR_SQL: Record<string, string> = {
  current_user_id: "current_setting('app.current_user_id')::int",
  current_role: "current_setting('app.current_role')",
  current_hierarchy_path: "current_setting('app.current_hierarchy_path')",
};

/**
 * Generate a preview WHERE clause from the visual definition.
 */
export function definitionToSqlPreview(
  nodes: RlsNode[],
  edges: RlsEdge[]
): string {
  if (nodes.length === 0) return '-- No nodes defined';

  const nodeMap = new Map<string, RlsNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  // Build reverse adjacency
  const incoming = new Map<string, RlsEdge[]>();
  for (const e of edges) {
    const list = incoming.get(e.target) ?? [];
    list.push(e);
    incoming.set(e.target, list);
  }

  // Find the action node
  const actionNode = nodes.find((n) => n.type === 'action');
  if (!actionNode) return '-- No action node';

  const expr = buildExpr(actionNode.id, nodeMap, incoming);
  const isAllow = actionNode.data.action !== 'DENY';

  return isAllow ? expr : `NOT (${expr})`;
}

function buildExpr(
  nodeId: string,
  nodeMap: Map<string, RlsNode>,
  incoming: Map<string, RlsEdge[]>
): string {
  const node = nodeMap.get(nodeId);
  if (!node) return 'TRUE';

  switch (node.type) {
    case 'condition': {
      const col = node.data.column || '?';
      const op = node.data.operator || '=';
      if (op === 'IS NULL' || op === 'IS NOT NULL') return `${col} ${op}`;

      // Try to resolve value
      let val = node.data.value || '?';
      if (node.data.valueRef) {
        const refNode = nodeMap.get(node.data.valueRef);
        if (refNode?.type === 'context') {
          val = CONTEXT_VAR_SQL[refNode.data.variable] ?? `$.${refNode.data.variable}`;
        }
      } else {
        // Check incoming context edges
        const inEdges = incoming.get(nodeId) ?? [];
        const ctxEdge = inEdges.find((e) => nodeMap.get(e.source)?.type === 'context');
        if (ctxEdge) {
          const ctxNode = nodeMap.get(ctxEdge.source)!;
          val = CONTEXT_VAR_SQL[ctxNode.data.variable] ?? `$.${ctxNode.data.variable}`;
        }
      }

      return `${col} ${op} ${val}`;
    }

    case 'logicGate': {
      const gateType = node.data.gateType ?? 'AND';
      const inEdges = incoming.get(nodeId) ?? [];
      if (inEdges.length === 0) return 'TRUE';
      const parts = inEdges.map((e) => buildExpr(e.source, nodeMap, incoming));
      return parts.length === 1 ? parts[0] : `(${parts.join(` ${gateType} `)})`;
    }

    case 'context': {
      return CONTEXT_VAR_SQL[node.data.variable] ?? `$.${node.data.variable}`;
    }

    case 'subquery': {
      const table = node.data.table || '?';
      const joinCol = node.data.joinColumn || 'id';
      return `EXISTS (SELECT 1 FROM ${table} WHERE ${joinCol} = ...)`;
    }

    case 'action': {
      const inEdges = incoming.get(nodeId) ?? [];
      if (inEdges.length === 0) return 'TRUE';
      if (inEdges.length === 1) return buildExpr(inEdges[0].source, nodeMap, incoming);
      const parts = inEdges.map((e) => buildExpr(e.source, nodeMap, incoming));
      return parts.join('\n  AND ');
    }

    default:
      return 'TRUE';
  }
}

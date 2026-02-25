import type {
  RlsPolicyDefinition,
  RlsNodeBase,
  RlsEdge,
  ConditionNodeData,
  LogicGateNodeData,
  ContextNodeData,
  ActionNodeData,
  SubqueryNodeData,
  RlsCommand,
} from './types';

// ─── Context variable mapping ────────────────────────────────────
// Maps visual builder context variables to Postgres expressions.
const CONTEXT_VAR_MAP: Record<string, string> = {
  current_user_id: "current_setting('app.current_user_id')::int",
  current_role: "current_setting('app.current_role')",
  current_hierarchy_path: "current_setting('app.current_hierarchy_path')",
};

interface CompileResult {
  /** The full CREATE POLICY SQL statement */
  sql: string;
  /** The WHERE clause expression only */
  expression: string;
  /** Enable RLS statement */
  enableRls: string;
  /** Drop existing policy statement */
  dropPolicy: string;
}

/**
 * Compile a visual RLS policy definition (nodes + edges) into Postgres SQL.
 *
 * Walks the graph from ActionNode backwards to build a WHERE expression tree.
 * The result is a complete set of SQL statements to enable RLS and create the policy.
 */
export function compileRlsPolicy(
  policyName: string,
  targetTable: string,
  command: RlsCommand,
  definition: RlsPolicyDefinition,
  roleName?: string
): CompileResult {
  const { nodes, edges } = definition;

  // Build lookup maps
  const nodeMap = new Map<string, RlsNodeBase>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  // Build reverse adjacency: target → sources
  const incomingEdges = new Map<string, RlsEdge[]>();
  for (const edge of edges) {
    const existing = incomingEdges.get(edge.target) ?? [];
    existing.push(edge);
    incomingEdges.set(edge.target, existing);
  }

  // Find the action node(s) — should be exactly one
  const actionNodes = nodes.filter((n) => n.type === 'action');
  if (actionNodes.length === 0) {
    throw new Error('No action node found in the policy definition');
  }

  // Build expression from the action node backwards
  const actionNode = actionNodes[0];
  const actionData = actionNode.data as unknown as ActionNodeData;
  const expression = buildExpression(actionNode.id, nodeMap, incomingEdges);

  // If action is DENY, negate the expression
  const finalExpression = actionData.action === 'DENY'
    ? `NOT (${expression})`
    : expression;

  // Sanitize the policy name for SQL
  const safePolicyName = policyName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  const safeTable = targetTable.replace(/[^a-zA-Z0-9_]/g, '');

  const commandClause = command === 'ALL' ? '' : `\n  FOR ${command}`;
  const roleClause = roleName ? `\n  TO ${roleName}` : '';

  const enableRls = `ALTER TABLE ${safeTable} ENABLE ROW LEVEL SECURITY;`;
  const dropPolicy = `DROP POLICY IF EXISTS "${safePolicyName}" ON ${safeTable};`;
  const sql = `CREATE POLICY "${safePolicyName}" ON ${safeTable}${commandClause}${roleClause}\n  USING (\n    ${finalExpression}\n  );`;

  return { sql, expression: finalExpression, enableRls, dropPolicy };
}

/**
 * Recursively build a SQL expression by walking backwards from a target node.
 */
function buildExpression(
  nodeId: string,
  nodeMap: Map<string, RlsNodeBase>,
  incomingEdges: Map<string, RlsEdge[]>
): string {
  const node = nodeMap.get(nodeId);
  if (!node) return 'TRUE';

  switch (node.type) {
    case 'condition':
      return buildConditionExpression(node, nodeMap, incomingEdges);

    case 'logicGate':
      return buildLogicGateExpression(node, nodeMap, incomingEdges);

    case 'context':
      return buildContextExpression(node);

    case 'subquery':
      return buildSubqueryExpression(node, nodeMap, incomingEdges);

    case 'action': {
      // Walk backwards from the action node
      const incoming = incomingEdges.get(nodeId) ?? [];
      if (incoming.length === 0) return 'TRUE';
      if (incoming.length === 1) {
        return buildExpression(incoming[0].source, nodeMap, incomingEdges);
      }
      // Multiple inputs to action — AND them together
      const parts = incoming.map((e) =>
        buildExpression(e.source, nodeMap, incomingEdges)
      );
      return parts.join('\n    AND ');
    }

    case 'table':
      // Table nodes are informational — pass through to their inputs
      return 'TRUE';

    default:
      return 'TRUE';
  }
}

function buildConditionExpression(
  node: RlsNodeBase,
  nodeMap: Map<string, RlsNodeBase>,
  incomingEdges: Map<string, RlsEdge[]>
): string {
  const data = node.data as unknown as ConditionNodeData;
  const column = sanitizeIdentifier(data.column);
  const operator = data.operator;

  // Resolve the value — either a literal or a reference to a context node
  let valueSql: string;

  if (data.valueRef) {
    // Reference to another node (typically a context node)
    const refNode = nodeMap.get(data.valueRef);
    if (refNode && refNode.type === 'context') {
      valueSql = buildContextExpression(refNode);
    } else {
      valueSql = buildExpression(data.valueRef, nodeMap, incomingEdges);
    }
  } else if (data.value !== undefined && data.value !== null) {
    valueSql = escapeLiteral(data.value);
  } else {
    // Check incoming edges for context node connections
    const incoming = incomingEdges.get(node.id) ?? [];
    const contextEdge = incoming.find((e) => {
      const sourceNode = nodeMap.get(e.source);
      return sourceNode?.type === 'context';
    });
    if (contextEdge) {
      valueSql = buildExpression(contextEdge.source, nodeMap, incomingEdges);
    } else {
      valueSql = 'NULL';
    }
  }

  // Handle operators that don't need a value
  if (operator === 'IS NULL') return `${column} IS NULL`;
  if (operator === 'IS NOT NULL') return `${column} IS NOT NULL`;

  return `${column} ${operator} ${valueSql}`;
}

function buildLogicGateExpression(
  node: RlsNodeBase,
  nodeMap: Map<string, RlsNodeBase>,
  incomingEdges: Map<string, RlsEdge[]>
): string {
  const data = node.data as unknown as LogicGateNodeData;
  const incoming = incomingEdges.get(node.id) ?? [];

  if (incoming.length === 0) return 'TRUE';
  if (incoming.length === 1) {
    return buildExpression(incoming[0].source, nodeMap, incomingEdges);
  }

  const operator = data.gateType === 'OR' ? 'OR' : 'AND';
  const parts = incoming.map((e) =>
    buildExpression(e.source, nodeMap, incomingEdges)
  );

  return `(${parts.join(`\n    ${operator} `)})`;
}

function buildContextExpression(node: RlsNodeBase): string {
  const data = node.data as unknown as ContextNodeData;
  const mapped = CONTEXT_VAR_MAP[data.variable];
  if (mapped) return mapped;
  // Custom variable — use current_setting
  return `current_setting('app.${sanitizeIdentifier(data.variable)}')`;
}

function buildSubqueryExpression(
  node: RlsNodeBase,
  nodeMap: Map<string, RlsNodeBase>,
  incomingEdges: Map<string, RlsEdge[]>
): string {
  const data = node.data as unknown as SubqueryNodeData;
  const safeTable = sanitizeIdentifier(data.table);
  const safeJoinColumn = sanitizeIdentifier(data.joinColumn);

  // Resolve condition from incoming nodes or use literal
  const incoming = incomingEdges.get(node.id) ?? [];
  let conditionSql = data.condition || 'TRUE';

  if (incoming.length > 0) {
    const parts = incoming.map((e) =>
      buildExpression(e.source, nodeMap, incomingEdges)
    );
    conditionSql = parts.join(' AND ');
  }

  return `EXISTS (SELECT 1 FROM ${safeTable} WHERE ${safeJoinColumn} = ${safeTable}.id AND ${conditionSql})`;
}

// ─── Helpers ─────────────────────────────────────────────────────

function sanitizeIdentifier(identifier: string): string {
  // Only allow alphanumeric, underscores, and dots (for schema.table)
  return identifier.replace(/[^a-zA-Z0-9_.]/g, '');
}

function escapeLiteral(value: string): string {
  // Escape single quotes for SQL literal
  if (/^\d+(\.\d+)?$/.test(value)) return value; // numeric
  if (value === 'true' || value === 'false') return value; // boolean
  return `'${value.replace(/'/g, "''")}'`;
}

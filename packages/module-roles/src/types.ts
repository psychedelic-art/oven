// ─── Hierarchy ───────────────────────────────────────────────────

export interface HierarchyNode {
  id: number;
  name: string;
  type: string;
  parentId: number | null;
  metadata: Record<string, unknown> | null;
  children?: HierarchyNode[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Roles ───────────────────────────────────────────────────────

export interface Role {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  hierarchyNodeId: number | null;
  isSystem: boolean;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Permissions ─────────────────────────────────────────────────

export interface Permission {
  id: number;
  resource: string;
  action: string;
  slug: string;
  description: string | null;
  createdAt: Date;
}

// ─── RLS Policy ──────────────────────────────────────────────────

export type RlsCommand = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
export type RlsPolicyStatus = 'draft' | 'applied' | 'disabled';

export interface RlsPolicy {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  targetTable: string;
  command: RlsCommand;
  definition: RlsPolicyDefinition;
  compiledSql: string | null;
  roleId: number | null;
  hierarchyNodeId: number | null;
  status: RlsPolicyStatus;
  version: number;
  enabled: boolean;
  appliedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── RLS Policy Definition (Visual Builder JSON) ─────────────────

export interface RlsNodePosition {
  x: number;
  y: number;
}

export type RlsNodeType =
  | 'table'
  | 'condition'
  | 'logicGate'
  | 'context'
  | 'action'
  | 'subquery';

export interface RlsNodeBase {
  id: string;
  type: RlsNodeType;
  position: RlsNodePosition;
  data: Record<string, unknown>;
}

export interface TableNodeData {
  tableName: string;
}

export interface ConditionNodeData {
  column: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'IN' | 'NOT IN' | 'IS NULL' | 'IS NOT NULL' | 'LIKE' | 'ILIKE';
  value?: string;
  valueRef?: string; // Reference to a context node ID
}

export interface LogicGateNodeData {
  gateType: 'AND' | 'OR';
}

export interface ContextNodeData {
  variable: 'current_user_id' | 'current_role' | 'current_hierarchy_path' | string;
  label?: string;
}

export interface ActionNodeData {
  action: 'ALLOW' | 'DENY';
}

export interface SubqueryNodeData {
  table: string;
  joinColumn: string;
  condition: string;
}

export interface RlsEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface RlsPolicyDefinition {
  nodes: RlsNodeBase[];
  edges: RlsEdge[];
}

// ─── API Endpoint ────────────────────────────────────────────────

export interface ApiEndpoint {
  module: string;
  route: string;
  method: string;
  permissionId: number | null;
  permissionSlug: string | null;
  isPublic: boolean;
}

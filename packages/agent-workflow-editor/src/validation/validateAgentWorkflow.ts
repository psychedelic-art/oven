import type { AgentFlowNode, AgentFlowEdge } from '../store/types';
import { getNodeType } from '../store/node-registry';

// ─── Validation Issue ───────────────────────────────────────

export type IssueSeverity = 'error' | 'warning';

export interface ValidationIssue {
  severity: IssueSeverity;
  nodeId?: string;
  field?: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
}

// ─── Validate Full Workflow ─────────────────────────────────

export function validateAgentWorkflow(
  nodes: AgentFlowNode[],
  edges: AgentFlowEdge[],
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Graph-level validations
  validateGraphStructure(nodes, edges, issues);

  // Node-level validations
  for (const node of nodes) {
    validateNode(node, edges, issues);
  }

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  return {
    valid: errorCount === 0,
    issues,
    errorCount,
    warningCount,
  };
}

// ─── Graph Structure Validation ─────────────────────────────

function validateGraphStructure(
  nodes: AgentFlowNode[],
  edges: AgentFlowEdge[],
  issues: ValidationIssue[],
): void {
  // Must have at least one node
  if (nodes.length === 0) {
    issues.push({ severity: 'error', message: 'Workflow has no nodes' });
    return;
  }

  // Must have at least one end node
  const endNodes = nodes.filter(n => n.data.nodeSlug === 'end');
  if (endNodes.length === 0) {
    issues.push({ severity: 'error', message: 'Workflow has no End node — execution will never complete' });
  }

  // Check for unreachable nodes
  const reachable = new Set<string>();
  const entryNode = nodes.sort((a, b) => a.position.y - b.position.y).find(n => n.data.nodeSlug !== 'end');
  if (entryNode) {
    findReachable(entryNode.id, edges, reachable);
    for (const node of nodes) {
      if (!reachable.has(node.id) && node.id !== entryNode.id) {
        issues.push({ severity: 'warning', nodeId: node.id, message: `Node "${node.data.label}" is unreachable from the entry node` });
      }
    }
  }

  // Check for nodes with no outgoing edges (except End)
  for (const node of nodes) {
    if (node.data.nodeSlug === 'end') continue;
    const outgoing = edges.filter(e => e.source === node.id);
    if (outgoing.length === 0) {
      issues.push({ severity: 'error', nodeId: node.id, message: `Node "${node.data.label}" has no outgoing connection` });
    }
  }

  // Check for nodes with no incoming edges (except entry)
  for (const node of nodes) {
    if (node.id === entryNode?.id) continue;
    const incoming = edges.filter(e => e.target === node.id);
    if (incoming.length === 0) {
      issues.push({ severity: 'warning', nodeId: node.id, message: `Node "${node.data.label}" has no incoming connection` });
    }
  }
}

// ─── Node-Level Validation ──────────────────────────────────

function validateNode(
  node: AgentFlowNode,
  edges: AgentFlowEdge[],
  issues: ValidationIssue[],
): void {
  const data = node.data;
  const nodeDef = getNodeType(data.nodeSlug);
  if (!nodeDef && data.nodeSlug !== 'end') {
    issues.push({ severity: 'error', nodeId: node.id, message: `Unknown node type: ${data.nodeSlug}` });
    return;
  }

  // Label required
  if (!data.label || data.label.trim() === '') {
    issues.push({ severity: 'error', nodeId: node.id, field: 'label', message: 'Node label is required' });
  }

  // Node-type-specific validations
  switch (data.nodeSlug) {
    case 'llm':
      // LLM should have a model or inherit from agent config
      break;

    case 'tool-executor':
      // Tool calls come from LLM output — check there's an LLM node upstream
      break;

    case 'condition':
      validateRequiredConfig(node, 'field', issues);
      validateRequiredConfig(node, 'operator', issues);
      // Condition should have at least 2 outgoing edges (true/false branches)
      const condEdges = edges.filter(e => e.source === node.id);
      if (condEdges.length < 2) {
        issues.push({ severity: 'warning', nodeId: node.id, message: 'Condition node should have at least 2 outgoing paths (true/false)' });
      }
      break;

    case 'rag':
      validateRequiredConfig(node, 'query', issues);
      break;

    case 'memory':
      validateRequiredConfig(node, 'mode', issues);
      if (data.config.mode === 'write') {
        validateRequiredConfig(node, 'content', issues);
      }
      if (data.config.mode === 'read') {
        if (!data.config.query && !data.config.key) {
          issues.push({ severity: 'warning', nodeId: node.id, message: 'Memory read should specify a query or key' });
        }
      }
      break;

    case 'human-review':
      if (!data.config.reason && !data.config.proposal) {
        issues.push({ severity: 'warning', nodeId: node.id, message: 'Human review should specify a reason or proposal' });
      }
      break;

    case 'subagent':
      validateRequiredConfig(node, 'agentSlug', issues);
      break;

    case 'prompt':
      validateRequiredConfig(node, 'template', issues);
      break;
  }
}

// ─── Config Validation Helper ───────────────────────────────

function validateRequiredConfig(
  node: AgentFlowNode,
  field: string,
  issues: ValidationIssue[],
): void {
  const value = node.data.config[field];
  if (value === undefined || value === null || value === '') {
    const nodeDef = getNodeType(node.data.nodeSlug);
    const fieldDef = nodeDef?.configFields.find(f => f.name === field);
    issues.push({
      severity: 'error',
      nodeId: node.id,
      field,
      message: `${fieldDef?.label ?? field} is required for ${node.data.label}`,
    });
  }
}

// ─── Reachability Helper ────────────────────────────────────

function findReachable(nodeId: string, edges: AgentFlowEdge[], visited: Set<string>): void {
  if (visited.has(nodeId)) return;
  visited.add(nodeId);
  const outgoing = edges.filter(e => e.source === nodeId);
  for (const edge of outgoing) {
    findReachable(edge.target, edges, visited);
  }
}

// ─── Get Issues for a Specific Node ─────────────────────────

export function getNodeIssues(nodeId: string, result: ValidationResult): ValidationIssue[] {
  return result.issues.filter(i => i.nodeId === nodeId);
}

// ─── Get Issues for a Specific Field ────────────────────────

export function getFieldError(nodeId: string, field: string, result: ValidationResult): string | undefined {
  const issue = result.issues.find(i => i.nodeId === nodeId && i.field === field && i.severity === 'error');
  return issue?.message;
}

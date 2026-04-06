import type { AgentFlowNode } from '../store/types';

// ─── Execution Status ───────────────────────────────────────

export type NodeExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused' | 'skipped';

export interface NodeExecutionData {
  nodeId: string;
  nodeType: string;
  status: NodeExecutionStatus;
  input?: unknown;
  output?: unknown;
  error?: string;
  durationMs?: number;
  startedAt?: string;
  completedAt?: string;
}

export interface ExecutionTrace {
  executionId: number;
  status: string;
  currentState: string;
  stepsExecuted: number;
  error?: string;
  nodeExecutions: NodeExecutionData[];
}

// ─── Status Styles ──────────────────────────────────────────

const STATUS_STYLES: Record<NodeExecutionStatus, { border: string; bg: string; badge: string }> = {
  completed: { border: '#4CAF50', bg: '#E8F5E9', badge: '✓' },
  running: { border: '#FF9800', bg: '#FFF3E0', badge: '⏳' },
  failed: { border: '#F44336', bg: '#FFEBEE', badge: '✕' },
  paused: { border: '#FFC107', bg: '#FFFDE7', badge: '⏸' },
  pending: { border: '#9E9E9E', bg: '#F5F5F5', badge: '○' },
  skipped: { border: '#BDBDBD', bg: '#FAFAFA', badge: '—' },
};

// ─── Apply Execution Overlay to Nodes ───────────────────────
// Enriches flow nodes with execution status data for visual display.

export function applyExecutionOverlay(
  nodes: AgentFlowNode[],
  trace: ExecutionTrace,
): AgentFlowNode[] {
  const execMap = new Map<string, NodeExecutionData>();
  for (const ne of trace.nodeExecutions) {
    execMap.set(ne.nodeId, ne);
  }

  return nodes.map(node => {
    const exec = execMap.get(node.id);
    if (!exec) return node;

    const style = STATUS_STYLES[exec.status] ?? STATUS_STYLES.pending;
    return {
      ...node,
      style: {
        border: `3px solid ${style.border}`,
        borderRadius: 10,
        background: style.bg,
      },
      data: {
        ...node.data,
        _executionStatus: exec.status,
        _executionBadge: style.badge,
        _executionDuration: exec.durationMs,
        _executionError: exec.error,
        _executionOutput: exec.output,
      },
    };
  });
}

// ─── Get Execution Order ────────────────────────────────────
// Returns node IDs in execution order based on startedAt timestamps.

export function getExecutionOrder(trace: ExecutionTrace): string[] {
  return [...trace.nodeExecutions]
    .sort((a, b) => {
      if (!a.startedAt || !b.startedAt) return 0;
      return new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
    })
    .map(ne => ne.nodeId);
}

// ─── Get Failed Nodes ───────────────────────────────────────

export function getFailedNodes(trace: ExecutionTrace): NodeExecutionData[] {
  return trace.nodeExecutions.filter(ne => ne.status === 'failed');
}

// ─── Get Execution Summary ──────────────────────────────────

export function getExecutionSummary(trace: ExecutionTrace): {
  totalNodes: number;
  completed: number;
  failed: number;
  totalDurationMs: number;
} {
  const completed = trace.nodeExecutions.filter(n => n.status === 'completed').length;
  const failed = trace.nodeExecutions.filter(n => n.status === 'failed').length;
  const totalDurationMs = trace.nodeExecutions.reduce((sum, n) => sum + (n.durationMs ?? 0), 0);
  return { totalNodes: trace.nodeExecutions.length, completed, failed, totalDurationMs };
}

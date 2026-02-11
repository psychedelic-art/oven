import React from 'react';
import type { Node } from '@xyflow/react';
import type { NodeExecutionDetail } from '@oven/module-workflows/types';

/**
 * Provides styling overrides for nodes based on execution status.
 * Applied to nodes when viewing a workflow execution.
 */

const statusStyles: Record<string, React.CSSProperties> = {
  completed: {
    boxShadow: '0 0 0 3px #4caf50',
  },
  running: {
    boxShadow: '0 0 0 3px #ff9800',
    animation: 'pulse 1.5s infinite',
  },
  failed: {
    boxShadow: '0 0 0 3px #ef4444',
  },
  skipped: {
    opacity: 0.4,
  },
  pending: {
    opacity: 0.6,
  },
};

/**
 * Given a list of node executions, returns a map of nodeId → CSS style overrides
 * to apply to the ReactFlow nodes for execution visualization.
 */
export function getExecutionStyles(
  nodeExecutions: NodeExecutionDetail[]
): Record<string, React.CSSProperties> {
  const styles: Record<string, React.CSSProperties> = {};

  for (const exec of nodeExecutions) {
    styles[exec.nodeId] = statusStyles[exec.status] ?? {};
  }

  return styles;
}

/**
 * Applies execution status to ReactFlow nodes for visualization.
 */
export function applyExecutionOverlay(
  nodes: Node[],
  nodeExecutions: NodeExecutionDetail[]
): Node[] {
  const execMap = new Map(nodeExecutions.map((e) => [e.nodeId, e]));

  return nodes.map((node) => {
    const exec = execMap.get(node.id);
    if (!exec) return node;

    const style = statusStyles[exec.status] ?? {};

    return {
      ...node,
      style: { ...node.style, ...style },
      data: {
        ...node.data,
        _executionStatus: exec.status,
        _executionDuration: exec.durationMs,
        _executionError: exec.error,
      },
    };
  });
}

import React, { useState, useEffect } from 'react';
import { Box, Typography, Chip, CircularProgress, Button, Collapse } from '@mui/material';
import { getExecutionSummary, getFailedNodes } from '../utils/execution-trace';
import type { ExecutionTrace, NodeExecutionData } from '../utils/execution-trace';

interface ExecutionTracePanelProps {
  workflowId: number;
  onLoadTrace: (trace: ExecutionTrace) => void;
  selectedNodeId?: string | null;
}

const statusColors: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  completed: 'success',
  failed: 'error',
  paused: 'warning',
  running: 'info',
  pending: 'default',
  cancelled: 'default',
};

export function ExecutionTracePanel({ workflowId, onLoadTrace, selectedNodeId }: ExecutionTracePanelProps) {
  const [executions, setExecutions] = useState<Array<{ id: number; status: string; stepsExecuted: number; startedAt: string; error?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [activeTrace, setActiveTrace] = useState<ExecutionTrace | null>(null);
  const [expandedNode, setExpandedNode] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/agent-workflow-executions?filter=${JSON.stringify({ workflowId })}&sort=["startedAt","DESC"]&range=[0,9]`)
      .then(res => res.json())
      .then(data => { setExecutions(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [workflowId]);

  const loadTrace = async (executionId: number) => {
    const res = await fetch(`/api/agent-workflow-executions/${executionId}`);
    if (!res.ok) return;
    const data = await res.json();
    const trace: ExecutionTrace = {
      executionId: data.id,
      status: data.status,
      currentState: data.currentState,
      stepsExecuted: data.stepsExecuted,
      error: data.error,
      nodeExecutions: data.nodeExecutions ?? [],
    };
    setActiveTrace(trace);
    onLoadTrace(trace);
  };

  // Auto-expand selected node's details
  useEffect(() => {
    if (selectedNodeId && activeTrace) setExpandedNode(selectedNodeId);
  }, [selectedNodeId, activeTrace]);

  if (loading) {
    return <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Box>;
  }

  const summary = activeTrace ? getExecutionSummary(activeTrace) : null;
  const failedNodes = activeTrace ? getFailedNodes(activeTrace) : [];
  const selectedExec = activeTrace?.nodeExecutions.find(n => n.nodeId === expandedNode);

  return (
    <Box sx={{ width: 320, borderLeft: 1, borderColor: 'divider', bgcolor: 'white', overflow: 'auto', height: '100%' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Execution Debug</Typography>
      </Box>

      {/* Execution list */}
      {!activeTrace && (
        <Box sx={{ p: 1 }}>
          {executions.length === 0 && (
            <Typography variant="body2" sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>No executions yet</Typography>
          )}
          {executions.map(exec => (
            <Box key={exec.id} sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider', cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' } }}
              onClick={() => loadTrace(exec.id)}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label={exec.status} size="small" color={statusColors[exec.status] ?? 'default'} />
                <Typography variant="caption">#{exec.id} · {exec.stepsExecuted} steps</Typography>
              </Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {new Date(exec.startedAt).toLocaleString()}
              </Typography>
              {exec.error && <Typography variant="caption" sx={{ color: 'error.main', display: 'block' }}>{exec.error.slice(0, 60)}</Typography>}
            </Box>
          ))}
        </Box>
      )}

      {/* Active trace details */}
      {activeTrace && (
        <>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Chip label={activeTrace.status} size="small" color={statusColors[activeTrace.status] ?? 'default'} />
              <Button size="small" onClick={() => setActiveTrace(null)} sx={{ fontSize: 11 }}>← Back</Button>
            </Box>
            {summary && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {summary.completed}/{summary.totalNodes} nodes · {summary.totalDurationMs}ms total
                {summary.failed > 0 && <span style={{ color: '#F44336' }}> · {summary.failed} failed</span>}
              </Typography>
            )}
            {activeTrace.error && (
              <Box sx={{ mt: 1, p: 1, bgcolor: 'error.light', color: 'error.contrastText', borderRadius: 1, fontSize: 11, fontFamily: 'monospace' }}>
                {activeTrace.error}
              </Box>
            )}
          </Box>

          {/* Node execution timeline */}
          {activeTrace.nodeExecutions.map(ne => (
            <Box key={ne.nodeId}
              sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider', cursor: 'pointer',
                bgcolor: expandedNode === ne.nodeId ? 'blue.50' : 'transparent',
                '&:hover': { bgcolor: 'grey.50' } }}
              onClick={() => setExpandedNode(expandedNode === ne.nodeId ? null : ne.nodeId)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label={ne.status} size="small" color={statusColors[ne.status] ?? 'default'}
                  sx={{ fontSize: 10, height: 20 }} />
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 500 }}>
                  {ne.nodeId}
                </Typography>
                {ne.durationMs !== undefined && (
                  <Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>{ne.durationMs}ms</Typography>
                )}
              </Box>

              <Collapse in={expandedNode === ne.nodeId}>
                <Box sx={{ mt: 1, fontSize: 11 }}>
                  {ne.error && (
                    <Box sx={{ p: 1, mb: 1, bgcolor: 'error.light', color: 'error.contrastText', borderRadius: 1, fontFamily: 'monospace' }}>
                      {ne.error}
                    </Box>
                  )}
                  {ne.output && (
                    <Box sx={{ p: 1, bgcolor: 'grey.100', borderRadius: 1, fontFamily: 'monospace', maxHeight: 150, overflow: 'auto' }}>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {JSON.stringify(ne.output, null, 2)}
                      </pre>
                    </Box>
                  )}
                </Box>
              </Collapse>
            </Box>
          ))}
        </>
      )}
    </Box>
  );
}

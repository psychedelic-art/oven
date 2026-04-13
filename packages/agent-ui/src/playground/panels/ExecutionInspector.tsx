'use client';

import { useState } from 'react';
import { cn } from '@oven/oven-ui';
import type { PlaygroundMode } from '../TargetSelector';
import type { UIMessage } from '../../types';

// ─── Types ──────────────────────────────────────────────────

export interface WorkflowExecutionDetail {
  executionId: number;
  status: string;
  stepsExecuted: number;
  timestamp?: Date;
  nodes: Array<{
    nodeId: string;
    nodeType: string;
    status: string;
    durationMs?: number;
    error?: string;
    output?: unknown;
  }>;
}

export interface ExecutionInspectorProps {
  mode: PlaygroundMode;
  messages: UIMessage[];
  workflowExecution?: WorkflowExecutionDetail | null;
  /** Multi-run execution history (newest first). Shown when provided. */
  executionHistory?: WorkflowExecutionDetail[];
  className?: string;
}

// ─── Status Badge ───────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'text-xs font-medium px-1.5 py-0.5 rounded',
      status === 'completed' ? 'bg-green-100 text-green-700' :
      status === 'failed' ? 'bg-red-100 text-red-700' :
      status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
      'bg-gray-100 text-gray-700',
    )}>
      {status}
    </span>
  );
}

// ─── Node Trace (reusable for current + history) ────────────

function NodeTrace({
  nodes,
  expandedId,
  onToggle,
}: {
  nodes: WorkflowExecutionDetail['nodes'];
  expandedId: string | number | null;
  onToggle: (id: string) => void;
}) {
  return (
    <>
      {nodes.map((node, i) => (
        <button
          key={node.nodeId}
          type="button"
          onClick={() => onToggle(node.nodeId)}
          className={cn(
            'w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-gray-50',
            expandedId === node.nodeId && 'bg-blue-50',
          )}
        >
          <div className={cn('flex items-center gap-2')}>
            <span className={cn('text-xs font-mono text-gray-600')}>#{i + 1}</span>
            <span className={cn(
              'w-2 h-2 rounded-full',
              node.status === 'completed' ? 'bg-green-400' :
              node.status === 'failed' ? 'bg-red-400' :
              node.status === 'paused' ? 'bg-yellow-400' : 'bg-gray-400',
            )} />
            <span className={cn('text-xs font-medium')}>{node.nodeId}</span>
            <span className={cn('text-[10px] text-gray-400 bg-gray-100 px-1 rounded')}>{node.nodeType}</span>
            {node.durationMs && <span className={cn('text-xs text-gray-400 ml-auto')}>{node.durationMs}ms</span>}
          </div>

          {node.error && (
            <p className={cn('text-xs text-red-500 mt-0.5')}>{node.error}</p>
          )}

          {expandedId === node.nodeId && node.output && (
            <pre className={cn('mt-2 text-[10px] text-gray-500 bg-gray-100 rounded p-1.5 overflow-x-auto max-h-32')}>
              {JSON.stringify(node.output, null, 2)}
            </pre>
          )}
        </button>
      ))}
    </>
  );
}

// ─── Execution Inspector ────────────────────────────────────

export function ExecutionInspector({
  mode,
  messages,
  workflowExecution,
  executionHistory,
  className,
}: ExecutionInspectorProps) {
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const [expandedExecId, setExpandedExecId] = useState<number | null>(null);

  const handleToggle = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className={cn('px-3 py-2 border-b bg-gray-50')}>
        <h3 className={cn('text-xs font-semibold text-gray-500 uppercase tracking-wider')}>
          {mode === 'agent' ? 'Message Inspector' : 'Execution Trace'}
        </h3>
      </div>

      <div className={cn('flex-1 overflow-y-auto')}>
        {/* Agent Mode: Message-level inspection */}
        {mode === 'agent' && messages.map(msg => (
          <button
            key={msg.id}
            type="button"
            onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
            className={cn(
              'w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-gray-50',
              expandedId === msg.id && 'bg-blue-50',
            )}
          >
            <div className={cn('flex items-center gap-2')}>
              <span className={cn(
                'w-2 h-2 rounded-full',
                msg.role === 'user' ? 'bg-blue-400' : msg.role === 'assistant' ? 'bg-green-400' : 'bg-gray-400',
              )} />
              <span className={cn('text-xs font-medium text-gray-700')}>{msg.role}</span>
              <span className={cn('text-xs text-gray-400 ml-auto')}>
                {msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <p className={cn('text-xs text-gray-500 mt-0.5 line-clamp-1')}>{msg.content.slice(0, 80)}</p>

            {expandedId === msg.id && (
              <div className={cn('mt-2 space-y-1')}>
                {msg.parts?.filter(p => p.type === 'tool-call').map((p, i) => (
                  <div key={i} className={cn('text-xs bg-gray-100 rounded p-1.5 font-mono')}>
                    {p.toolName} -- {p.status} {p.durationMs ? `(${p.durationMs}ms)` : ''}
                  </div>
                ))}
                {msg.metadata && (
                  <pre className={cn('text-[10px] text-gray-400 bg-gray-100 rounded p-1.5 overflow-x-auto')}>
                    {JSON.stringify(msg.metadata, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </button>
        ))}

        {/* Workflow Mode: Current execution trace */}
        {mode === 'workflow' && workflowExecution && (
          <div>
            <div className={cn('px-3 py-2 bg-blue-50 border-b')}>
              <div className={cn('flex items-center gap-2')}>
                <span className={cn('text-[10px] font-semibold uppercase text-blue-600')}>Current</span>
                <StatusBadge status={workflowExecution.status} />
                <span className={cn('text-xs text-gray-400')}>
                  {workflowExecution.stepsExecuted} steps
                </span>
                <span className={cn('text-[10px] text-gray-400 ml-auto')}>
                  #{workflowExecution.executionId}
                </span>
              </div>
            </div>
            <NodeTrace
              nodes={workflowExecution.nodes}
              expandedId={expandedId}
              onToggle={handleToggle}
            />
          </div>
        )}

        {/* Workflow Mode: Execution history (past runs) */}
        {mode === 'workflow' && executionHistory && executionHistory.length > 0 && (
          <div>
            <div className={cn('px-3 py-2 bg-gray-50 border-b border-t')}>
              <span className={cn('text-[10px] font-semibold uppercase text-gray-500')}>
                History ({executionHistory.length} run{executionHistory.length !== 1 ? 's' : ''})
              </span>
            </div>
            {executionHistory.map(exec => (
              <div key={exec.executionId}>
                <button
                  type="button"
                  onClick={() => setExpandedExecId(
                    expandedExecId === exec.executionId ? null : exec.executionId,
                  )}
                  className={cn(
                    'w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-gray-50',
                    expandedExecId === exec.executionId && 'bg-gray-100',
                  )}
                >
                  <div className={cn('flex items-center gap-2')}>
                    <span className={cn('text-[10px] font-mono text-gray-400')}>#{exec.executionId}</span>
                    <StatusBadge status={exec.status} />
                    <span className={cn('text-xs text-gray-400')}>
                      {exec.stepsExecuted} steps
                    </span>
                    {exec.timestamp && (
                      <span className={cn('text-[10px] text-gray-400 ml-auto')}>
                        {exec.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    <span className={cn(
                      'text-[10px] transition-transform',
                      expandedExecId === exec.executionId ? 'rotate-90' : '',
                    )}>
                      ▸
                    </span>
                  </div>
                </button>
                {expandedExecId === exec.executionId && (
                  <NodeTrace
                    nodes={exec.nodes}
                    expandedId={expandedId}
                    onToggle={handleToggle}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {mode === 'workflow' && !workflowExecution && (!executionHistory || executionHistory.length === 0) && (
          <p className={cn('text-xs text-gray-400 text-center py-8')}>
            Execute a workflow to see the trace
          </p>
        )}

        {mode === 'agent' && messages.length === 0 && (
          <p className={cn('text-xs text-gray-400 text-center py-8')}>
            Send a message to inspect execution
          </p>
        )}
      </div>
    </div>
  );
}

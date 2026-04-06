'use client';

import { cn } from '@oven/oven-ui';
import type { PlaygroundTarget } from '../TargetSelector';

interface TracePanelProps {
  target: PlaygroundTarget | null;
  traceUrl: string | null;
  tracingEnabled: boolean;
  workflowExecution?: {
    executionId: number;
    status: string;
    stepsExecuted: number;
    nodes: Array<{ nodeId: string; nodeType: string; status: string; durationMs?: number; error?: string }>;
  } | null;
  className?: string;
}

export function TracePanel({ target, traceUrl, tracingEnabled, workflowExecution, className }: TracePanelProps) {
  const totalDuration = workflowExecution?.nodes.reduce((sum, n) => sum + (n.durationMs ?? 0), 0) ?? 0;
  const completedNodes = workflowExecution?.nodes.filter(n => n.status === 'completed').length ?? 0;
  const failedNodes = workflowExecution?.nodes.filter(n => n.status === 'failed').length ?? 0;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className={cn('px-3 py-2 border-b bg-gray-50')}>
        <h3 className={cn('text-xs font-semibold text-gray-500 uppercase tracking-wider')}>Trace</h3>
      </div>

      {/* LangSmith Connection Status */}
      <div className={cn('px-3 py-2 border-b flex items-center gap-2')}>
        <span className={cn(
          'w-2 h-2 rounded-full',
          tracingEnabled ? 'bg-green-400' : 'bg-gray-300',
        )} />
        <span className={cn('text-xs text-gray-600')}>
          LangSmith: {tracingEnabled ? 'Connected' : 'Not configured'}
        </span>
      </div>

      {/* LangSmith Link */}
      {traceUrl && (
        <div className={cn('p-3 border-b')}>
          <a
            href={traceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'block w-full py-2 px-3 rounded text-xs font-medium text-center text-white',
              'bg-purple-600 hover:bg-purple-700 transition-colors',
            )}
          >
            🔍 View in LangSmith →
          </a>
        </div>
      )}

      {/* Local Execution Summary */}
      {workflowExecution && (
        <>
          <div className={cn('grid grid-cols-3 gap-1 p-3 border-b')}>
            <div className={cn('text-center')}>
              <p className={cn('text-sm font-bold text-gray-700')}>{workflowExecution.stepsExecuted}</p>
              <p className={cn('text-[10px] text-gray-400')}>Steps</p>
            </div>
            <div className={cn('text-center')}>
              <p className={cn('text-sm font-bold', completedNodes > 0 ? 'text-green-600' : 'text-gray-400')}>
                {completedNodes}/{workflowExecution.nodes.length}
              </p>
              <p className={cn('text-[10px] text-gray-400')}>Completed</p>
            </div>
            <div className={cn('text-center')}>
              <p className={cn('text-sm font-bold text-gray-600')}>{totalDuration}ms</p>
              <p className={cn('text-[10px] text-gray-400')}>Total Time</p>
            </div>
          </div>

          {/* Node Timeline */}
          <div className={cn('flex-1 overflow-y-auto')}>
            {workflowExecution.nodes.map((node, i) => (
              <div key={node.nodeId} className={cn('px-3 py-1.5 border-b border-gray-100')}>
                <div className={cn('flex items-center gap-2')}>
                  <span className={cn('text-[10px] text-gray-400 w-4')}>{i + 1}</span>
                  <span className={cn(
                    'w-2 h-2 rounded-full',
                    node.status === 'completed' ? 'bg-green-400' :
                    node.status === 'failed' ? 'bg-red-400' : 'bg-gray-300',
                  )} />
                  <span className={cn('text-xs font-medium text-gray-700')}>{node.nodeId}</span>
                  <span className={cn('text-[10px] text-gray-400 bg-gray-100 px-1 rounded')}>{node.nodeType}</span>
                  {node.durationMs && <span className={cn('text-[10px] text-gray-400 ml-auto')}>{node.durationMs}ms</span>}
                </div>
                {node.error && (
                  <p className={cn('text-[10px] text-red-500 ml-6 mt-0.5')}>{node.error}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {!workflowExecution && !traceUrl && (
        <div className={cn('flex-1 flex items-center justify-center')}>
          <p className={cn('text-xs text-gray-400 text-center')}>
            {target ? 'Execute a workflow to see trace data' : 'Select a target first'}
          </p>
        </div>
      )}

      {!tracingEnabled && (
        <div className={cn('p-3 border-t bg-gray-50')}>
          <p className={cn('text-[10px] text-gray-400')}>
            Set <code className={cn('bg-gray-200 px-1 rounded')}>LANGSMITH_API_KEY</code> to enable tracing
          </p>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { cn } from '@oven/oven-ui';
import type { ToolCallCardProps } from '../types';

const statusStyles: Record<string, string> = {
  success: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
};

export function ToolCallCard({ toolName, input, output, status = 'success', durationMs, className }: ToolCallCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={cn('rounded-lg border border-gray-200 text-sm my-1', className)}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn('flex items-center justify-between w-full px-3 py-2 text-left hover:bg-gray-50')}
      >
        <span className={cn('font-mono text-xs font-medium')}>{toolName}</span>
        <div className={cn('flex items-center gap-2')}>
          {durationMs !== undefined && (
            <span className={cn('text-xs text-gray-400')}>{durationMs}ms</span>
          )}
          <span className={cn('text-xs px-1.5 py-0.5 rounded', statusStyles[status] ?? statusStyles.success)}>
            {status}
          </span>
          <span className={cn('text-xs text-gray-400')}>{isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>
      {isExpanded && (
        <div className={cn('border-t border-gray-200 px-3 py-2 space-y-2')}>
          {input !== undefined && (
            <div>
              <p className={cn('text-xs font-medium text-gray-500 mb-1')}>Input</p>
              <pre className={cn('bg-gray-900 text-gray-100 text-xs font-mono p-2 rounded overflow-x-auto')}>
                {JSON.stringify(input, null, 2)}
              </pre>
            </div>
          )}
          {output !== undefined && (
            <div>
              <p className={cn('text-xs font-medium text-gray-500 mb-1')}>Output</p>
              <pre className={cn('bg-gray-900 text-gray-100 text-xs font-mono p-2 rounded overflow-x-auto')}>
                {JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

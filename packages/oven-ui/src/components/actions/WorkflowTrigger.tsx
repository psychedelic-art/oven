'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface WorkflowTriggerProps {
  label: string;
  workflowSlug: string;
  inputMapping?: Record<string, string>;
  onResult?: (result: unknown) => void;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const variantStyles: Record<string, string> = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 border-transparent',
  secondary:
    'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 border-transparent',
};

export function WorkflowTrigger({
  label,
  workflowSlug,
  inputMapping,
  onResult,
  variant = 'primary',
  loading = false,
  disabled = false,
  className,
  children,
}: WorkflowTriggerProps) {
  const handleClick = () => {
    // The actual workflow invocation is handled by the renderer layer
    // via useWorkflowAction hook. This component just provides the
    // UI trigger and calls onResult so the parent can coordinate.
    onResult?.({ workflowSlug, inputMapping });
  };

  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={handleClick}
      data-workflow-slug={workflowSlug}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        variantStyles[variant],
        className
      )}
    >
      {loading && (
        <svg
          className="h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children ?? label}
    </button>
  );
}

export default WorkflowTrigger;

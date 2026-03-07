'use client';

import { useState, useCallback } from 'react';
import type { FormContext } from '../types';
import { resolveParams } from './useFormContext';

// ─── useWorkflowAction ──────────────────────────────────────────
// Hook for invoking workflows from form components.
// Resolves $.path input mappings from form context, posts to workflow API.

interface UseWorkflowActionResult {
  /** Execute the workflow */
  execute: (overrideParams?: Record<string, unknown>) => Promise<unknown>;
  /** Whether the workflow is currently executing */
  loading: boolean;
  /** Result from the last execution */
  result: unknown | null;
  /** Error from the last execution */
  error: string | null;
  /** Reset state */
  reset: () => void;
}

interface UseWorkflowActionOptions {
  /** Workflow slug to invoke */
  workflowSlug: string;
  /** $.path mappings from form context → workflow payload */
  inputMapping?: Record<string, string>;
  /** Form context for $.path resolution */
  context: FormContext;
  /** Callback on successful completion */
  onSuccess?: (result: unknown) => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

export function useWorkflowAction({
  workflowSlug,
  inputMapping,
  context,
  onSuccess,
  onError,
}: UseWorkflowActionOptions): UseWorkflowActionResult {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown | null>(null);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (overrideParams?: Record<string, unknown>) => {
    setLoading(true);
    setError(null);

    try {
      // Resolve $.path mappings from form context
      const resolvedPayload = resolveParams(inputMapping, context);

      // Merge with any override params
      const payload = { ...resolvedPayload, ...overrideParams };

      const response = await fetch(`/api/workflows/${workflowSlug}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Workflow execution failed: ${response.status}`);
      }

      const data = await response.json();

      setResult(data);

      // Store workflow result in form context
      context.setWorkflowResult(workflowSlug, data);

      onSuccess?.(data);
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Workflow execution failed';
      setError(errorMsg);
      onError?.(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [workflowSlug, inputMapping, context, onSuccess, onError]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return { execute, loading, result, error, reset };
}

export default useWorkflowAction;

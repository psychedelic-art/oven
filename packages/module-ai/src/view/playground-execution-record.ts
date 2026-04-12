/**
 * Typed record shape + pure helpers for `ai_playground_executions` rows
 * as rendered by the OVEN dashboard AI resource pages. Lives in
 * `@oven/module-ai` (which owns the `aiPlaygroundExecutions` drizzle
 * schema) rather than in `apps/dashboard` so the helpers can be
 * unit-tested from the existing `packages/module-ai` vitest suite.
 *
 * F-06-06 + F-06-07 (oven-bug-sprint sprint-06-rule-compliance):
 * extracted from `PlaygroundExecutionShow.tsx` (6 record: any casts)
 * and `PlaygroundExecutionList.tsx` (3 record: any casts) so all
 * FunctionField call sites can be typed against a real interface.
 *
 * Mirrors the drizzle table definition in
 * `packages/module-ai/src/schema.ts` (`aiPlaygroundExecutions`).
 */

import type { ModelType } from '../types';

/**
 * Known execution status values for playground executions.
 */
export type PlaygroundExecutionStatus = 'completed' | 'failed';

/**
 * Subset of the `ai_playground_executions` row shape that the dashboard
 * list / show views actually read. Fields are optional because
 * react-admin can pass momentarily-partial records during refetch.
 *
 * The permissive `[key: string]: unknown` index signature keeps this
 * interface assignable to
 * `FunctionField<RecordType extends Record<string, any>>`.
 */
export interface PlaygroundExecutionRecord {
  id: number;
  tenantId?: number | null;
  type?: ModelType | string;
  model?: string;
  input?: unknown;
  output?: { url?: string; [key: string]: unknown } | unknown;
  status?: PlaygroundExecutionStatus | string;
  tokenUsage?: { input?: number; output?: number; total?: number } | null;
  costCents?: number | null;
  latencyMs?: number | null;
  error?: string | null;
  createdAt?: string | Date;
  [key: string]: unknown;
}

/**
 * Colour map for execution status -> MUI Chip colour.
 */
export const EXECUTION_STATUS_COLORS: Record<
  PlaygroundExecutionStatus,
  'success' | 'error'
> = {
  completed: 'success',
  failed: 'error',
};

/**
 * Colour map for execution type -> MUI Chip colour.
 */
export const EXECUTION_TYPE_COLORS: Record<string, 'primary' | 'secondary' | 'info' | 'warning'> = {
  text: 'primary',
  embedding: 'secondary',
  image: 'info',
  'structured-output': 'warning',
};

/**
 * Resolve execution status to an MUI Chip colour. Returns `'default'`
 * for unknown / missing values.
 *
 * Uses `Object.prototype.hasOwnProperty.call()` to defend against
 * prototype-chain keys.
 */
export function resolveStatusColor(
  status: string | undefined | null,
): 'success' | 'error' | 'default' {
  if (!status) return 'default';
  if (!Object.prototype.hasOwnProperty.call(EXECUTION_STATUS_COLORS, status)) {
    return 'default';
  }
  return EXECUTION_STATUS_COLORS[status as PlaygroundExecutionStatus];
}

/**
 * Resolve execution type to an MUI Chip colour. Returns `'default'`
 * for unknown / missing values.
 *
 * Uses `Object.prototype.hasOwnProperty.call()` to defend against
 * prototype-chain keys.
 */
export function resolveTypeColor(
  type: string | undefined | null,
): 'primary' | 'secondary' | 'info' | 'warning' | 'default' {
  if (!type) return 'default';
  if (!Object.prototype.hasOwnProperty.call(EXECUTION_TYPE_COLORS, type)) {
    return 'default';
  }
  return EXECUTION_TYPE_COLORS[type];
}

/**
 * Format cost cents to a dollar string. Returns `'-'` when the value
 * is null or undefined.
 */
export function formatCostCents(
  costCents: number | null | undefined,
): string {
  if (costCents == null) return '-';
  return `$${(costCents / 100).toFixed(2)}`;
}

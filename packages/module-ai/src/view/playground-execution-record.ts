/**
 * Typed record shape + pure helpers for `ai_playground_executions` rows
 * as rendered by the OVEN dashboard AI resource pages.
 *
 * F-06-06 / F-06-07 (oven-bug-sprint sprint-06-rule-compliance):
 * extracted from `apps/dashboard/src/components/ai/
 * PlaygroundExecutionShow.tsx` and `PlaygroundExecutionList.tsx` so the
 * `FunctionField render={(record: any) => ...}` call sites can be typed
 * against a real interface.
 *
 * Mirrors the drizzle table `aiPlaygroundExecutions` in
 * `packages/module-ai/src/schema.ts`.
 */

/**
 * Known playground execution types. New types added server-side will
 * still display (via the `| string` union on the record field).
 */
export type PlaygroundExecutionType =
  | 'text'
  | 'embedding'
  | 'image'
  | 'structured-output';

/**
 * Known playground execution statuses.
 */
export type PlaygroundExecutionStatus = 'completed' | 'failed';

/**
 * Subset of the `ai_playground_executions` row shape that the dashboard
 * list / show views actually read. All fields besides `id` are optional
 * because react-admin can pass a momentarily-partial record during
 * refetch or pagination.
 *
 * The `[key: string]: unknown` index signature keeps this interface
 * assignable to `FunctionField<RecordType extends Record<string, any>>`.
 */
export interface PlaygroundExecutionRecord {
  id: number;
  tenantId?: number | null;
  type?: PlaygroundExecutionType | string;
  model?: string | null;
  input?: unknown;
  output?: { url?: string; [key: string]: unknown } | null;
  status?: PlaygroundExecutionStatus | string;
  tokenUsage?: Record<string, unknown> | null;
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
 * Resolve a (possibly unknown / missing) status string to a MUI Chip
 * colour. Returns `'default'` for unknown values.
 */
export function resolveExecutionStatusColor(
  status: string | undefined | null,
): 'success' | 'error' | 'default' {
  if (!status) return 'default';
  if (
    !Object.prototype.hasOwnProperty.call(EXECUTION_STATUS_COLORS, status)
  ) {
    return 'default';
  }
  return EXECUTION_STATUS_COLORS[status as PlaygroundExecutionStatus];
}

/**
 * Colour map for execution type -> MUI Chip colour.
 */
export const EXECUTION_TYPE_COLORS: Record<
  PlaygroundExecutionType,
  'primary' | 'secondary' | 'info' | 'warning'
> = {
  text: 'primary',
  embedding: 'secondary',
  image: 'info',
  'structured-output': 'warning',
};

/**
 * Resolve a (possibly unknown / missing) type string to a MUI Chip
 * colour. Returns `'default'` for unknown values.
 */
export function resolveExecutionTypeColor(
  type: string | undefined | null,
): 'primary' | 'secondary' | 'info' | 'warning' | 'default' {
  if (!type) return 'default';
  if (!Object.prototype.hasOwnProperty.call(EXECUTION_TYPE_COLORS, type)) {
    return 'default';
  }
  return EXECUTION_TYPE_COLORS[type as PlaygroundExecutionType];
}

/**
 * Format a cost-in-cents value for display. Returns `'-'` for
 * `null` / `undefined`, otherwise a dollar string with two decimals.
 */
export function formatCostCents(
  costCents: number | null | undefined,
): string {
  if (costCents == null) return '-';
  return `$${(costCents / 100).toFixed(2)}`;
}

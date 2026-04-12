/**
 * Typed record shape + pure helpers for `ai_guardrails` rows as
 * rendered by the OVEN dashboard AI resource pages. Lives in
 * `@oven/module-ai` (which owns the `aiGuardrails` drizzle schema)
 * rather than in `apps/dashboard` so the helpers can be unit-tested
 * from the existing `packages/module-ai` vitest suite without
 * inventing a dashboard-local test runner.
 *
 * F-06-01 (oven-bug-sprint sprint-06-rule-compliance): extracted from
 * `apps/dashboard/src/components/ai/GuardrailList.tsx` so the four
 * `FunctionField render={(record: any) => ...}` call sites can be
 * typed against a real interface and the `CLAUDE.md` "no `record:
 * any`" rule is enforced.
 *
 * Mirrors the drizzle table definition in
 * `packages/module-ai/src/schema.ts` (`aiGuardrails`). Kept
 * structurally compatible with react-admin's
 * `FunctionField<RecordType extends Record<string, any>>` generic so
 * a callsite can simply write `<FunctionField<GuardrailRecord>
 * render={(record) => ...}/>` and narrow `record` from `any` to this
 * interface.
 */

import type {
  GuardrailAction,
  GuardrailRuleType,
  GuardrailScope,
} from '../types';

/**
 * Subset of the `ai_guardrails` row shape that the dashboard list /
 * show views actually read. All fields are marked optional because
 * react-admin's `<Datagrid>` can pass a momentarily-partial record
 * during refetch or pagination; the helpers below tolerate missing
 * values.
 *
 * The permissive `[key: string]: unknown` index signature keeps this
 * interface assignable to
 * `FunctionField<RecordType extends Record<string, any>>` — it
 * widens the accepted record bag at the react-admin boundary without
 * loosening the typed fields the dashboard reads.
 */
export interface GuardrailRecord {
  id: number;
  tenantId?: number | null;
  name?: string;
  ruleType?: GuardrailRuleType | string;
  pattern?: string;
  scope?: GuardrailScope | string;
  action?: GuardrailAction | string;
  message?: string | null;
  priority?: number;
  enabled?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  [key: string]: unknown;
}

/**
 * Colour map for {@link GuardrailAction} → MUI Chip colour. `default`
 * is the fallback for any action the server hands back that this
 * client doesn't recognise yet (forward compatibility for new
 * guardrail action types the backend introduces before the frontend
 * bumps).
 */
export const GUARDRAIL_ACTION_COLORS: Record<
  GuardrailAction,
  'error' | 'warning' | 'info'
> = {
  block: 'error',
  warn: 'warning',
  modify: 'info',
};

/**
 * Resolve a (possibly unknown / missing) action string to a MUI Chip
 * colour. Pure function — safe to unit-test. Returns `'default'` for
 * `undefined`, `null`, empty string, or any value outside
 * {@link GUARDRAIL_ACTION_COLORS}.
 *
 * Uses `Object.prototype.hasOwnProperty.call()` to defend against
 * prototype-chain keys like `hasOwnProperty`, `toString`, or
 * `__proto__`. Without this guard an attacker who can influence the
 * `action` field (via the database or a forged row) would coax the
 * lookup into returning an inherited `Object.prototype` function,
 * which the dashboard would then pass straight to `<Chip color>`.
 */
export function resolveGuardrailActionColor(
  action: string | undefined | null,
): 'error' | 'warning' | 'info' | 'default' {
  if (!action) return 'default';
  if (!Object.prototype.hasOwnProperty.call(GUARDRAIL_ACTION_COLORS, action)) {
    return 'default';
  }
  return GUARDRAIL_ACTION_COLORS[action as GuardrailAction];
}

/**
 * Maximum number of characters of a guardrail pattern shown inline in
 * the list view before the rest is replaced by an ellipsis. The list
 * view renders the pattern in a monospace Typography at 12px — keeping
 * this short prevents the pattern column from blowing out the datagrid
 * on long regexes.
 */
export const GUARDRAIL_PATTERN_TRUNCATE_AT = 40;

/**
 * Truncate a guardrail pattern for the list view. Returns `null` if
 * the pattern is missing / empty so the caller can render a `-`
 * placeholder without its own emptiness check.
 *
 * - `undefined`, `null`, `''` → `null`
 * - length ≤ {@link GUARDRAIL_PATTERN_TRUNCATE_AT} → returned verbatim
 * - longer → `<first N chars>...` (ASCII ellipsis, no unicode)
 *
 * Pure function — safe to unit-test. Kept here rather than inlined in
 * `GuardrailList.tsx` so F-06-01 regression tests can pin the exact
 * truncation + ellipsis behaviour without mounting react-admin.
 */
export function truncateGuardrailPattern(
  pattern: string | undefined | null,
): string | null {
  if (pattern === undefined || pattern === null || pattern === '') {
    return null;
  }
  if (pattern.length <= GUARDRAIL_PATTERN_TRUNCATE_AT) {
    return pattern;
  }
  return `${pattern.slice(0, GUARDRAIL_PATTERN_TRUNCATE_AT)}...`;
}

/**
 * Typed record shape + pure helpers for `ai_vector_stores` rows as
 * rendered by the OVEN dashboard AI resource pages. Lives in
 * `@oven/module-ai` (which owns the `aiVectorStores` drizzle schema)
 * rather than in `apps/dashboard` so the helpers can be unit-tested
 * from the existing `packages/module-ai` vitest suite without
 * inventing a dashboard-local test runner.
 *
 * F-06-02 + F-06-03 (oven-bug-sprint sprint-06-rule-compliance):
 * extracted from `apps/dashboard/src/components/ai/VectorStoreShow.tsx`
 * and `VectorStoreList.tsx` so the `FunctionField render={(record:
 * any) => ...}` call sites can be typed against a real interface.
 *
 * Mirrors the drizzle table definition in
 * `packages/module-ai/src/schema.ts` (`aiVectorStores`). Kept
 * structurally compatible with react-admin's
 * `FunctionField<RecordType extends Record<string, any>>` generic.
 */

import type { VectorStoreAdapter, DistanceMetric } from '../types';

/**
 * Subset of the `ai_vector_stores` row shape that the dashboard list /
 * show views actually read. All fields are marked optional because
 * react-admin's `<Datagrid>` can pass a momentarily-partial record
 * during refetch or pagination; the helpers below tolerate missing
 * values.
 *
 * The permissive `[key: string]: unknown` index signature keeps this
 * interface assignable to
 * `FunctionField<RecordType extends Record<string, any>>`.
 */
export interface VectorStoreRecord {
  id: number;
  tenantId?: number;
  name?: string;
  slug?: string;
  adapter?: VectorStoreAdapter | string;
  connectionConfig?: Record<string, unknown> | null;
  embeddingModel?: string;
  dimensions?: number;
  distanceMetric?: DistanceMetric | string;
  documentCount?: number;
  enabled?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  [key: string]: unknown;
}

/**
 * Colour map for {@link VectorStoreAdapter} -> MUI Chip colour.
 * `'default'` is the fallback for any adapter the server hands back
 * that this client doesn't recognise yet.
 */
export const VECTOR_STORE_ADAPTER_COLORS: Record<
  VectorStoreAdapter,
  'primary' | 'success'
> = {
  pgvector: 'primary',
  pinecone: 'success',
};

/**
 * Resolve a (possibly unknown / missing) adapter string to a MUI Chip
 * colour. Pure function — safe to unit-test. Returns `'default'` for
 * `undefined`, `null`, empty string, or any value outside
 * {@link VECTOR_STORE_ADAPTER_COLORS}.
 *
 * Uses `Object.prototype.hasOwnProperty.call()` to defend against
 * prototype-chain keys.
 */
export function resolveAdapterColor(
  adapter: string | undefined | null,
): 'primary' | 'success' | 'default' {
  if (!adapter) return 'default';
  if (!Object.prototype.hasOwnProperty.call(VECTOR_STORE_ADAPTER_COLORS, adapter)) {
    return 'default';
  }
  return VECTOR_STORE_ADAPTER_COLORS[adapter as VectorStoreAdapter];
}

/**
 * Typed record shape + pure helpers for `ai_vector_stores` rows as
 * rendered by the OVEN dashboard AI resource pages.
 *
 * F-06-02 / F-06-03 (oven-bug-sprint sprint-06-rule-compliance):
 * extracted from `apps/dashboard/src/components/ai/VectorStoreShow.tsx`
 * and `VectorStoreList.tsx` so the `FunctionField render={(record: any)
 * => ...}` call sites can be typed against a real interface.
 *
 * Mirrors the drizzle table `aiVectorStores` in
 * `packages/module-ai/src/schema.ts`.
 */

import type { VectorStoreAdapter } from '../types';

/**
 * Subset of the `ai_vector_stores` row shape that the dashboard list /
 * show views actually read. All fields besides `id` are optional
 * because react-admin can pass a momentarily-partial record during
 * refetch or pagination.
 *
 * The `[key: string]: unknown` index signature keeps this interface
 * assignable to `FunctionField<RecordType extends Record<string, any>>`.
 */
export interface VectorStoreRecord {
  id: number;
  tenantId?: number;
  name?: string;
  slug?: string;
  adapter?: VectorStoreAdapter | string;
  connectionConfig?: Record<string, unknown> | null;
  embeddingProviderId?: number | null;
  embeddingModel?: string | null;
  dimensions?: number;
  distanceMetric?: string;
  documentCount?: number;
  enabled?: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  [key: string]: unknown;
}

/**
 * Colour map for {@link VectorStoreAdapter} -> MUI Chip colour.
 * `'default'` is the fallback for any adapter the server returns that
 * this client does not recognise yet.
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
 * colour. Pure function. Returns `'default'` for `undefined`, `null`,
 * empty string, or any value not in {@link VECTOR_STORE_ADAPTER_COLORS}.
 *
 * Uses `Object.prototype.hasOwnProperty.call()` to guard against
 * prototype-chain keys.
 */
export function resolveAdapterColor(
  adapter: string | undefined | null,
): 'primary' | 'success' | 'default' {
  if (!adapter) return 'default';
  if (
    !Object.prototype.hasOwnProperty.call(
      VECTOR_STORE_ADAPTER_COLORS,
      adapter,
    )
  ) {
    return 'default';
  }
  return VECTOR_STORE_ADAPTER_COLORS[adapter as VectorStoreAdapter];
}

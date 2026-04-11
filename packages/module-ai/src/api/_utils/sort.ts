import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';

/**
 * Result of resolving a user-supplied sort field against an allowlist.
 * `ok = false` means the caller must surface a 400 to the client.
 */
export type SortResolution =
  | { ok: true; column: PgColumn }
  | { ok: false; allowed: readonly string[]; received: string };

/**
 * Resolve a user-supplied sort field against an explicit allowlist of
 * columns on a Drizzle table. Centralises the whitelist lookup that
 * used to be written inline as `(table as any)[params.sort] ?? table.id`
 * in every AI handler (see `oven-bug-sprint/sprint-05-handler-typesafety`
 * findings F-05-01 and F-05-02).
 *
 * Package-private on purpose. The helper MUST NOT be exported from
 * `packages/module-ai/src/index.ts` — other modules should copy the
 * pattern, not import from `module-ai`'s internals. Enforced by BO
 * rule IP-4 in sprint-05.
 */
export function getOrderColumn<T extends PgTable>(
  table: T,
  field: string,
  allowed: readonly (keyof T)[],
): SortResolution {
  if (!(allowed as readonly string[]).includes(field)) {
    return { ok: false, allowed: allowed as readonly string[], received: field };
  }
  const column = (table as Record<string, unknown>)[field];
  if (column === undefined || column === null) {
    // Defence-in-depth: allowlist says the field is valid but the table
    // does not actually expose it. Treat as an allowlist violation so
    // the client sees a 400 instead of a 500 from Drizzle.
    return { ok: false, allowed: allowed as readonly string[], received: field };
  }
  return { ok: true, column: column as PgColumn };
}

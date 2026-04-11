/**
 * Compute the billing cycle string for a given instant.
 *
 * Format: `YYYY-MM` (e.g., `"2026-04"`), matching the existing
 * `sub_usage_records.billingCycle` column encoding.
 *
 * @param now - Optional instant. Defaults to `new Date()`. Accepted as a
 *              parameter so unit tests can pin a deterministic instant
 *              without mocking the global `Date`. Mirrors the pattern
 *              used by `@oven/module-tenants` `computeBusinessHours`.
 * @returns A `YYYY-MM` string in UTC.
 *
 * Pure: no I/O, no side effects, no reliance on host timezone (the
 * `UTC` versions of getFullYear/getMonth are used so the billing
 * cycle is stable across a multi-region deployment).
 */
export function computeBillingCycle(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

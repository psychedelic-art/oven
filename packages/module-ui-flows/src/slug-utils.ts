/**
 * Slug normalization utilities for UI Flow portal routing.
 *
 * The home page uses an empty string "" in the database, but since Next.js
 * dynamic route segments (`[pageSlug]`) cannot be empty, we use a sentinel
 * value `_home` in URL paths.
 */

/** Sentinel value representing the portal home page in URL paths. */
export const HOME_PAGE_SENTINEL = '_home';

/**
 * Normalize a page slug by stripping leading/trailing slashes and
 * collapsing double slashes. Returns "" for the home page.
 */
export function normalizePageSlug(slug: string | null | undefined): string {
  if (!slug) return '';
  let normalized = slug.replace(/^\/+|\/+$/g, '').replace(/\/\/+/g, '/');
  if (normalized === HOME_PAGE_SENTINEL) return '';
  return normalized;
}

/**
 * Convert a page slug to its URL-safe transport form.
 * Empty slug (home page) becomes the sentinel value `_home`.
 */
export function pageSlugToUrlSegment(slug: string): string {
  const normalized = normalizePageSlug(slug);
  return normalized === '' ? HOME_PAGE_SENTINEL : normalized;
}

/**
 * Convert a URL segment back to a page slug.
 * The sentinel `_home` becomes an empty string (home page).
 */
export function urlSegmentToPageSlug(segment: string): string {
  return segment === HOME_PAGE_SENTINEL ? '' : normalizePageSlug(segment);
}

/**
 * Normalize a flow slug (the base identifier). Flow slugs should not
 * have leading/trailing slashes.
 */
export function normalizeFlowSlug(slug: string): string {
  return slug.replace(/^\/+|\/+$/g, '').replace(/\/\/+/g, '/');
}

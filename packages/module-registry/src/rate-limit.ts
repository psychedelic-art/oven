/**
 * In-memory rate limiter for auth endpoints.
 *
 * Uses a sliding-window counter keyed by a caller-supplied string.
 * Designed for single-process deployments; swap the store for Redis
 * when horizontal scaling is needed.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  /** Maximum number of requests allowed within the window. */
  maxRequests: number;
  /** Window duration in seconds. */
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Check and consume a rate-limit token for the given key.
 *
 * @param key   Unique identifier for the caller (e.g. `ip:email`).
 * @param config  Rate limit configuration.
 * @returns Whether the request is allowed, remaining tokens, and reset time.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // Window expired or first request — start fresh
  if (!entry || now >= entry.resetAt) {
    const resetAt = now + config.windowSeconds * 1000;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt };
  }

  // Within window
  if (entry.count < config.maxRequests) {
    entry.count += 1;
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }

  // Over limit
  return {
    allowed: false,
    remaining: 0,
    resetAt: entry.resetAt,
  };
}

/**
 * Reset the rate-limit state for a specific key.
 * Useful in tests or after a successful action (e.g. password reset).
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/**
 * Clear all rate-limit entries. Test-only.
 */
export function clearAllRateLimits(): void {
  store.clear();
}

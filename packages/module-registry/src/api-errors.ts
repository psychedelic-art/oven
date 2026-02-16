import { NextResponse } from 'next/server';
import type { RouteHandler } from './types';

// ──────────────────────────────────────────────
// Error Match Result
// ──────────────────────────────────────────────

/**
 * Result of a successful error match.
 * The matcher returns this when it recognizes the error.
 */
export interface ErrorMatchResult {
  status: number;
  body: { error: string; code?: string; detail?: unknown };
}

// ──────────────────────────────────────────────
// Error Matcher Interface
// ──────────────────────────────────────────────

/**
 * A single error matcher in the Chain of Responsibility.
 * Returns an ErrorMatchResult if it handles this error, or null to pass to the next.
 *
 * Priority: lower numbers are checked first.
 *   - Module-specific matchers: 0–99
 *   - Default matchers: 100–900
 */
export interface ErrorMatcher {
  /** Human-readable name for logging/debugging */
  name: string;
  /** Priority: lower = checked first */
  priority: number;
  /** Return a match result or null to skip */
  match(error: unknown): ErrorMatchResult | null;
}

// ──────────────────────────────────────────────
// Error Matcher Registry (Chain of Responsibility)
// ──────────────────────────────────────────────

class ErrorMatcherRegistry {
  private matchers: ErrorMatcher[] = [];

  /** Register a single matcher. Re-sorts by priority. */
  register(matcher: ErrorMatcher): void {
    this.matchers.push(matcher);
    this.matchers.sort((a, b) => a.priority - b.priority);
  }

  /** Register multiple matchers at once. */
  registerMany(matchers: ErrorMatcher[]): void {
    for (const m of matchers) this.register(m);
  }

  /**
   * Walk the chain. First matcher that returns non-null wins.
   * If no matcher handles it, returns a generic 500.
   */
  resolve(error: unknown): ErrorMatchResult {
    for (const matcher of this.matchers) {
      const result = matcher.match(error);
      if (result) return result;
    }
    // Fallback: generic 500
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return { status: 500, body: { error: message } };
  }
}

/** Global singleton error matcher registry. */
export const errorMatchers = new ErrorMatcherRegistry();

// ──────────────────────────────────────────────
// Type Guard: Postgres Errors
// ──────────────────────────────────────────────

/**
 * Postgres/Neon errors surface a 5-digit string `code` property.
 */
function isPostgresError(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as any).code === 'string' &&
    /^\d{5}$/.test((error as any).code)
  );
}

// ──────────────────────────────────────────────
// Default Matchers
// ──────────────────────────────────────────────

/** Postgres: Unique violation (23505) → 409 Conflict */
const uniqueViolationMatcher: ErrorMatcher = {
  name: 'postgres:unique_violation',
  priority: 100,
  match(error: unknown): ErrorMatchResult | null {
    if (!isPostgresError(error) || error.code !== '23505') return null;
    const detail = (error as any).detail ?? '';
    const field = detail.match(/Key \((.+?)\)/)?.[1] ?? 'unknown';
    return {
      status: 409,
      body: {
        error: `A record with this ${field} already exists`,
        code: 'UNIQUE_VIOLATION',
        detail: { constraint: (error as any).constraint, field },
      },
    };
  },
};

/** Postgres: Foreign key violation (23503) → 422 */
const foreignKeyViolationMatcher: ErrorMatcher = {
  name: 'postgres:foreign_key_violation',
  priority: 110,
  match(error: unknown): ErrorMatchResult | null {
    if (!isPostgresError(error) || error.code !== '23503') return null;
    const detail = (error as any).detail ?? '';
    const table = detail.match(/table "(.+?)"/)?.[1] ?? 'unknown';
    return {
      status: 422,
      body: {
        error: `Referenced record not found in ${table}`,
        code: 'FOREIGN_KEY_VIOLATION',
        detail: { constraint: (error as any).constraint, table },
      },
    };
  },
};

/** Postgres: Not-null violation (23502) → 400 */
const notNullViolationMatcher: ErrorMatcher = {
  name: 'postgres:not_null_violation',
  priority: 120,
  match(error: unknown): ErrorMatchResult | null {
    if (!isPostgresError(error) || error.code !== '23502') return null;
    const column = (error as any).column ?? 'unknown';
    return {
      status: 400,
      body: {
        error: `Missing required field: ${column}`,
        code: 'NOT_NULL_VIOLATION',
        detail: { column },
      },
    };
  },
};

/** JSON parse error → 400 */
const jsonParseMatcher: ErrorMatcher = {
  name: 'json:parse_error',
  priority: 200,
  match(error: unknown): ErrorMatchResult | null {
    if (
      !(error instanceof SyntaxError) ||
      !error.message.includes('JSON')
    )
      return null;
    return {
      status: 400,
      body: { error: 'Invalid JSON in request body', code: 'INVALID_JSON' },
    };
  },
};

// Register defaults
errorMatchers.registerMany([
  uniqueViolationMatcher,
  foreignKeyViolationMatcher,
  notNullViolationMatcher,
  jsonParseMatcher,
]);

// ──────────────────────────────────────────────
// Handler Wrapper
// ──────────────────────────────────────────────

/**
 * Wraps a Next.js App Router handler with error catching + matching.
 *
 * Usage in handler file:
 *   export const GET = withHandler(async (req, ctx) => { ... });
 *   export const POST = withHandler(async (req, ctx) => { ... });
 *
 * With extra per-route matchers:
 *   export const POST = withHandler(async (req, ctx) => { ... }, [myMatcher]);
 */
export function withHandler(
  handler: RouteHandler,
  localMatchers?: ErrorMatcher[]
): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (error: unknown) {
      // Check local (per-route) matchers first
      if (localMatchers) {
        for (const m of localMatchers) {
          const result = m.match(error);
          if (result) {
            return NextResponse.json(result.body, { status: result.status });
          }
        }
      }
      // Fall through to global registry
      const result = errorMatchers.resolve(error);
      // Log 500s for debugging (non-500s are "expected" errors)
      if (result.status >= 500) {
        console.error('[API Error]', error);
      }
      return NextResponse.json(result.body, { status: result.status });
    }
  };
}

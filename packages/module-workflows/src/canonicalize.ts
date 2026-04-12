/**
 * Canonicalize a workflow definition for structural comparison.
 *
 * Sorts all object keys recursively and strips insignificant whitespace
 * so that `JSON.stringify(canonicalize(a)) === JSON.stringify(canonicalize(b))`
 * holds whenever `a` and `b` are structurally identical.
 *
 * @see docs/modules/todo/oven-bug-sprint/sprint-03-workflow-engine.md F-03-01
 */
export function canonicalize(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }

  // Strings: trim insignificant whitespace (collapse runs of whitespace
  // inside string values that aren't meaningful for comparison).
  // We only trim leading/trailing — internal whitespace in user-authored
  // descriptions is intentional.
  if (typeof value === 'string') {
    return value.trim();
  }

  return value;
}

/**
 * Compare two values structurally after canonicalization.
 * Returns true if they are structurally equal.
 */
export function structurallyEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(canonicalize(a)) === JSON.stringify(canonicalize(b));
}

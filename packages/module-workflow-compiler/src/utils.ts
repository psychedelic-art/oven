import type { WorkflowDefinition, WorkflowStateDefinition } from '@oven/module-workflows/types';

/**
 * Topologically sort states by dependency order.
 * Returns state names in execution order (parents before children).
 */
export function topologicalSortStates(definition: WorkflowDefinition): string[] {
  const states = definition.states;
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialize
  for (const name of Object.keys(states)) {
    graph.set(name, []);
    inDegree.set(name, 0);
  }

  // Build adjacency from transitions
  for (const [name, state] of Object.entries(states)) {
    const targets = getStateTargets(state);
    for (const target of targets) {
      if (states[target]) {
        const children = graph.get(name) ?? [];
        children.push(target);
        graph.set(name, children);
        inDegree.set(target, (inDegree.get(target) ?? 0) + 1);
      }
    }
  }

  // Kahn's algorithm
  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  // Ensure initial state is first
  const initialIdx = queue.indexOf(definition.initial);
  if (initialIdx > 0) {
    queue.splice(initialIdx, 1);
    queue.unshift(definition.initial);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    sorted.push(id);
    for (const child of graph.get(id) ?? []) {
      const newDegree = (inDegree.get(child) ?? 1) - 1;
      inDegree.set(child, newDegree);
      if (newDegree === 0) queue.push(child);
    }
  }

  // Add any remaining states not reached (disconnected)
  for (const name of Object.keys(states)) {
    if (!sorted.includes(name)) sorted.push(name);
  }

  return sorted;
}

/**
 * Get all target state names referenced by a state definition.
 */
function getStateTargets(state: WorkflowStateDefinition): string[] {
  const targets: string[] = [];

  if (state.invoke) {
    if (state.invoke.onDone) {
      targets.push(
        typeof state.invoke.onDone === 'string' ? state.invoke.onDone : state.invoke.onDone.target
      );
    }
    if (state.invoke.onError) {
      targets.push(
        typeof state.invoke.onError === 'string' ? state.invoke.onError : state.invoke.onError.target
      );
    }
  }

  if (state.always) {
    const transitions = Array.isArray(state.always) ? state.always : [state.always];
    for (const t of transitions) {
      targets.push(t.target);
    }
  }

  if (state.on) {
    for (const transition of Object.values(state.on)) {
      if (Array.isArray(transition)) {
        for (const t of transition) targets.push(t.target);
      } else {
        targets.push(transition.target);
      }
    }
  }

  return targets;
}

/**
 * Make a state name safe for use as a JS variable name.
 */
export function sanitizeIdentifier(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^(\d)/, '_$1')
    .replace(/_+/g, '_');
}

/**
 * Convert a $.path expression into a JS property access.
 * e.g. "$.player.id" → "context.player?.id" or "context['player']?.['id']"
 */
export function resolvePathToJs(expr: unknown): string {
  if (typeof expr !== 'string') return JSON.stringify(expr);
  if (!expr.startsWith('$.')) return JSON.stringify(expr);

  const segments = expr.slice(2).split('.');
  let result = 'context';
  for (const seg of segments) {
    // Use bracket notation for segments with special chars
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(seg)) {
      result += `?.${seg}`;
    } else {
      result += `?.['${seg}']`;
    }
  }
  return result;
}

/**
 * Build a JS object literal string from an input mapping.
 */
export function buildInputObject(input: Record<string, unknown>): string {
  const entries = Object.entries(input).map(([key, value]) => {
    const resolved = resolvePathToJs(value);
    return `    ${sanitizeIdentifier(key)}: ${resolved}`;
  });
  return `{\n${entries.join(',\n')}\n  }`;
}

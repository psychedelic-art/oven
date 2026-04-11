// ─── Workflow Diff ──────────────────────────────────────────
// Compares two workflow definitions to identify structural changes.

export interface DiffResult {
  addedNodes: string[];
  removedNodes: string[];
  modifiedNodes: Array<{ nodeId: string; changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> }>;
  addedEdges: Array<{ from: string; to: string }>;
  removedEdges: Array<{ from: string; to: string }>;
  hasChanges: boolean;
}

interface Definition {
  states: Record<string, unknown>;
  [key: string]: unknown;
}

export function diffWorkflows(
  oldDef: Definition,
  newDef: Definition,
): DiffResult {
  const oldStates = Object.keys(oldDef.states ?? {});
  const newStates = Object.keys(newDef.states ?? {});

  const addedNodes = newStates.filter(s => !oldStates.includes(s));
  const removedNodes = oldStates.filter(s => !newStates.includes(s));
  const commonNodes = oldStates.filter(s => newStates.includes(s));

  // Find modified nodes
  const modifiedNodes: DiffResult['modifiedNodes'] = [];
  for (const nodeId of commonNodes) {
    const oldState = oldDef.states[nodeId] as Record<string, unknown>;
    const newState = newDef.states[nodeId] as Record<string, unknown>;
    const changes = compareStateObjects(oldState, newState);
    if (changes.length > 0) {
      modifiedNodes.push({ nodeId, changes });
    }
  }

  // Edge diff
  const oldEdges = extractEdges(oldDef);
  const newEdges = extractEdges(newDef);
  const addedEdges = newEdges.filter(e => !oldEdges.some(o => o.from === e.from && o.to === e.to));
  const removedEdges = oldEdges.filter(e => !newEdges.some(n => n.from === e.from && n.to === e.to));

  const hasChanges = addedNodes.length > 0 || removedNodes.length > 0 || modifiedNodes.length > 0 ||
    addedEdges.length > 0 || removedEdges.length > 0;

  return { addedNodes, removedNodes, modifiedNodes, addedEdges, removedEdges, hasChanges };
}

function compareStateObjects(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
  const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  for (const key of allKeys) {
    const oldVal = JSON.stringify(oldObj[key]);
    const newVal = JSON.stringify(newObj[key]);
    if (oldVal !== newVal) {
      changes.push({ field: key, oldValue: oldObj[key], newValue: newObj[key] });
    }
  }
  return changes;
}

function extractEdges(def: Definition): Array<{ from: string; to: string }> {
  const edges: Array<{ from: string; to: string }> = [];
  for (const [stateName, stateRaw] of Object.entries(def.states ?? {})) {
    const state = stateRaw as Record<string, unknown>;
    const invoke = state.invoke as Record<string, unknown> | undefined;
    if (invoke?.onDone) {
      const target = typeof invoke.onDone === 'string' ? invoke.onDone : (invoke.onDone as Record<string, unknown>).target as string;
      if (target) edges.push({ from: stateName, to: target });
    }
    if (invoke?.onError) {
      edges.push({ from: stateName, to: invoke.onError as string });
    }
  }
  return edges;
}

// ─── Format Diff Summary ────────────────────────────────────

export function formatDiffSummary(diff: DiffResult): string {
  const parts: string[] = [];
  if (diff.addedNodes.length > 0) parts.push(`+${diff.addedNodes.length} nodes`);
  if (diff.removedNodes.length > 0) parts.push(`-${diff.removedNodes.length} nodes`);
  if (diff.modifiedNodes.length > 0) parts.push(`~${diff.modifiedNodes.length} modified`);
  if (diff.addedEdges.length > 0) parts.push(`+${diff.addedEdges.length} edges`);
  if (diff.removedEdges.length > 0) parts.push(`-${diff.removedEdges.length} edges`);
  return parts.length > 0 ? parts.join(', ') : 'No changes';
}

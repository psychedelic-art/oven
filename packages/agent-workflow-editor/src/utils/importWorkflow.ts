import type { ExportedWorkflow } from './exportWorkflow';

// ─── Import Validation ──────────────────────────────────────

export interface ImportResult {
  valid: boolean;
  workflow: ExportedWorkflow['workflow'] | null;
  errors: string[];
  warnings: string[];
}

export function importWorkflow(json: string): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { valid: false, workflow: null, errors: ['Invalid JSON format'], warnings: [] };
  }

  const data = parsed as Record<string, unknown>;

  // Check for export format
  if (data.version === '1.0' && data.workflow) {
    return validateWorkflowData(data.workflow as Record<string, unknown>);
  }

  // Try as raw definition (backwards compat)
  if (data.definition || data.states) {
    const def = data.states ? data : { definition: data };
    return validateWorkflowData({
      name: (data.name as string) ?? 'Imported Workflow',
      slug: (data.slug as string) ?? `imported-${Date.now()}`,
      description: null,
      category: null,
      tags: null,
      definition: (def.definition ?? data) as Record<string, unknown>,
      agentConfig: (data.agentConfig as Record<string, unknown>) ?? null,
      memoryConfig: null,
    });
  }

  return { valid: false, workflow: null, errors: ['Unrecognized workflow format'], warnings: [] };
}

function validateWorkflowData(data: Record<string, unknown>): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!data.name) errors.push('Missing workflow name');
  if (!data.definition) errors.push('Missing workflow definition');

  const def = data.definition as Record<string, unknown>;
  if (def) {
    if (!def.initial) errors.push('Definition missing initial state');
    if (!def.states || Object.keys(def.states as Record<string, unknown>).length === 0) {
      errors.push('Definition has no states');
    }

    // Check for end node
    const states = (def.states ?? {}) as Record<string, Record<string, unknown>>;
    const hasEnd = Object.values(states).some(s => s.type === 'final');
    if (!hasEnd) warnings.push('Definition has no final/end state');

    // Check node types
    for (const [name, state] of Object.entries(states)) {
      const invoke = state.invoke as Record<string, unknown> | undefined;
      if (invoke?.src) {
        const validSlugs = ['llm', 'tool-executor', 'condition', 'transform', 'rag', 'memory', 'human-review', 'subagent', 'prompt'];
        if (!validSlugs.includes(invoke.src as string)) {
          warnings.push(`Node "${name}" uses unknown type: ${invoke.src}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    workflow: errors.length === 0 ? {
      name: data.name as string,
      slug: (data.slug as string) ?? `imported-${Date.now()}`,
      description: (data.description as string) ?? null,
      category: (data.category as string) ?? null,
      tags: (data.tags as string[]) ?? null,
      definition: data.definition as Record<string, unknown>,
      agentConfig: (data.agentConfig as Record<string, unknown>) ?? null,
      memoryConfig: (data.memoryConfig as Record<string, unknown>) ?? null,
    } : null,
    errors,
    warnings,
  };
}

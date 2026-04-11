// ─── Export Workflow ─────────────────────────────────────────

export interface ExportedWorkflow {
  version: '1.0';
  exportedAt: string;
  workflow: {
    name: string;
    slug: string;
    description: string | null;
    category: string | null;
    tags: string[] | null;
    definition: Record<string, unknown>;
    agentConfig: Record<string, unknown> | null;
    memoryConfig: Record<string, unknown> | null;
  };
}

export function exportWorkflow(workflow: Record<string, unknown>): ExportedWorkflow {
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    workflow: {
      name: workflow.name as string,
      slug: workflow.slug as string,
      description: (workflow.description as string) ?? null,
      category: (workflow.category as string) ?? null,
      tags: (workflow.tags as string[]) ?? null,
      definition: workflow.definition as Record<string, unknown>,
      agentConfig: (workflow.agentConfig as Record<string, unknown>) ?? null,
      memoryConfig: (workflow.memoryConfig as Record<string, unknown>) ?? null,
    },
  };
}

export function downloadWorkflowJSON(workflow: Record<string, unknown>): void {
  const exported = exportWorkflow(workflow);
  const json = JSON.stringify(exported, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `workflow-${exported.workflow.slug}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

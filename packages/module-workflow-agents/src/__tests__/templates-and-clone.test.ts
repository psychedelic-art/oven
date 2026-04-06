import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Template Tests ─────────────────────────────────────────

describe('Built-in Templates', () => {
  it('exports 8 templates', async () => {
    const { builtinTemplates } = await import('@oven/agent-workflow-editor');
    expect(builtinTemplates).toHaveLength(8);
  }, 15000);

  it('each template has required metadata', async () => {
    const { builtinTemplates } = await import('@oven/agent-workflow-editor');
    for (const t of builtinTemplates) {
      expect(t.slug).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.category).toBeTruthy();
      expect(t.icon).toBeTruthy();
      expect(t.difficulty).toBeTruthy();
      expect(t.nodeCount).toBeGreaterThan(0);
      expect(t.definition).toBeDefined();
      expect((t.definition as Record<string, unknown>).initial).toBeTruthy();
      expect((t.definition as Record<string, unknown>).states).toBeDefined();
    }
  });

  it('each template has valid definition structure', async () => {
    const { builtinTemplates } = await import('@oven/agent-workflow-editor');
    for (const t of builtinTemplates) {
      const def = t.definition as Record<string, unknown>;
      const states = def.states as Record<string, unknown>;
      expect(Object.keys(states).length).toBeGreaterThanOrEqual(2); // At least one node + end
      // Check initial state exists
      expect(states[def.initial as string]).toBeDefined();
      // Check has a final state
      const hasFinal = Object.values(states).some((s: unknown) => (s as Record<string, unknown>).type === 'final');
      expect(hasFinal).toBe(true);
    }
  });

  it('getTemplateBySlug returns correct template', async () => {
    const { getTemplateBySlug } = await import('@oven/agent-workflow-editor');
    const rag = getTemplateBySlug('rag-assistant');
    expect(rag).toBeDefined();
    expect(rag!.name).toBe('RAG Assistant');
  });

  it('getTemplatesByCategory groups correctly', async () => {
    const { getTemplatesByCategory } = await import('@oven/agent-workflow-editor');
    const grouped = getTemplatesByCategory();
    expect(grouped['assistant']).toBeDefined();
    expect(grouped['assistant'].length).toBeGreaterThan(0);
  });
});

// ─── Import/Export Tests ────────────────────────────────────

describe('Import/Export', () => {
  it('exportWorkflow produces valid structure', async () => {
    const { exportWorkflow } = await import('@oven/agent-workflow-editor');
    const exported = exportWorkflow({
      name: 'Test', slug: 'test', description: 'A test',
      definition: { id: 'test', initial: 's', states: { s: { type: 'final' } } },
      agentConfig: { model: 'fast' },
    });
    expect(exported.version).toBe('1.0');
    expect(exported.exportedAt).toBeTruthy();
    expect(exported.workflow.name).toBe('Test');
    expect(exported.workflow.definition).toBeDefined();
  });

  it('importWorkflow parses valid exported JSON', async () => {
    const { importWorkflow } = await import('@oven/agent-workflow-editor');
    const json = JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      workflow: {
        name: 'Imported', slug: 'imported', description: null, category: null, tags: null,
        definition: { id: 'imp', initial: 'start', states: { start: { invoke: { src: 'llm', onDone: 'end' } }, end: { type: 'final' } } },
        agentConfig: null, memoryConfig: null,
      },
    });
    const result = importWorkflow(json);
    expect(result.valid).toBe(true);
    expect(result.workflow).not.toBeNull();
    expect(result.workflow!.name).toBe('Imported');
  });

  it('importWorkflow rejects invalid JSON', async () => {
    const { importWorkflow } = await import('@oven/agent-workflow-editor');
    const result = importWorkflow('not valid json');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid JSON format');
  });

  it('importWorkflow rejects definition without states', async () => {
    const { importWorkflow } = await import('@oven/agent-workflow-editor');
    const result = importWorkflow(JSON.stringify({
      version: '1.0', exportedAt: '', workflow: { name: 'Bad', definition: { initial: 's', states: {} } },
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('no states'))).toBe(true);
  });
});

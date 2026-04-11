import { describe, it, expect, vi, beforeEach } from 'vitest';

let selectResult: unknown[] = [];

vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => Promise.resolve(selectResult)),
          limit: vi.fn(() => Promise.resolve(selectResult)),
        })),
        orderBy: vi.fn(() => Promise.resolve(selectResult)),
      })),
    })),
  })),
}));

vi.mock('@oven/module-registry', () => ({
  eventBus: { emit: vi.fn().mockResolvedValue(undefined) },
}));

import {
  buildSystemPrompt,
  buildPromptSection,
} from '../engine/prompt-builder';

describe('PromptBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResult = [];
  });

  describe('buildPromptSection()', () => {
    it('creates a section with name, content, and priority', () => {
      const section = buildPromptSection('base', 'You are a helpful assistant.', 1);
      expect(section.name).toBe('base');
      expect(section.content).toBe('You are a helpful assistant.');
      expect(section.priority).toBe(1);
    });
  });

  describe('buildSystemPrompt()', () => {
    it('returns base prompt when no agent config', async () => {
      const prompt = await buildSystemPrompt({});
      expect(prompt).toContain('helpful');
    });

    it('includes agent instructions when provided', async () => {
      const prompt = await buildSystemPrompt({
        agentSystemPrompt: 'You are a dental clinic assistant.',
      });
      expect(prompt).toContain('dental clinic');
    });

    it('includes command descriptions when commands exist', async () => {
      selectResult = [
        { id: 1, slug: 'help', description: 'Show help', enabled: true, name: 'Help' },
      ];
      const prompt = await buildSystemPrompt({ includeCommands: true });
      expect(prompt).toContain('/help');
    });

    it('includes skill descriptions when skills exist', async () => {
      selectResult = [
        { id: 1, slug: 'summarize', description: 'Summarize content', name: 'Summarize', enabled: true },
      ];
      const prompt = await buildSystemPrompt({ includeSkills: true });
      expect(prompt).toContain('summarize');
    });

    it('includes tenant context when provided', async () => {
      const prompt = await buildSystemPrompt({
        tenantContext: 'Business hours: Mon-Fri 9-18. Company: Acme Inc.',
      });
      expect(prompt).toContain('Acme Inc');
    });

    it('respects token budget by truncating sections', async () => {
      const prompt = await buildSystemPrompt({
        agentSystemPrompt: 'Short agent prompt.',
        maxTokens: 50,
      });
      expect(prompt.length).toBeLessThan(500); // ~50 tokens * ~4 chars/token + overhead
    });

    it('assembles sections in priority order', async () => {
      const prompt = await buildSystemPrompt({
        agentSystemPrompt: 'AGENT_INSTRUCTIONS',
        tenantContext: 'TENANT_CONTEXT',
      });
      // Base comes before agent, agent before tenant
      const baseIdx = prompt.indexOf('helpful');
      const agentIdx = prompt.indexOf('AGENT_INSTRUCTIONS');
      const tenantIdx = prompt.indexOf('TENANT_CONTEXT');
      expect(baseIdx).toBeLessThan(agentIdx);
      expect(agentIdx).toBeLessThan(tenantIdx);
    });
  });
});

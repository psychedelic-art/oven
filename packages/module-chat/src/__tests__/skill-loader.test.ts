import { describe, it, expect, vi, beforeEach } from 'vitest';

let selectResult: unknown[] = [];

vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve(selectResult)),
          orderBy: vi.fn(() => Promise.resolve(selectResult)),
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
  resolveSkill,
  renderSkillPrompt,
  listSkills,
  getSkillDescriptionsForPrompt,
} from '../engine/skill-loader';
import { eventBus } from '@oven/module-registry';

describe('SkillLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResult = [];
  });

  describe('resolveSkill()', () => {
    it('resolves a skill by slug from DB', async () => {
      selectResult = [{ id: 1, slug: 'summarize', promptTemplate: 'Summarize: {{input}}', enabled: true, isBuiltIn: true }];
      const skill = await resolveSkill('summarize');
      expect(skill).not.toBeNull();
      expect(skill!.slug).toBe('summarize');
    });

    it('returns null for unknown skill', async () => {
      selectResult = [];
      const skill = await resolveSkill('nonexistent');
      expect(skill).toBeNull();
    });

    it('returns null for disabled skill', async () => {
      selectResult = [{ id: 1, slug: 'test', enabled: false }];
      const skill = await resolveSkill('test');
      expect(skill).toBeNull();
    });
  });

  describe('renderSkillPrompt()', () => {
    it('substitutes {{var}} placeholders in template', () => {
      const result = renderSkillPrompt('Summarize the following: {{input}}', { input: 'Hello world' });
      expect(result).toBe('Summarize the following: Hello world');
    });

    it('handles multiple placeholders', () => {
      const result = renderSkillPrompt('Translate to {{language}}: {{input}}', { language: 'Spanish', input: 'Hello' });
      expect(result).toBe('Translate to Spanish: Hello');
    });

    it('leaves unmatched placeholders as-is', () => {
      const result = renderSkillPrompt('Analyze {{aspect}}: {{input}}', { input: 'data' });
      expect(result).toBe('Analyze {{aspect}}: data');
    });

    it('handles empty params', () => {
      const result = renderSkillPrompt('No placeholders here', {});
      expect(result).toBe('No placeholders here');
    });
  });

  describe('listSkills()', () => {
    it('returns all enabled skills', async () => {
      selectResult = [
        { id: 1, slug: 'summarize', enabled: true },
        { id: 2, slug: 'translate', enabled: true },
      ];
      const skills = await listSkills();
      expect(skills).toHaveLength(2);
    });
  });

  describe('getSkillDescriptionsForPrompt()', () => {
    it('formats skills as prompt-friendly text', async () => {
      selectResult = [
        { id: 1, slug: 'summarize', name: 'Summarize', description: 'Summarize content', enabled: true },
        { id: 2, slug: 'translate', name: 'Translate', description: 'Translate text', enabled: true },
      ];
      const text = await getSkillDescriptionsForPrompt();
      expect(text).toContain('summarize');
      expect(text).toContain('Summarize content');
      expect(text).toContain('translate');
    });
  });
});

import { describe, it, expect } from 'vitest';
import { validateDefinition } from '../utils/validation';
import type { UiFlowDefinition } from '@oven/module-ui-flows/types';

function validDefinition(): UiFlowDefinition {
  return {
    pages: [
      { id: 'home', slug: '', title: 'Home', type: 'landing' },
      { id: 'faq', slug: 'faq', title: 'FAQ', type: 'faq' },
    ],
    navigation: { type: 'sidebar', items: [] },
    settings: {},
  };
}

describe('validateDefinition', () => {
  // ── Happy path ──

  it('accepts a valid definition with a home page', () => {
    const result = validateDefinition(validDefinition());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // ── Negative cases ──

  it('rejects null', () => {
    const result = validateDefinition(null);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toMatch(/must be an object/);
  });

  it('rejects undefined', () => {
    const result = validateDefinition(undefined);
    expect(result.valid).toBe(false);
  });

  it('rejects a non-object', () => {
    const result = validateDefinition('not-an-object');
    expect(result.valid).toBe(false);
  });

  it('rejects missing pages', () => {
    const result = validateDefinition({ navigation: {}, settings: {} });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toMatch(/pages must be an array/);
  });

  it('rejects empty pages array', () => {
    const result = validateDefinition({
      pages: [],
      navigation: { type: 'sidebar', items: [] },
      settings: {},
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toMatch(/must not be empty/);
  });

  it('rejects invalid page type', () => {
    const def = validDefinition();
    (def.pages[1] as any).type = 'blog';
    const result = validateDefinition(def);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === 'pages[1].type')).toBe(true);
  });

  it('rejects duplicate slugs', () => {
    const def = validDefinition();
    def.pages.push({ id: 'dup', slug: 'faq', title: 'Dup FAQ', type: 'faq' });
    const result = validateDefinition(def);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Duplicate slug'))).toBe(true);
  });

  it('rejects duplicate home pages (both slug "")', () => {
    const def = validDefinition();
    def.pages.push({ id: 'home2', slug: '', title: 'Other Home', type: 'landing' });
    const result = validateDefinition(def);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Duplicate slug "(home)"'))).toBe(true);
  });

  it('rejects missing home page', () => {
    const def: UiFlowDefinition = {
      pages: [
        { id: 'about', slug: 'about', title: 'About', type: 'landing' },
      ],
      navigation: { type: 'sidebar', items: [] },
      settings: {},
    };
    const result = validateDefinition(def);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('home page'))).toBe(true);
  });

  it('rejects form page without formRef', () => {
    const def = validDefinition();
    def.pages.push({ id: 'form1', slug: 'contact', title: 'Contact', type: 'form' });
    const result = validateDefinition(def);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === 'pages[2].formRef')).toBe(true);
  });

  it('accepts form page with formRef', () => {
    const def = validDefinition();
    def.pages.push({
      id: 'form1',
      slug: 'contact',
      title: 'Contact',
      type: 'form',
      formRef: 'contact-form',
    });
    const result = validateDefinition(def);
    expect(result.valid).toBe(true);
  });

  it('rejects custom page without formRef', () => {
    const def = validDefinition();
    def.pages.push({ id: 'custom1', slug: 'custom', title: 'Custom', type: 'custom' });
    const result = validateDefinition(def);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('formRef is required'))).toBe(true);
  });

  it('rejects chat page without agentSlug in config', () => {
    const def = validDefinition();
    def.pages.push({ id: 'chat1', slug: 'support', title: 'Support', type: 'chat' });
    const result = validateDefinition(def);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === 'pages[2].config.agentSlug')).toBe(true);
  });

  it('accepts chat page with agentSlug in config', () => {
    const def = validDefinition();
    def.pages.push({
      id: 'chat1',
      slug: 'support',
      title: 'Support',
      type: 'chat',
      config: { agentSlug: 'dental-bot' },
    });
    const result = validateDefinition(def);
    expect(result.valid).toBe(true);
  });

  // ── maxPages cap ──

  it('rejects when page count exceeds maxPages', () => {
    const def = validDefinition();
    const result = validateDefinition(def, 1);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Too many pages'))).toBe(true);
  });

  it('accepts when page count equals maxPages', () => {
    const def = validDefinition();
    const result = validateDefinition(def, 2);
    expect(result.valid).toBe(true);
  });

  // ── Edge case: _home sentinel normalizes to "" ──

  it('treats _home slug as the home page after normalization', () => {
    const def: UiFlowDefinition = {
      pages: [
        { id: 'home', slug: '_home', title: 'Home', type: 'landing' },
      ],
      navigation: { type: 'sidebar', items: [] },
      settings: {},
    };
    const result = validateDefinition(def);
    expect(result.valid).toBe(true);
  });
});

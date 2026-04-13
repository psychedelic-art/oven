import { describe, it, expect } from 'vitest';
import { definitionToNodes, nodesToDefinition } from '../utils/definition-converter';
import type { UiFlowDefinition } from '@oven/module-ui-flows/types';

// ─── Seed fixture (from packages/module-ui-flows/src/seed.ts) ────

const DENTAL_CLINIC_DEFINITION: UiFlowDefinition = {
  pages: [
    {
      id: 'page-home',
      type: 'landing',
      title: 'Welcome',
      slug: '',
      config: {
        heroTitle: 'Welcome to Our Dental Clinic',
        heroSubtitle: 'Quality dental care for the whole family',
        ctaText: 'Book Appointment',
        ctaLink: '/patient-intake',
      },
      position: { x: 250, y: 50 },
    },
    {
      id: 'page-contact',
      type: 'form',
      title: 'Contact Us',
      slug: 'contact',
      formRef: 'contact-form',
      position: { x: 100, y: 250 },
    },
    {
      id: 'page-intake',
      type: 'form',
      title: 'Patient Registration',
      slug: 'patient-intake',
      formRef: 'patient-intake',
      position: { x: 400, y: 250 },
    },
  ],
  navigation: {
    type: 'sidebar',
    items: [
      { label: 'Home', pageId: 'page-home' },
      { label: 'Contact', pageId: 'page-contact' },
      { label: 'Patient Registration', pageId: 'page-intake' },
    ],
  },
  settings: {},
};

// ─── Minimal fixtures ────────────────────────────────────────────

const SINGLE_PAGE_DEFINITION: UiFlowDefinition = {
  pages: [
    {
      id: 'home',
      type: 'landing',
      title: 'Home',
      slug: '',
      position: { x: 300, y: 50 },
    },
  ],
  navigation: { type: 'sidebar', items: [] },
  settings: {},
};

const MULTI_TYPE_DEFINITION: UiFlowDefinition = {
  pages: [
    { id: 'p1', type: 'landing', title: 'Home', slug: '', position: { x: 0, y: 0 } },
    { id: 'p2', type: 'faq', title: 'FAQ', slug: 'faq', position: { x: 0, y: 150 } },
    {
      id: 'p3',
      type: 'chat',
      title: 'Support',
      slug: 'support',
      config: { agentSlug: 'bot' },
      position: { x: 0, y: 300 },
    },
    {
      id: 'p4',
      type: 'custom',
      title: 'Terms',
      slug: 'terms',
      formRef: 'terms-form',
      config: { content: '<p>Terms</p>' },
      position: { x: 0, y: 450 },
    },
  ],
  navigation: {
    type: 'topbar',
    items: [
      { label: 'Home', pageId: 'p1' },
      { label: 'FAQ', pageId: 'p2' },
    ],
  },
  settings: { homePage: '', title: 'My Portal' },
};

// ─── Tests ───────────────────────────────────────────────────────

describe('definitionToNodes', () => {
  it('returns a default home node when definition is undefined', () => {
    const result = definitionToNodes(undefined);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].type).toBe('home');
    expect(result.edges).toHaveLength(0);
  });

  it('returns a default home node when definition has no pages', () => {
    const result = definitionToNodes({
      pages: [],
      navigation: { type: 'sidebar', items: [] },
      settings: {},
    });
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].type).toBe('home');
  });

  it('maps the dental clinic seed to 3 nodes', () => {
    const result = definitionToNodes(DENTAL_CLINIC_DEFINITION);
    expect(result.nodes).toHaveLength(3);
    expect(result.nodes[0].id).toBe('page-home');
    expect(result.nodes[0].type).toBe('landing');
    expect(result.nodes[1].type).toBe('form');
    expect(result.nodes[2].type).toBe('form');
  });

  it('creates edges from navigation items', () => {
    const result = definitionToNodes(DENTAL_CLINIC_DEFINITION);
    // 3 nav items → 2 edges
    expect(result.edges).toHaveLength(2);
    expect(result.edges[0].source).toBe('page-home');
    expect(result.edges[0].target).toBe('page-contact');
  });

  it('preserves positions from the definition', () => {
    const result = definitionToNodes(DENTAL_CLINIC_DEFINITION);
    expect(result.nodes[0].position).toEqual({ x: 250, y: 50 });
    expect(result.nodes[1].position).toEqual({ x: 100, y: 250 });
  });

  it('assigns sequential positions when pages lack position', () => {
    const def: UiFlowDefinition = {
      pages: [
        { id: 'a', type: 'landing', title: 'A', slug: '' },
        { id: 'b', type: 'faq', title: 'B', slug: 'b' },
      ],
      navigation: { type: 'sidebar', items: [] },
      settings: {},
    };
    const result = definitionToNodes(def);
    expect(result.nodes[0].position).toEqual({ x: 300, y: 50 });
    expect(result.nodes[1].position).toEqual({ x: 300, y: 200 });
  });

  it('spreads page config into node data', () => {
    const result = definitionToNodes(DENTAL_CLINIC_DEFINITION);
    expect((result.nodes[0].data as Record<string, unknown>).heroTitle).toBe(
      'Welcome to Our Dental Clinic',
    );
  });

  it('maps formRef into node data', () => {
    const result = definitionToNodes(DENTAL_CLINIC_DEFINITION);
    expect((result.nodes[1].data as Record<string, unknown>).formRef).toBe(
      'contact-form',
    );
  });
});

describe('nodesToDefinition', () => {
  it('converts nodes back to a definition', () => {
    const { nodes, edges } = definitionToNodes(SINGLE_PAGE_DEFINITION);
    const result = nodesToDefinition(
      nodes,
      edges,
      SINGLE_PAGE_DEFINITION.navigation,
      SINGLE_PAGE_DEFINITION.settings,
    );
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].id).toBe('home');
    expect(result.pages[0].type).toBe('landing');
  });

  it('preserves navigation and settings', () => {
    const { nodes, edges } = definitionToNodes(MULTI_TYPE_DEFINITION);
    const result = nodesToDefinition(
      nodes,
      edges,
      MULTI_TYPE_DEFINITION.navigation,
      MULTI_TYPE_DEFINITION.settings,
    );
    expect(result.navigation.type).toBe('topbar');
    expect(result.settings.title).toBe('My Portal');
  });
});

describe('round-trip (definitionToNodes → nodesToDefinition)', () => {
  const fixtures: [string, UiFlowDefinition][] = [
    ['dental clinic seed', DENTAL_CLINIC_DEFINITION],
    ['single page', SINGLE_PAGE_DEFINITION],
    ['multi-type', MULTI_TYPE_DEFINITION],
  ];

  for (const [name, fixture] of fixtures) {
    it(`round-trips the "${name}" fixture losslessly`, () => {
      const { nodes, edges } = definitionToNodes(fixture);
      const result = nodesToDefinition(
        nodes,
        edges,
        fixture.navigation,
        fixture.settings,
      );

      // Same page count
      expect(result.pages).toHaveLength(fixture.pages.length);

      // Each page preserves identity, type, title, slug
      for (let i = 0; i < fixture.pages.length; i++) {
        const original = fixture.pages[i];
        const converted = result.pages[i];
        expect(converted.id).toBe(original.id);
        expect(converted.type).toBe(original.type);
        expect(converted.title).toBe(original.title);
        expect(converted.slug).toBe(original.slug);

        // formRef preserved when set
        if (original.formRef) {
          expect(converted.formRef).toBe(original.formRef);
        }

        // Position preserved when set
        if (original.position) {
          expect(converted.position).toEqual(original.position);
        }

        // Config keys round-tripped (merged into data then extracted)
        if (original.config && Object.keys(original.config).length > 0) {
          for (const key of Object.keys(original.config)) {
            expect((converted.config as Record<string, unknown>)?.[key]).toEqual(
              (original.config as Record<string, unknown>)[key],
            );
          }
        }
      }

      // Navigation and settings preserved
      expect(result.navigation).toEqual(fixture.navigation);
      expect(result.settings).toEqual(fixture.settings);
    });
  }
});

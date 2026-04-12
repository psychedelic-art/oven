import { describe, it, expect } from 'vitest';
import { uiFlowsModule } from '../index';

describe('module-ui-flows ModuleDefinition wiring', () => {
  it('has name "ui-flows"', () => {
    expect(uiFlowsModule.name).toBe('ui-flows');
  });

  it('declares dependencies', () => {
    expect(uiFlowsModule.dependencies).toContain('forms');
    expect(uiFlowsModule.dependencies).toContain('tenants');
  });

  describe('apiHandlers', () => {
    const handlers = uiFlowsModule.apiHandlers;

    it('defines handlers for all expected routes', () => {
      const expectedRoutes = [
        'ui-flows',
        'ui-flows/[id]',
        'ui-flows/[id]/publish',
        'ui-flows/[id]/versions',
        'ui-flows/[id]/versions/[versionId]/restore',
        'portal/[tenantSlug]',
        'portal/[tenantSlug]/pages/[pageSlug]',
        'portal/[tenantSlug]/theme',
        'portal/[tenantSlug]/analytics',
        'ui-flow-analytics',
        'ui-flow-pages',
      ];

      for (const route of expectedRoutes) {
        expect(handlers).toHaveProperty(route);
      }
    });

    it('exports the correct HTTP methods for each route', () => {
      expect(handlers['ui-flows']).toHaveProperty('GET');
      expect(handlers['ui-flows']).toHaveProperty('POST');

      expect(handlers['ui-flows/[id]']).toHaveProperty('GET');
      expect(handlers['ui-flows/[id]']).toHaveProperty('PUT');
      expect(handlers['ui-flows/[id]']).toHaveProperty('DELETE');

      expect(handlers['ui-flows/[id]/publish']).toHaveProperty('POST');
      expect(handlers['ui-flows/[id]/versions']).toHaveProperty('GET');
      expect(handlers['ui-flows/[id]/versions/[versionId]/restore']).toHaveProperty('POST');

      expect(handlers['portal/[tenantSlug]']).toHaveProperty('GET');
      expect(handlers['portal/[tenantSlug]/pages/[pageSlug]']).toHaveProperty('GET');
      expect(handlers['portal/[tenantSlug]/theme']).toHaveProperty('GET');
      expect(handlers['portal/[tenantSlug]/analytics']).toHaveProperty('POST');

      expect(handlers['ui-flow-analytics']).toHaveProperty('GET');
      expect(handlers['ui-flow-pages']).toHaveProperty('GET');
    });

    it('every handler value is a function', () => {
      for (const [route, methods] of Object.entries(handlers)) {
        for (const [verb, fn] of Object.entries(methods as Record<string, unknown>)) {
          expect(typeof fn).toBe('function');
        }
      }
    });
  });

  describe('events', () => {
    const events = uiFlowsModule.events!;

    it('declares all expected emitted events', () => {
      const expected = [
        'ui-flows.flow.created',
        'ui-flows.flow.updated',
        'ui-flows.flow.published',
        'ui-flows.flow.archived',
        'ui-flows.page.visited',
        'ui-flows.form.submitted',
      ];
      for (const name of expected) {
        expect(events.emits).toContain(name);
      }
    });

    it('every emitted event has a matching schema', () => {
      for (const eventName of events.emits!) {
        expect(events.schemas).toHaveProperty(eventName);
      }
    });

    it('every event schema has tenantId field', () => {
      for (const [eventName, schema] of Object.entries(events.schemas!)) {
        expect(schema).toHaveProperty('tenantId');
      }
    });
  });

  describe('chat.actionSchemas', () => {
    const chat = uiFlowsModule.chat!;
    const actions = chat.actionSchemas!;
    const handlerKeys = Object.keys(uiFlowsModule.apiHandlers);

    it('every actionSchema endpoint path appears in apiHandlers', () => {
      for (const action of actions) {
        expect(handlerKeys).toContain(action.endpoint.path);
      }
    });

    it('every actionSchema has a non-empty description', () => {
      for (const action of actions) {
        expect(action.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe('configSchema', () => {
    const configs = uiFlowsModule.configSchema!;

    it('declares at least 3 config keys', () => {
      expect(configs.length).toBeGreaterThanOrEqual(3);
    });

    it('every config has key, type, description, and defaultValue', () => {
      for (const entry of configs) {
        expect(entry.key).toBeTruthy();
        expect(entry.type).toBeTruthy();
        expect(entry.description).toBeTruthy();
        expect(entry.defaultValue).toBeDefined();
      }
    });

    it('MAX_PAGES_PER_FLOW defaults to a number', () => {
      const entry = configs.find((c: any) => c.key === 'MAX_PAGES_PER_FLOW');
      expect(entry).toBeDefined();
      expect(typeof entry!.defaultValue).toBe('number');
    });
  });

  describe('resources', () => {
    it('declares at least ui-flows and ui-flow-analytics resources', () => {
      const names = uiFlowsModule.resources.map((r: any) => r.name);
      expect(names).toContain('ui-flows');
      expect(names).toContain('ui-flow-analytics');
    });
  });
});

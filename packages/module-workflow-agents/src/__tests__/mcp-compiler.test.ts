import { describe, it, expect, vi, beforeEach } from 'vitest';

let selectResult: unknown[] = [];

vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve(selectResult)),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 1, slug: 'wf-test' }])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: 1, slug: 'wf-test' }])),
        })),
      })),
    })),
  })),
}));

import { compileWorkflowToToolSchema, compileAndStoreMCP } from '../engine/mcp-compiler';
import type { AgentWorkflowDefinition } from '../types';

describe('MCPCompiler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResult = [];
  });

  describe('compileWorkflowToToolSchema()', () => {
    it('compiles a simple workflow to tool schema', () => {
      const schema = compileWorkflowToToolSchema({
        name: 'Appointment Scheduler',
        slug: 'appointment-scheduler',
        description: 'Schedule a dental appointment',
        definition: {
          id: 'scheduler',
          initial: 'start',
          context: { patientName: '', date: '', time: '' },
          states: { start: { type: 'final' } },
        },
      });
      expect(schema.name).toBe('workflow.appointment-scheduler');
      expect(schema.description).toBe('Schedule a dental appointment');
      expect(schema.inputSchema.type).toBe('object');
    });

    it('extracts input parameters from context schema', () => {
      const schema = compileWorkflowToToolSchema({
        name: 'Test',
        slug: 'test',
        definition: {
          id: 'test',
          initial: 'start',
          context: { query: 'default', maxResults: 5, includeMetadata: true },
          states: { start: { type: 'final' } },
        },
      });
      expect(schema.inputSchema.properties.query.type).toBe('string');
      expect(schema.inputSchema.properties.maxResults.type).toBe('number');
      expect(schema.inputSchema.properties.includeMetadata.type).toBe('boolean');
      expect(schema.inputSchema.required).toEqual(['query', 'maxResults', 'includeMetadata']);
    });

    it('generates correct name with workflow. prefix', () => {
      const schema = compileWorkflowToToolSchema({
        name: 'My Workflow', slug: 'my-workflow',
        definition: { id: 'mw', initial: 's', states: { s: { type: 'final' } } },
      });
      expect(schema.name).toBe('workflow.my-workflow');
    });

    it('handles workflow with no context (no inputs)', () => {
      const schema = compileWorkflowToToolSchema({
        name: 'NoInput', slug: 'no-input',
        definition: { id: 'ni', initial: 's', states: { s: { type: 'final' } } },
      });
      expect(Object.keys(schema.inputSchema.properties)).toHaveLength(0);
      expect(schema.inputSchema.required).toBeUndefined();
    });
  });

  describe('compileAndStoreMCP()', () => {
    it('inserts new MCP server definition when none exists', async () => {
      selectResult = []; // No existing
      const result = await compileAndStoreMCP({
        id: 1, tenantId: 1, name: 'Test', slug: 'test', description: 'A test workflow',
        definition: { id: 'test', initial: 's', context: { query: '' }, states: { s: { type: 'final' } } },
      });
      expect(result.id).toBe(1);
      expect(result.slug).toBe('wf-test');
    });
  });
});

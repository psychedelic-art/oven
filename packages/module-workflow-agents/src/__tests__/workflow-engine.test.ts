import { describe, it, expect, vi, beforeEach } from 'vitest';

let selectResult: unknown[] = [];
let insertResult: unknown[] = [{ id: 1, status: 'running', context: {}, stepsExecuted: 0 }];
let updateResult: unknown[] = [];

vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve(selectResult)),
          orderBy: vi.fn(() => Promise.resolve(selectResult)),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve(insertResult)),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve(updateResult)),
        })),
      })),
    })),
  })),
}));

vi.mock('@oven/module-registry', () => ({
  eventBus: { emit: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@oven/module-ai', () => ({
  aiGenerateText: vi.fn().mockResolvedValue({ text: 'AI says hello', tokens: { input: 10, output: 5, total: 15 } }),
}));

import { runAgentWorkflow } from '../engine/workflow-engine';
import { eventBus } from '@oven/module-registry';
import type { AgentWorkflowDefinition, AgentConfig } from '../types';

describe('AgentWorkflowEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResult = [];
    insertResult = [{ id: 1, status: 'running', context: {}, stepsExecuted: 0 }];
    updateResult = [{ id: 1, status: 'completed' }];
  });

  it('executes a simple linear workflow (LLM → output)', async () => {
    const definition: AgentWorkflowDefinition = {
      id: 'simple-chat',
      initial: 'llmCall',
      states: {
        llmCall: {
          invoke: {
            src: 'llm',
            input: { messages: [{ role: 'user', content: '$.trigger.message' }] },
            onDone: 'done',
          },
        },
        done: { type: 'final' },
      },
    };
    const config: AgentConfig = { model: 'fast', maxSteps: 10 };
    const result = await runAgentWorkflow(definition, config, { trigger: { message: 'Hello' } }, { executionId: 1 });
    expect(result.status).toBe('completed');
    expect(result.context.llmCall).toBeDefined();
    expect(eventBus.emit).toHaveBeenCalledWith('workflow-agents.execution.started', expect.any(Object));
  });

  it('executes a branching workflow (condition → true/false paths)', async () => {
    const definition: AgentWorkflowDefinition = {
      id: 'branching',
      initial: 'checkStatus',
      states: {
        checkStatus: {
          invoke: {
            src: 'condition',
            input: { field: 'trigger.active', operator: '==', value: true },
            onDone: 'processActive',
            onError: 'handleInactive',
          },
          always: [
            { target: 'processActive', guard: { type: 'condition', params: { key: 'checkStatus.branch', operator: '==', value: 'true' } } },
            { target: 'handleInactive' },
          ],
        },
        processActive: {
          invoke: { src: 'llm', input: { messages: [{ role: 'user', content: 'Process active' }] }, onDone: 'done' },
        },
        handleInactive: {
          invoke: { src: 'llm', input: { messages: [{ role: 'user', content: 'Handle inactive' }] }, onDone: 'done' },
        },
        done: { type: 'final' },
      },
    };
    const config: AgentConfig = { maxSteps: 20 };
    const result = await runAgentWorkflow(definition, config, { trigger: { active: true } }, { executionId: 1 });
    expect(result.status).toBe('completed');
  });

  it('respects maxSteps safety limit', async () => {
    // Workflow that would loop forever without limit
    const definition: AgentWorkflowDefinition = {
      id: 'infinite-loop',
      initial: 'step',
      states: {
        step: {
          invoke: { src: 'llm', input: { messages: [{ role: 'user', content: 'Loop' }] }, onDone: 'step' },
        },
        done: { type: 'final' },
      },
    };
    const config: AgentConfig = { maxSteps: 3 };
    const result = await runAgentWorkflow(definition, config, {}, { executionId: 1 });
    expect(result.status).toBe('failed');
    expect(result.error).toContain('Max steps');
  });

  it('handles node execution errors gracefully', async () => {
    const definition: AgentWorkflowDefinition = {
      id: 'error-handling',
      initial: 'badNode',
      states: {
        badNode: {
          invoke: {
            src: 'nonexistent-node-type',
            input: {},
            onDone: 'done',
            onError: 'errorHandler',
          },
        },
        errorHandler: {
          invoke: { src: 'llm', input: { messages: [{ role: 'user', content: 'Handle error' }] }, onDone: 'done' },
        },
        done: { type: 'final' },
      },
    };
    const config: AgentConfig = { maxSteps: 10 };
    const result = await runAgentWorkflow(definition, config, {}, { executionId: 1 });
    // Should have reached errorHandler or final state
    expect(['completed', 'failed']).toContain(result.status);
  });

  it('emits lifecycle events during execution', async () => {
    const definition: AgentWorkflowDefinition = {
      id: 'events-test',
      initial: 'step1',
      states: {
        step1: { invoke: { src: 'llm', input: { messages: [] }, onDone: 'done' } },
        done: { type: 'final' },
      },
    };
    await runAgentWorkflow(definition, { maxSteps: 10 }, {}, { executionId: 1 });
    expect(eventBus.emit).toHaveBeenCalledWith('workflow-agents.execution.started', expect.any(Object));
    expect(eventBus.emit).toHaveBeenCalledWith('workflow-agents.node.started', expect.any(Object));
    expect(eventBus.emit).toHaveBeenCalledWith('workflow-agents.node.completed', expect.any(Object));
    expect(eventBus.emit).toHaveBeenCalledWith('workflow-agents.execution.completed', expect.any(Object));
  });
});

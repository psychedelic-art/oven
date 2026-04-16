/**
 * End-to-end: conditional branching workflow.
 *
 * Exercises the real `condition` node + guarded `always` transitions.
 * A condition node emits `{ branch: 'true' | 'false' }`; the guard in
 * `always[]` evaluates `$.<state>.branch == 'true'` to pick the correct
 * outgoing edge.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  bootstrapHarness,
  seedAgentWorkflow,
  seedWorkflowExecution,
  type HarnessHandle,
} from '../src';
import { runAgentWorkflow } from '@oven/module-workflow-agents/engine/workflow-engine';

describe('e2e: workflow-branching', () => {
  let harness: HarnessHandle;

  const definition = {
    id: 'branching',
    initial: 'check',
    states: {
      check: {
        invoke: {
          src: 'condition',
          input: {
            field: 'trigger.value',
            operator: '>',
            value: 5,
          },
        },
        always: [
          {
            target: 'high',
            guard: {
              type: 'condition' as const,
              params: { key: 'check.branch', operator: '==' as const, value: 'true' },
            },
          },
          { target: 'low' },
        ],
      },
      high: {
        invoke: {
          src: 'transform',
          input: { mapping: { tag: 'trigger.value' } },
          onDone: 'end',
        },
      },
      low: {
        invoke: {
          src: 'transform',
          input: { mapping: { tag: 'trigger.value' } },
          onDone: 'end',
        },
      },
      end: { type: 'final' as const },
    },
  };

  beforeEach(async () => {
    harness = await bootstrapHarness({ schemas: ['workflow-agents'] });
  });

  afterEach(async () => {
    await harness.cleanup();
  });

  it('takes the high branch when guard evaluates true', async () => {
    const wf = await seedAgentWorkflow(harness.db, {
      slug: 'branching-high',
      definition,
    });
    const exec = await seedWorkflowExecution(harness.db, { workflowId: wf.id });

    const result = await runAgentWorkflow(
      definition,
      {},
      { trigger: { value: 10 } },
      { executionId: exec.id },
    );

    expect(result.status).toBe('completed');
    expect(result.context).toMatchObject({
      check: { branch: 'true' },
      high: { result: { tag: 10 } }, // transform resolves $.trigger.value → 10
    });
    // The 'low' state must never have executed.
    expect((result.context as Record<string, unknown>).low).toBeUndefined();
    // check + high = 2 invoked nodes
    expect(result.stepsExecuted).toBe(2);
  });

  it('falls through to low branch when guard evaluates false', async () => {
    const wf = await seedAgentWorkflow(harness.db, {
      slug: 'branching-low',
      definition,
    });
    const exec = await seedWorkflowExecution(harness.db, { workflowId: wf.id });

    const result = await runAgentWorkflow(
      definition,
      {},
      { trigger: { value: 2 } },
      { executionId: exec.id },
    );

    expect(result.status).toBe('completed');
    expect(result.context).toMatchObject({
      check: { branch: 'false' },
    });
    expect((result.context as Record<string, unknown>).high).toBeUndefined();
    expect((result.context as Record<string, unknown>).low).toBeDefined();
    expect(result.stepsExecuted).toBe(2);
  });
});

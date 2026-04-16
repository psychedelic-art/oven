/**
 * End-to-end: linear workflow execution.
 *
 * A 3-node linear workflow (transform → transform → transform → final)
 * exercises the real workflow engine's state machine, context
 * accumulation through `$.path` resolution, lifecycle events, and
 * persistence of node execution rows.
 *
 * Uses only `transform` nodes so no module-ai path is touched — the
 * focus is the engine itself.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sql } from 'drizzle-orm';
import {
  bootstrapHarness,
  seedAgentWorkflow,
  seedWorkflowExecution,
  EventRecorder,
  type HarnessHandle,
} from '../src';
import { runAgentWorkflow } from '@oven/module-workflow-agents/engine/workflow-engine';

describe('e2e: workflow-linear', () => {
  let harness: HarnessHandle;
  let recorder: EventRecorder;

  beforeEach(async () => {
    harness = await bootstrapHarness({ schemas: ['workflow-agents'] });
    recorder = new EventRecorder([
      'workflow-agents.execution.started',
      'workflow-agents.execution.completed',
      'workflow-agents.execution.failed',
      'workflow-agents.node.started',
      'workflow-agents.node.completed',
    ]);
  });

  afterEach(async () => {
    recorder.dispose();
    await harness.cleanup();
  });

  it('executes all 3 transform nodes and completes', async () => {
    const definition = {
      id: 'linear-3',
      initial: 's1',
      states: {
        s1: {
          invoke: {
            src: 'transform',
            input: { mapping: { a: '$.trigger.value' } },
            onDone: 's2',
          },
        },
        s2: {
          invoke: {
            src: 'transform',
            input: { mapping: { b: '$.s1.result.a' } },
            onDone: 's3',
          },
        },
        s3: {
          invoke: {
            src: 'transform',
            input: { mapping: { c: '$.s2.result.b' } },
            onDone: 'end',
          },
        },
        end: { type: 'final' as const },
      },
    };

    const wf = await seedAgentWorkflow(harness.db, {
      slug: 'linear-3',
      definition,
    });
    const exec = await seedWorkflowExecution(harness.db, {
      workflowId: wf.id,
    });

    const result = await runAgentWorkflow(
      definition,
      {},
      { trigger: { value: 42 } },
      { executionId: exec.id },
    );

    expect(result.status).toBe('completed');
    expect(result.stepsExecuted).toBe(3);
    expect(result.error).toBeUndefined();

    // Context accumulated through all three transform nodes.
    expect(result.context).toMatchObject({
      trigger: { value: 42 },
      s1: { result: { a: 42 } },
      s2: { result: { b: 42 } },
      s3: { result: { c: 42 } },
    });
  });

  it('emits lifecycle events in correct order', async () => {
    const definition = {
      id: 'linear-2',
      initial: 's1',
      states: {
        s1: {
          invoke: {
            src: 'transform',
            input: { mapping: { x: '$.trigger.value' } },
            onDone: 's2',
          },
        },
        s2: {
          invoke: {
            src: 'transform',
            input: { mapping: { y: '$.s1.result.x' } },
            onDone: 'end',
          },
        },
        end: { type: 'final' as const },
      },
    };

    const wf = await seedAgentWorkflow(harness.db, {
      slug: 'linear-events',
      definition,
    });
    const exec = await seedWorkflowExecution(harness.db, {
      workflowId: wf.id,
    });

    await runAgentWorkflow(
      definition,
      {},
      { trigger: { value: 'hello' } },
      { executionId: exec.id },
    );

    const names = recorder.getEvents().map((e) => e.event);
    // Expect: started → (node.started → node.completed) × 2 → completed
    expect(names).toEqual([
      'workflow-agents.execution.started',
      'workflow-agents.node.started',
      'workflow-agents.node.completed',
      'workflow-agents.node.started',
      'workflow-agents.node.completed',
      'workflow-agents.execution.completed',
    ]);
  });

  it('persists one agent_workflow_node_executions row per step', async () => {
    const definition = {
      id: 'linear-persist',
      initial: 's1',
      states: {
        s1: {
          invoke: {
            src: 'transform',
            input: { mapping: { a: '$.trigger.value' } },
            onDone: 's2',
          },
        },
        s2: {
          invoke: {
            src: 'transform',
            input: { mapping: { b: '$.s1.result.a' } },
            onDone: 'end',
          },
        },
        end: { type: 'final' as const },
      },
    };

    const wf = await seedAgentWorkflow(harness.db, {
      slug: 'linear-persist',
      definition,
    });
    const exec = await seedWorkflowExecution(harness.db, {
      workflowId: wf.id,
    });

    await runAgentWorkflow(
      definition,
      {},
      { trigger: { value: 1 } },
      { executionId: exec.id },
    );

    const rows = await harness.db.execute(sql`
      SELECT node_id, node_type, status
      FROM agent_workflow_node_executions
      WHERE execution_id = ${exec.id}
      ORDER BY id ASC
    `);
    expect(rows.rows).toHaveLength(2);
    expect(rows.rows[0]).toMatchObject({ node_id: 's1', node_type: 'transform', status: 'completed' });
    expect(rows.rows[1]).toMatchObject({ node_id: 's2', node_type: 'transform', status: 'completed' });
  });
});

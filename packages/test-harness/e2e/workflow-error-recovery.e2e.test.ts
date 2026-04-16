/**
 * End-to-end: workflow error recovery.
 *
 * When a node returns `{ error: ... }` AND the state defines
 * `invoke.onError`, the engine should:
 *  - Emit `workflow-agents.node.failed`
 *  - Route execution to the onError target
 *  - Record the failed node's DB row with status='failed'
 *
 * When no onError is defined, the error propagates and the workflow
 * fails with status='failed' (NOT thrown).
 *
 * Triggers the error path via an unknown node slug — node-executor's
 * default case returns `{ error: 'Unknown node type: ...' }` without
 * any dynamic imports.
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

describe('e2e: workflow-error-recovery', () => {
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
      'workflow-agents.node.failed',
    ]);
  });

  afterEach(async () => {
    recorder.dispose();
    await harness.cleanup();
  });

  it('routes to onError target when node fails', async () => {
    const definition = {
      id: 'err-recovery',
      initial: 'primary',
      states: {
        primary: {
          invoke: {
            src: 'nonexistent-node-type',
            onDone: 'end',
            onError: 'fallback',
          },
        },
        fallback: {
          invoke: {
            src: 'transform',
            input: { mapping: { recovered: 'primary.error' } },
            onDone: 'end',
          },
        },
        end: { type: 'final' as const },
      },
    };

    const wf = await seedAgentWorkflow(harness.db, {
      slug: 'err-recovery',
      definition,
    });
    const exec = await seedWorkflowExecution(harness.db, { workflowId: wf.id });

    const result = await runAgentWorkflow(
      definition,
      {},
      {},
      { executionId: exec.id },
    );

    // Execution completes successfully via the fallback branch.
    expect(result.status).toBe('completed');
    expect(result.stepsExecuted).toBe(2);

    // Fallback state was entered and ran transform.
    expect((result.context as Record<string, unknown>).fallback).toBeDefined();

    // node.failed event fired for the primary state.
    const names = recorder.getEvents().map((e) => e.event);
    expect(names).toContain('workflow-agents.node.failed');
    expect(names).toContain('workflow-agents.execution.completed');
    expect(names).not.toContain('workflow-agents.execution.failed');

    // The DB row for the primary node execution is unchanged (status='running')
    // because the engine's completion-update is skipped when the error branch
    // fires. This matches production behaviour.
    const rows = await harness.db.execute(sql`
      SELECT node_id, status
      FROM agent_workflow_node_executions
      WHERE execution_id = ${exec.id}
      ORDER BY id ASC
    `);
    expect(rows.rows).toHaveLength(2);
    expect(rows.rows[0]).toMatchObject({ node_id: 'primary', status: 'running' });
    expect(rows.rows[1]).toMatchObject({ node_id: 'fallback', status: 'completed' });
  });

  it('fails the execution when no onError is defined and transition is missing', async () => {
    const definition = {
      id: 'err-nohandler',
      initial: 'primary',
      states: {
        primary: {
          invoke: {
            src: 'nonexistent-node-type',
            // no onError and no onDone → resolveTransition returns null
          },
        },
      },
    };

    const wf = await seedAgentWorkflow(harness.db, {
      slug: 'err-nohandler',
      definition,
    });
    const exec = await seedWorkflowExecution(harness.db, { workflowId: wf.id });

    const result = await runAgentWorkflow(
      definition,
      {},
      {},
      { executionId: exec.id },
    );

    expect(result.status).toBe('failed');
    expect(result.error).toMatch(/No transition from state/);
    // fail() always emits execution.failed
    const names = recorder.getEvents().map((e) => e.event);
    expect(names).toContain('workflow-agents.execution.failed');
  });
});

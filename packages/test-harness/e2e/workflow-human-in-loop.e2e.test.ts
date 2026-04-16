/**
 * End-to-end: human-in-the-loop workflow pause + resume.
 *
 * When a state invokes `human-review` with no `decision` in its resolved
 * input, the engine must:
 *  - Save a checkpoint via `saveCheckpoint` (writes status='paused',
 *    checkpoint JSONB, currentState, context)
 *  - Emit `workflow-agents.human_review.pending`
 *  - Return immediately with status='paused'
 *
 * A subsequent call with `decision` provided in the context should
 * resume via the human-review node, progress to the final state, and
 * complete.
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
import {
  loadCheckpoint,
  transitionStatus,
} from '@oven/module-workflow-agents/engine/checkpoint-manager';

const definition = {
  id: 'hitl',
  initial: 'review',
  states: {
    review: {
      invoke: {
        src: 'human-review',
        input: {
          proposal: '$.trigger.proposal',
          reason: '$.trigger.reason',
          // `decision` intentionally omitted on first run so the engine
          // pauses; resume merges it in via context[currentState].
          decision: '$.review.decision',
        },
        onDone: 'end',
      },
    },
    end: { type: 'final' as const },
  },
};

describe('e2e: workflow-human-in-loop', () => {
  let harness: HarnessHandle;
  let recorder: EventRecorder;

  beforeEach(async () => {
    harness = await bootstrapHarness({ schemas: ['workflow-agents'] });
    recorder = new EventRecorder([
      'workflow-agents.execution.started',
      'workflow-agents.execution.completed',
      'workflow-agents.execution.paused',
      'workflow-agents.checkpoint.saved',
      'workflow-agents.human_review.pending',
    ]);
  });

  afterEach(async () => {
    recorder.dispose();
    await harness.cleanup();
  });

  it('pauses at human-review and saves a checkpoint', async () => {
    const wf = await seedAgentWorkflow(harness.db, {
      slug: 'hitl-pause',
      definition,
    });
    const exec = await seedWorkflowExecution(harness.db, { workflowId: wf.id });

    const result = await runAgentWorkflow(
      definition,
      {},
      { trigger: { proposal: 'ship it', reason: 'tests pass' } },
      { executionId: exec.id },
    );

    expect(result.status).toBe('paused');
    expect(result.stepsExecuted).toBe(1);

    const names = recorder.getEvents().map((e) => e.event);
    expect(names).toContain('workflow-agents.checkpoint.saved');
    expect(names).toContain('workflow-agents.human_review.pending');
    expect(names).toContain('workflow-agents.execution.paused');

    // Checkpoint is readable from the DB.
    const checkpoint = await loadCheckpoint(exec.id);
    expect(checkpoint).toBeTruthy();
    expect(checkpoint!.currentState).toBe('review');
    expect(checkpoint!.pendingInput).toMatchObject({
      proposal: 'ship it',
      reason: 'tests pass',
    });

    // Execution row status is 'paused'.
    const execRows = await harness.db.execute(sql`
      SELECT status FROM agent_workflow_executions WHERE id = ${exec.id}
    `);
    expect(execRows.rows[0]).toMatchObject({ status: 'paused' });
  });

  it('resumes from checkpoint and completes when decision is provided', async () => {
    const wf = await seedAgentWorkflow(harness.db, {
      slug: 'hitl-resume',
      definition,
    });
    const exec = await seedWorkflowExecution(harness.db, { workflowId: wf.id });

    // First pass → pauses.
    const pauseResult = await runAgentWorkflow(
      definition,
      {},
      { trigger: { proposal: 'ship it', reason: 'tests pass' } },
      { executionId: exec.id },
    );
    expect(pauseResult.status).toBe('paused');

    // Transition paused → running (production does this in the resume handler).
    const transition = await transitionStatus(exec.id, 'running');
    expect(transition.success).toBe(true);

    // Second pass: pre-fill the review state's context with the approval
    // so resolveValue('$.review.decision') resolves to 'approve'. The
    // engine then sees `decision` present and does NOT pause.
    const checkpoint = await loadCheckpoint(exec.id);
    expect(checkpoint).toBeTruthy();

    const resumeContext = {
      ...checkpoint!.context,
      review: { decision: 'approve', feedback: 'looks good' },
    };

    const resumeResult = await runAgentWorkflow(
      { ...definition, initial: checkpoint!.currentState },
      {},
      resumeContext,
      { executionId: exec.id },
    );

    expect(resumeResult.status).toBe('completed');
    // The human-review node re-runs with decision='approve' resolved from
    // the pre-filled context; its output overwrites context.review with
    // { decision, feedback } where feedback is null (not part of the
    // resolved input mapping).
    expect(resumeResult.context).toMatchObject({
      review: { decision: 'approve' },
    });

    // execution.completed fired.
    const names = recorder.getEvents().map((e) => e.event);
    expect(names.filter((n) => n === 'workflow-agents.execution.completed')).toHaveLength(1);
  });
});

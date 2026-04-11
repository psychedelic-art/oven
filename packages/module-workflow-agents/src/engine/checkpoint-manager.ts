import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { agentWorkflowExecutions } from '../schema';
import type { ExecutionStatus } from '../types';

// ─── Checkpoint Data ────────────────────────────────────────

export interface CheckpointData {
  currentState: string;
  context: Record<string, unknown>;
  stepsExecuted: number;
  pendingInput?: Record<string, unknown>;
}

// ─── Resume Data ────────────────────────────────────────────

export interface ResumeData {
  currentState: string;
  context: Record<string, unknown>;
  stepsExecuted: number;
  resumeInput: Record<string, unknown>;
}

// ─── Valid Status Transitions ───────────────────────────────

const VALID_TRANSITIONS: Record<string, ExecutionStatus[]> = {
  pending: ['running', 'cancelled'],
  running: ['paused', 'completed', 'failed', 'cancelled'],
  paused: ['running', 'cancelled'],
  // Terminal states — no transitions allowed
  completed: [],
  failed: [],
  cancelled: [],
};

// ─── Save Checkpoint ────────────────────────────────────────

export async function saveCheckpoint(
  executionId: number,
  data: CheckpointData,
): Promise<Record<string, unknown> | null> {
  const db = getDb();
  const [updated] = await db
    .update(agentWorkflowExecutions)
    .set({
      status: 'paused',
      checkpoint: data,
      currentState: data.currentState,
      context: data.context,
      stepsExecuted: data.stepsExecuted,
    })
    .where(eq(agentWorkflowExecutions.id, executionId))
    .returning();

  await eventBus.emit('workflow-agents.checkpoint.saved', {
    executionId,
    currentState: data.currentState,
    stepsExecuted: data.stepsExecuted,
  });

  await eventBus.emit('workflow-agents.execution.paused', {
    executionId,
    currentState: data.currentState,
  });

  return updated ?? null;
}

// ─── Load Checkpoint ────────────────────────────────────────

export async function loadCheckpoint(executionId: number): Promise<CheckpointData | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(agentWorkflowExecutions)
    .where(eq(agentWorkflowExecutions.id, executionId))
    .limit(1);

  if (rows.length === 0) return null;
  const execution = rows[0] as Record<string, unknown>;
  const checkpoint = execution.checkpoint as CheckpointData | null;
  return checkpoint ?? null;
}

// ─── Resume from Checkpoint ─────────────────────────────────

export async function resumeFromCheckpoint(
  executionId: number,
  input: Record<string, unknown>,
): Promise<ResumeData | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(agentWorkflowExecutions)
    .where(eq(agentWorkflowExecutions.id, executionId))
    .limit(1);

  if (rows.length === 0) return null;
  const execution = rows[0] as Record<string, unknown>;
  if (execution.status !== 'paused') return null;

  const checkpoint = execution.checkpoint as CheckpointData | null;
  if (!checkpoint) return null;

  return {
    currentState: checkpoint.currentState,
    context: checkpoint.context,
    stepsExecuted: checkpoint.stepsExecuted,
    resumeInput: input,
  };
}

// ─── Transition Status ──────────────────────────────────────

export async function transitionStatus(
  executionId: number,
  newStatus: ExecutionStatus,
): Promise<{ success: boolean; error?: string }> {
  const db = getDb();
  const rows = await db
    .select()
    .from(agentWorkflowExecutions)
    .where(eq(agentWorkflowExecutions.id, executionId))
    .limit(1);

  if (rows.length === 0) return { success: false, error: 'Execution not found' };
  const current = (rows[0] as Record<string, unknown>).status as string;

  const allowed = VALID_TRANSITIONS[current] ?? [];
  if (!allowed.includes(newStatus)) {
    return { success: false, error: `Invalid transition: ${current} → ${newStatus}` };
  }

  const updates: Record<string, unknown> = { status: newStatus };
  if (newStatus === 'completed' || newStatus === 'failed' || newStatus === 'cancelled') {
    updates.completedAt = new Date();
  }

  await db
    .update(agentWorkflowExecutions)
    .set(updates)
    .where(eq(agentWorkflowExecutions.id, executionId))
    .returning();

  const eventName = `workflow-agents.execution.${newStatus}` as const;
  await eventBus.emit(eventName, { executionId });

  return { success: true };
}

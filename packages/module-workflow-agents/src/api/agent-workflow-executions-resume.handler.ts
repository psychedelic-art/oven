import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { badRequest, notFound } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { agentWorkflows, agentWorkflowExecutions } from '../schema';
import { resumeFromCheckpoint, transitionStatus } from '../engine/checkpoint-manager';
import { runAgentWorkflow } from '../engine/workflow-engine';
import { eq } from 'drizzle-orm';
import type { AgentWorkflowDefinition, AgentConfig } from '../types';

export async function POST(req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const body = await req.json();
  const db = getDb();

  // Load resume data from checkpoint
  const resumeData = await resumeFromCheckpoint(Number(id), body.input ?? {});
  if (!resumeData) return badRequest('Execution is not paused or has no checkpoint');

  // Transition to running
  const transition = await transitionStatus(Number(id), 'running');
  if (!transition.success) return badRequest(transition.error ?? 'Cannot resume');

  // Load workflow definition
  const execRows = await db.select().from(agentWorkflowExecutions).where(eq(agentWorkflowExecutions.id, Number(id))).limit(1);
  if (execRows.length === 0) return notFound();
  const execution = execRows[0] as Record<string, unknown>;
  const wfRows = await db.select().from(agentWorkflows).where(eq(agentWorkflows.id, execution.workflowId as number)).limit(1);
  if (wfRows.length === 0) return notFound('Workflow not found');

  // Merge resume input into context (for human-review node to consume)
  const mergedContext = { ...resumeData.context, [resumeData.currentState]: { ...body.input, decision: body.input?.decision ?? 'approve' } };

  // Continue execution from checkpoint state
  const definition = (wfRows[0] as Record<string, unknown>).definition as AgentWorkflowDefinition;
  const config = ((wfRows[0] as Record<string, unknown>).agentConfig ?? {}) as AgentConfig;

  const result = await runAgentWorkflow(
    { ...definition, initial: resumeData.currentState },
    { ...config, maxSteps: (config.maxSteps ?? 50) - resumeData.stepsExecuted },
    mergedContext,
    { executionId: Number(id), tenantId: execution.tenantId as number | undefined },
  );

  // Update execution record
  await db.update(agentWorkflowExecutions).set({
    status: result.status,
    context: result.context,
    stepsExecuted: resumeData.stepsExecuted + result.stepsExecuted,
    completedAt: result.status === 'completed' ? new Date() : null,
    error: result.error ?? null,
    checkpoint: null, // Clear checkpoint after resume
  }).where(eq(agentWorkflowExecutions.id, Number(id)));

  return NextResponse.json({ executionId: Number(id), ...result });
}

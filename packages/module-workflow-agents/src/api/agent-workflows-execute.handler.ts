import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { badRequest, notFound } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { agentWorkflows, agentWorkflowExecutions } from '../schema';
import { runAgentWorkflow } from '../engine/workflow-engine';
import { eq } from 'drizzle-orm';
import type { AgentWorkflowDefinition, AgentConfig } from '../types';

export async function POST(req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const body = await req.json();
  const db = getDb();

  // Load workflow
  const rows = await db.select().from(agentWorkflows).where(eq(agentWorkflows.id, Number(id)));
  if (rows.length === 0) return notFound('Workflow not found');
  const workflow = rows[0];
  if (workflow.status !== 'active') return badRequest('Workflow is not active');

  // Build initial context with trigger wrapper
  // The payload goes under `trigger` so definitions can reference $.trigger.message, $.trigger.messages etc.
  const triggerPayload = body.payload ?? {};
  const conversationMessages = body.messages ?? [];
  const initialContext = {
    trigger: {
      ...triggerPayload,
      messages: conversationMessages,
    },
  };

  // Create execution record
  const [execution] = await db.insert(agentWorkflowExecutions).values({
    workflowId: workflow.id,
    tenantId: workflow.tenantId,
    status: 'running',
    triggerSource: body.triggerSource ?? 'api',
    triggerPayload,
    context: initialContext,
    currentState: (workflow.definition as AgentWorkflowDefinition).initial,
  }).returning();

  // Run workflow
  const definition = workflow.definition as AgentWorkflowDefinition;
  const config = (workflow.agentConfig ?? {}) as AgentConfig;
  const result = await runAgentWorkflow(
    definition,
    config,
    initialContext,
    { executionId: execution.id, tenantId: workflow.tenantId ?? undefined },
  );

  // Update execution record
  await db.update(agentWorkflowExecutions).set({
    status: result.status,
    context: result.context,
    stepsExecuted: result.stepsExecuted,
    completedAt: result.status === 'completed' ? new Date() : null,
    error: result.error ?? null,
  }).where(eq(agentWorkflowExecutions.id, execution.id));

  return NextResponse.json({
    executionId: execution.id,
    ...result,
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound, badRequest } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { flowItems, flowTransitions, flowStages } from '../schema';

// POST /api/flow-items/[id]/transition — Transition a flow item to a different stage
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();
  const { toStageId, action, reason, performedBy, metadata } = body;

  if (!toStageId || !action) {
    return badRequest('toStageId and action are required');
  }

  // Get current flow item
  const [item] = await db
    .select()
    .from(flowItems)
    .where(eq(flowItems.id, parseInt(id, 10)));

  if (!item) return notFound('Flow item not found');

  const fromStageId = item.currentStageId;

  // Create transition record
  const [transition] = await db
    .insert(flowTransitions)
    .values({
      flowItemId: item.id,
      fromStageId: fromStageId ?? null,
      toStageId,
      action,
      performedBy: performedBy ?? null,
      reason: reason ?? null,
      metadata: metadata ?? null,
    })
    .returning();

  // Check if the target stage is terminal (stageType = 'terminal' or 'complete')
  const [toStage] = await db
    .select()
    .from(flowStages)
    .where(eq(flowStages.id, toStageId));

  const isTerminal = toStage && (toStage.stageType === 'terminal' || toStage.stageType === 'complete');
  const newStatus = isTerminal ? 'completed' : 'active';

  // Update flow item's current stage and status
  const [updated] = await db
    .update(flowItems)
    .set({
      currentStageId: toStageId,
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(flowItems.id, item.id))
    .returning();

  // Emit stage-changed event
  eventBus.emit('flows.item.stage-changed', {
    id: item.id,
    flowId: item.flowId,
    fromStageId,
    toStageId,
    action,
    performedBy: performedBy ?? null,
  });

  // If terminal stage, also emit completed event
  if (isTerminal) {
    eventBus.emit('flows.item.completed', {
      id: item.id,
      flowId: item.flowId,
      tenantId: item.tenantId,
    });
  }

  return NextResponse.json({
    item: updated,
    transition,
  });
}

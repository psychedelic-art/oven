import { NextRequest, NextResponse } from 'next/server';
import { notFound, badRequest } from '@oven/module-registry/api-utils';
import { workflowEngine } from '../engine';

/**
 * POST /api/workflows/[id]/execute
 * Execute a workflow with the given payload.
 * Returns the execution ID for tracking.
 */
export async function POST(
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) {
  const { id } = (await context?.params) ?? {};
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return notFound('Invalid workflow ID');

  let payload: Record<string, unknown> = {};
  try {
    payload = await request.json();
  } catch {
    // Empty body is OK — some workflows don't need input
  }

  try {
    const executionId = await workflowEngine.executeWorkflow(
      numId,
      payload,
      'manual'
    );

    return NextResponse.json({ executionId }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return badRequest(message);
  }
}

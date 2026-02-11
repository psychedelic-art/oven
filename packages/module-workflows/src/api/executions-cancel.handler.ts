import { NextRequest, NextResponse } from 'next/server';
import { notFound } from '@oven/module-registry/api-utils';
import { workflowEngine } from '../engine';

/**
 * POST /api/workflow-executions/[id]/cancel
 * Cancel a running workflow execution.
 */
export async function POST(
  _request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) {
  const { id } = (await context?.params) ?? {};
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return notFound('Invalid execution ID');

  try {
    await workflowEngine.cancelWorkflow(numId);
    return NextResponse.json({ success: true, executionId: numId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

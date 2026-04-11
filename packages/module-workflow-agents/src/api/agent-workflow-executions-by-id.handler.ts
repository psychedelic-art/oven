import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { notFound } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { agentWorkflowExecutions, agentWorkflowNodeExecutions } from '../schema';
import { eq } from 'drizzle-orm';

export async function GET(_req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const db = getDb();
  const rows = await db.select().from(agentWorkflowExecutions).where(eq(agentWorkflowExecutions.id, Number(id)));
  if (rows.length === 0) return notFound();
  // Include node executions
  const nodes = await db.select().from(agentWorkflowNodeExecutions).where(eq(agentWorkflowNodeExecutions.executionId, Number(id)));
  return NextResponse.json({ ...rows[0], nodeExecutions: nodes });
}

import { eq, and, sql, gte, lte, desc } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { agentWorkflowExecutions, agentWorkflowNodeExecutions } from '../schema';

// ─── Workflow Metrics ───────────────────────────────────────

export interface WorkflowMetrics {
  totalExecutions: number;
  completed: number;
  failed: number;
  successRate: number;
  avgDurationMs: number;
  avgSteps: number;
  totalTokens: number;
  totalCostCents: number;
}

export async function getWorkflowMetrics(
  workflowId: number,
  dateFrom?: Date,
  dateTo?: Date,
): Promise<WorkflowMetrics> {
  const db = getDb();
  const conditions = [eq(agentWorkflowExecutions.workflowId, workflowId)];
  if (dateFrom) conditions.push(gte(agentWorkflowExecutions.startedAt, dateFrom));
  if (dateTo) conditions.push(lte(agentWorkflowExecutions.startedAt, dateTo));

  const rows = await db
    .select({
      total: sql<number>`count(*)`,
      completed: sql<number>`count(*) filter (where ${agentWorkflowExecutions.status} = 'completed')`,
      failed: sql<number>`count(*) filter (where ${agentWorkflowExecutions.status} = 'failed')`,
      avgSteps: sql<number>`avg(${agentWorkflowExecutions.stepsExecuted})`,
    })
    .from(agentWorkflowExecutions)
    .where(and(...conditions));

  const r = rows[0] ?? { total: 0, completed: 0, failed: 0, avgSteps: 0 };
  const total = Number(r.total);
  const completed = Number(r.completed);
  const failed = Number(r.failed);

  return {
    totalExecutions: total,
    completed,
    failed,
    successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    avgDurationMs: 0, // Requires completedAt - startedAt aggregation
    avgSteps: Math.round(Number(r.avgSteps) || 0),
    totalTokens: 0, // Would require JSONB aggregation on context
    totalCostCents: 0,
  };
}

// ─── Node Metrics ───────────────────────────────────────────

export interface NodeMetrics {
  nodeId: string;
  executionCount: number;
  successRate: number;
  avgDurationMs: number;
  errors: string[];
}

export async function getNodeMetrics(workflowId: number): Promise<NodeMetrics[]> {
  const db = getDb();

  // Get execution IDs for this workflow
  const execIds = await db
    .select({ id: agentWorkflowExecutions.id })
    .from(agentWorkflowExecutions)
    .where(eq(agentWorkflowExecutions.workflowId, workflowId));

  if (execIds.length === 0) return [];

  const rows = await db
    .select({
      nodeId: agentWorkflowNodeExecutions.nodeId,
      total: sql<number>`count(*)`,
      completed: sql<number>`count(*) filter (where ${agentWorkflowNodeExecutions.status} = 'completed')`,
      avgDuration: sql<number>`avg(${agentWorkflowNodeExecutions.durationMs})`,
    })
    .from(agentWorkflowNodeExecutions)
    .where(sql`${agentWorkflowNodeExecutions.executionId} in (${sql.join(execIds.map(e => sql`${e.id}`), sql`,`)})`)
    .groupBy(agentWorkflowNodeExecutions.nodeId);

  return rows.map(r => ({
    nodeId: r.nodeId as string,
    executionCount: Number(r.total),
    successRate: Number(r.total) > 0 ? Math.round((Number(r.completed) / Number(r.total)) * 100) : 0,
    avgDurationMs: Math.round(Number(r.avgDuration) || 0),
    errors: [],
  }));
}

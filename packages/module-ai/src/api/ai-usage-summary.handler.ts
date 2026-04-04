import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { sql, eq, and, gte, lte, desc } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { badRequest } from '@oven/module-registry/api-utils';
import { aiUsageLogs } from '../schema';

const VALID_GROUP_BY = ['provider', 'model', 'day'] as const;
type GroupBy = typeof VALID_GROUP_BY[number];

// GET /api/ai/usage/summary — Aggregated usage data
export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);

  const tenantId = searchParams.get('tenantId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const groupBy = searchParams.get('groupBy') as GroupBy | null;

  if (groupBy && !VALID_GROUP_BY.includes(groupBy)) {
    return badRequest(`groupBy must be one of: ${VALID_GROUP_BY.join(', ')}`);
  }

  const conditions: any[] = [];
  if (tenantId) {
    conditions.push(eq(aiUsageLogs.tenantId, parseInt(tenantId, 10)));
  }
  if (startDate) {
    conditions.push(gte(aiUsageLogs.createdAt, new Date(startDate)));
  }
  if (endDate) {
    conditions.push(lte(aiUsageLogs.createdAt, new Date(endDate)));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Total aggregation
  const [totals] = await db
    .select({
      totalRequests: sql<number>`count(*)::int`,
      totalInputTokens: sql<number>`coalesce(sum(${aiUsageLogs.inputTokens}), 0)::int`,
      totalOutputTokens: sql<number>`coalesce(sum(${aiUsageLogs.outputTokens}), 0)::int`,
      totalTokens: sql<number>`coalesce(sum(${aiUsageLogs.totalTokens}), 0)::int`,
      totalCostCents: sql<number>`coalesce(sum(${aiUsageLogs.costCents}), 0)::int`,
      avgLatencyMs: sql<number>`coalesce(avg(${aiUsageLogs.latencyMs}), 0)::int`,
    })
    .from(aiUsageLogs)
    .where(where);

  // Grouped breakdown
  let breakdown: any[] = [];

  if (groupBy === 'provider') {
    breakdown = await db
      .select({
        providerId: aiUsageLogs.providerId,
        requests: sql<number>`count(*)::int`,
        inputTokens: sql<number>`coalesce(sum(${aiUsageLogs.inputTokens}), 0)::int`,
        outputTokens: sql<number>`coalesce(sum(${aiUsageLogs.outputTokens}), 0)::int`,
        totalTokens: sql<number>`coalesce(sum(${aiUsageLogs.totalTokens}), 0)::int`,
        costCents: sql<number>`coalesce(sum(${aiUsageLogs.costCents}), 0)::int`,
      })
      .from(aiUsageLogs)
      .where(where)
      .groupBy(aiUsageLogs.providerId);
  } else if (groupBy === 'model') {
    breakdown = await db
      .select({
        modelId: aiUsageLogs.modelId,
        requests: sql<number>`count(*)::int`,
        inputTokens: sql<number>`coalesce(sum(${aiUsageLogs.inputTokens}), 0)::int`,
        outputTokens: sql<number>`coalesce(sum(${aiUsageLogs.outputTokens}), 0)::int`,
        totalTokens: sql<number>`coalesce(sum(${aiUsageLogs.totalTokens}), 0)::int`,
        costCents: sql<number>`coalesce(sum(${aiUsageLogs.costCents}), 0)::int`,
      })
      .from(aiUsageLogs)
      .where(where)
      .groupBy(aiUsageLogs.modelId);
  } else if (groupBy === 'day') {
    breakdown = await db
      .select({
        date: sql<string>`date_trunc('day', ${aiUsageLogs.createdAt})::date::text`,
        requests: sql<number>`count(*)::int`,
        inputTokens: sql<number>`coalesce(sum(${aiUsageLogs.inputTokens}), 0)::int`,
        outputTokens: sql<number>`coalesce(sum(${aiUsageLogs.outputTokens}), 0)::int`,
        totalTokens: sql<number>`coalesce(sum(${aiUsageLogs.totalTokens}), 0)::int`,
        costCents: sql<number>`coalesce(sum(${aiUsageLogs.costCents}), 0)::int`,
      })
      .from(aiUsageLogs)
      .where(where)
      .groupBy(sql`date_trunc('day', ${aiUsageLogs.createdAt})`);
  }

  // Fetch recent logs for the dashboard table
  const recentLogs = await db
    .select()
    .from(aiUsageLogs)
    .where(where)
    .orderBy(desc(aiUsageLogs.createdAt))
    .limit(20);

  // Return flat structure matching what AIUsageDashboard expects
  return NextResponse.json({
    // Flat totals (dashboard reads data.totalTokens, data.totalCostCents, etc.)
    totalTokens: totals.totalTokens,
    totalCostCents: totals.totalCostCents,
    avgLatencyMs: totals.avgLatencyMs,
    totalCalls: totals.totalRequests,
    totalInputTokens: totals.totalInputTokens,
    totalOutputTokens: totals.totalOutputTokens,
    // Nested for detailed views
    totals,
    ...(groupBy ? { breakdown } : {}),
    recentLogs,
    filters: {
      tenantId: tenantId ? parseInt(tenantId, 10) : null,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      groupBy: groupBy ?? null,
    },
  });
}

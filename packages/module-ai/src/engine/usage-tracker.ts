import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { usageMeteringService } from '@oven/module-subscriptions';
import { aiUsageLogs, aiBudgets, aiBudgetAlerts } from '../schema';
import { calculateCost } from './cost-calculator';
import { eq, and, sql } from 'drizzle-orm';

// ─── Types ───────────────────────────────────────────────────

export interface TrackAIUsageParams {
  tenantId: number;
  inputTokens: number;
  outputTokens: number;
  model: string;
  provider: string;
  latencyMs: number;
  toolName?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface AIQuotaResult {
  allowed: boolean;
  remaining: number;
}

// ─── Usage Tracking ──────────────────────────────────────────

/**
 * Track AI usage by:
 * 1. Logging to ai_usage_logs table
 * 2. Forwarding to UsageMeteringService for quota tracking
 * 3. Updating budgets and emitting events if thresholds reached
 */
export async function trackAIUsage(params: TrackAIUsageParams): Promise<void> {
  const {
    tenantId,
    inputTokens,
    outputTokens,
    model,
    provider,
    latencyMs,
    toolName,
    status = 'success',
    metadata,
  } = params;

  const costCents = calculateCost(model, inputTokens, outputTokens);
  const totalTokens = inputTokens + outputTokens;
  const db = getDb();

  // 1. Log to ai_usage_logs
  await db.insert(aiUsageLogs).values({
    tenantId,
    modelId: model,
    toolName: toolName ?? null,
    inputTokens,
    outputTokens,
    totalTokens,
    costCents: Math.round(costCents * 100), // Store as integer cents
    latencyMs,
    status,
    requestMetadata: metadata ?? null,
  });

  // 2. Track prompt tokens via subscription metering
  if (inputTokens > 0) {
    await usageMeteringService.trackUsage({
      tenantId,
      serviceSlug: 'llm-prompt-tokens',
      amount: inputTokens,
      upstreamCostCents: Math.round((inputTokens / 1_000_000) * (getCostRate(model, 'input'))),
      metadata: { model, provider, toolName },
    });
  }

  // 3. Track completion tokens via subscription metering
  if (outputTokens > 0) {
    await usageMeteringService.trackUsage({
      tenantId,
      serviceSlug: 'llm-completion-tokens',
      amount: outputTokens,
      upstreamCostCents: Math.round((outputTokens / 1_000_000) * (getCostRate(model, 'output'))),
      metadata: { model, provider, toolName },
    });
  }

  // 4. Update budgets and check thresholds
  await updateBudgets(tenantId, totalTokens, costCents);

  // 5. Emit call completed event
  await eventBus.emit('ai.call.completed', {
    tenantId,
    model,
    provider,
    inputTokens,
    outputTokens,
    costCents,
    latencyMs,
    toolName: toolName ?? null,
  });
}

/**
 * Check if a tenant has enough AI quota for an estimated operation.
 */
export async function checkAIQuota(
  tenantId: number,
  estimatedTokens: number = 0
): Promise<AIQuotaResult> {
  const promptResult = await usageMeteringService.checkQuota(
    tenantId,
    'llm-prompt-tokens',
    estimatedTokens
  );

  return {
    allowed: promptResult.allowed,
    remaining: promptResult.remaining,
  };
}

// ─── Private Helpers ─────────────────────────────────────────

function getCostRate(model: string, type: 'input' | 'output'): number {
  // Import inline to avoid circular dependency issues
  const { getModelPricing } = require('./cost-calculator');
  const pricing = getModelPricing(model);
  if (!pricing) return 0;
  return type === 'input' ? pricing.inputPerMToken : pricing.outputPerMToken;
}

async function updateBudgets(
  tenantId: number,
  totalTokens: number,
  costCents: number
): Promise<void> {
  const db = getDb();

  // Find applicable budgets (tenant-scoped or global)
  const budgets = await db
    .select()
    .from(aiBudgets)
    .where(
      and(
        eq(aiBudgets.enabled, true),
        eq(aiBudgets.scope, 'tenant'),
        eq(aiBudgets.scopeId, String(tenantId)),
      )
    );

  for (const budget of budgets) {
    // Update counters
    await db
      .update(aiBudgets)
      .set({
        currentTokens: sql`${aiBudgets.currentTokens} + ${totalTokens}`,
        currentCostCents: sql`${aiBudgets.currentCostCents} + ${Math.round(costCents * 100)}`,
        updatedAt: new Date(),
      })
      .where(eq(aiBudgets.id, budget.id));

    // Check thresholds
    const newTokens = budget.currentTokens + totalTokens;
    const newCost = budget.currentCostCents + Math.round(costCents * 100);
    const tokenPct = budget.tokenLimit > 0 ? (newTokens / budget.tokenLimit) * 100 : 0;
    const costPct = budget.costLimitCents > 0 ? (newCost / budget.costLimitCents) * 100 : 0;
    const maxPct = Math.max(tokenPct, costPct);

    if (maxPct >= 100) {
      await db.insert(aiBudgetAlerts).values({
        budgetId: budget.id,
        type: 'exceeded',
        message: `Budget exceeded: ${Math.round(maxPct)}% utilized`,
      });
      await eventBus.emit('ai.budget.exceeded', {
        tenantId,
        budgetId: budget.id,
        tokenPct: Math.round(tokenPct),
        costPct: Math.round(costPct),
      });
    } else if (maxPct >= budget.alertThresholdPct) {
      await db.insert(aiBudgetAlerts).values({
        budgetId: budget.id,
        type: 'warning',
        message: `Budget warning: ${Math.round(maxPct)}% utilized (threshold: ${budget.alertThresholdPct}%)`,
      });
      await eventBus.emit('ai.budget.warning', {
        tenantId,
        budgetId: budget.id,
        tokenPct: Math.round(tokenPct),
        costPct: Math.round(costPct),
        threshold: budget.alertThresholdPct,
      });
    }
  }
}

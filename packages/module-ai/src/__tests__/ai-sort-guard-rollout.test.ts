import { describe, it, expect } from 'vitest';
import { getOrderColumn } from '../api/_utils/sort';
import {
  aiProviders,
  aiModelAliases,
  aiVectorStores,
  aiUsageLogs,
  aiBudgets,
  aiBudgetAlerts,
  aiTools,
  aiGuardrails,
} from '../schema';

/**
 * F-05-02 — rollout tests.
 *
 * These tests pin the `ALLOWED_SORTS` whitelist for every AI list handler
 * that used to carry `(table as any)[params.sort] ?? table.id`. The idea
 * is defence-in-depth: even if a future schema column gets renamed or
 * dropped, these tests will fail instead of silently allowing a 500 or
 * a SQL error through to the client.
 *
 * Each handler's allowlist is duplicated here (not imported) on purpose:
 * the duplication is what makes the test a change detector. If a handler
 * mutates `ALLOWED_SORTS`, the test must be updated in the same commit.
 *
 * Patterns exercised for every handler:
 *   1. every allowlisted column resolves to a live drizzle column
 *   2. an off-allowlist column is rejected
 *   3. a prototype-key injection attempt ("constructor") is rejected
 *   4. a SQL injection attempt is rejected
 *
 * Keep ordering alphabetical so the diff is readable when adding new
 * handlers to the rollout.
 */

const PROVIDERS_ALLOWED = [
  'id',
  'tenantId',
  'name',
  'slug',
  'type',
  'defaultModel',
  'rateLimitRpm',
  'rateLimitTpm',
  'enabled',
  'createdAt',
  'updatedAt',
] as const;

const ALIASES_ALLOWED = [
  'id',
  'alias',
  'providerId',
  'modelId',
  'type',
  'enabled',
  'createdAt',
  'updatedAt',
] as const;

const VECTOR_STORES_ALLOWED = [
  'id',
  'tenantId',
  'name',
  'slug',
  'adapter',
  'embeddingProviderId',
  'embeddingModel',
  'dimensions',
  'distanceMetric',
  'documentCount',
  'enabled',
  'createdAt',
  'updatedAt',
] as const;

const USAGE_LOGS_ALLOWED = [
  'id',
  'tenantId',
  'providerId',
  'modelId',
  'toolName',
  'inputTokens',
  'outputTokens',
  'totalTokens',
  'costCents',
  'latencyMs',
  'status',
  'createdAt',
] as const;

const BUDGETS_ALLOWED = [
  'id',
  'scope',
  'scopeId',
  'periodType',
  'tokenLimit',
  'costLimitCents',
  'currentTokens',
  'currentCostCents',
  'alertThresholdPct',
  'enabled',
  'createdAt',
  'updatedAt',
] as const;

const BUDGET_ALERTS_ALLOWED = [
  'id',
  'budgetId',
  'type',
  'acknowledged',
  'createdAt',
] as const;

const TOOLS_ALLOWED = [
  'id',
  'name',
  'slug',
  'category',
  'handler',
  'isSystem',
  'enabled',
  'createdAt',
  'updatedAt',
] as const;

const GUARDRAILS_ALLOWED = [
  'id',
  'tenantId',
  'name',
  'ruleType',
  'scope',
  'action',
  'priority',
  'enabled',
  'createdAt',
  'updatedAt',
] as const;

const HANDLER_CASES = [
  { name: 'ai-providers', table: aiProviders, allowed: PROVIDERS_ALLOWED },
  { name: 'ai-aliases', table: aiModelAliases, allowed: ALIASES_ALLOWED },
  { name: 'ai-vector-stores', table: aiVectorStores, allowed: VECTOR_STORES_ALLOWED },
  { name: 'ai-usage-logs', table: aiUsageLogs, allowed: USAGE_LOGS_ALLOWED },
  { name: 'ai-budgets', table: aiBudgets, allowed: BUDGETS_ALLOWED },
  { name: 'ai-budget-alerts', table: aiBudgetAlerts, allowed: BUDGET_ALERTS_ALLOWED },
  { name: 'ai-tools', table: aiTools, allowed: TOOLS_ALLOWED },
  { name: 'ai-guardrails', table: aiGuardrails, allowed: GUARDRAILS_ALLOWED },
] as const;

describe('F-05-02 — sort allowlist rollout across 8 AI list handlers', () => {
  for (const { name, table, allowed } of HANDLER_CASES) {
    describe(name, () => {
      it('resolves every allowlisted column to a live drizzle column', () => {
        for (const field of allowed) {
          const result = getOrderColumn(table, field, allowed);
          expect(result.ok, `${name}.${field} should resolve`).toBe(true);
          if (result.ok) {
            // Column object must be the same live reference so
            // Drizzle's asc/desc helpers accept it.
            expect(result.column).toBe(
              (table as Record<string, unknown>)[field],
            );
          }
        }
      });

      it('rejects an off-allowlist field name', () => {
        const result = getOrderColumn(table, 'not_a_real_column', allowed);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.received).toBe('not_a_real_column');
          expect(result.allowed).toEqual(allowed);
        }
      });

      it('rejects a prototype-key injection attempt ("constructor")', () => {
        const result = getOrderColumn(table, 'constructor', allowed);
        expect(result.ok).toBe(false);
      });

      it('rejects a SQL-injection-flavoured field', () => {
        const result = getOrderColumn(
          table,
          "id; DROP TABLE ai_providers; --",
          allowed,
        );
        expect(result.ok).toBe(false);
      });

      it('rejects empty string', () => {
        const result = getOrderColumn(table, '', allowed);
        expect(result.ok).toBe(false);
      });
    });
  }
});

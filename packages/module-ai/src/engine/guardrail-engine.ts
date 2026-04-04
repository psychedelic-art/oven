import { eq, and, or, isNull, asc } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { aiGuardrails } from '../schema';
import type { GuardrailResult, GuardrailAction, GuardrailScope } from '../types';

// ─── Types ───────────────────────────────────────────────────

interface GuardrailRule {
  id: number;
  tenantId: number | null;
  name: string;
  ruleType: string;
  pattern: string;
  scope: string;
  action: string;
  message: string | null;
  priority: number;
}

// ─── Engine ──────────────────────────────────────────────────

/**
 * Evaluate text against guardrail rules.
 *
 * Chain of Responsibility: rules are evaluated in priority order (ascending).
 * The first rule that matches determines the result.
 * If no rules match, the text passes.
 */
export async function evaluateGuardrails(
  text: string,
  scope: GuardrailScope,
  tenantId?: number
): Promise<GuardrailResult> {
  const rules = await loadRules(scope, tenantId);

  for (const rule of rules) {
    const matched = evaluateRule(rule, text);
    if (matched) {
      // Emit guardrail triggered event
      await eventBus.emit('ai.guardrail.triggered', {
        ruleId: rule.id,
        ruleName: rule.name,
        ruleType: rule.ruleType,
        action: rule.action,
        scope,
        tenantId: tenantId ?? null,
      });

      return {
        passed: rule.action === 'warn',
        action: rule.action as GuardrailAction,
        message: rule.message ?? `Content blocked by guardrail: ${rule.name}`,
        ruleId: rule.id,
      };
    }
  }

  return { passed: true, action: 'warn' };
}

// ─── Private ─────────────────────────────────────────────────

async function loadRules(scope: GuardrailScope, tenantId?: number): Promise<GuardrailRule[]> {
  const db = getDb();

  // Load rules matching the scope (or 'both'), filtered by tenantId + global rules
  const tenantFilter = tenantId
    ? or(eq(aiGuardrails.tenantId, tenantId), isNull(aiGuardrails.tenantId))
    : isNull(aiGuardrails.tenantId);

  const scopeFilter = scope === 'input' || scope === 'output'
    ? or(eq(aiGuardrails.scope, scope), eq(aiGuardrails.scope, 'both'))
    : eq(aiGuardrails.scope, scope);

  const rows = await db
    .select()
    .from(aiGuardrails)
    .where(
      and(
        tenantFilter,
        scopeFilter,
        eq(aiGuardrails.enabled, true),
      )
    )
    .orderBy(asc(aiGuardrails.priority));

  return rows as GuardrailRule[];
}

function evaluateRule(rule: GuardrailRule, text: string): boolean {
  switch (rule.ruleType) {
    case 'keyword':
      return evaluateKeyword(rule.pattern, text);
    case 'regex':
      return evaluateRegex(rule.pattern, text);
    case 'classifier':
      // Placeholder for future ML classifier integration
      return false;
    default:
      return false;
  }
}

function evaluateKeyword(pattern: string, text: string): boolean {
  // Support comma-separated keywords
  const keywords = pattern.split(',').map((k) => k.trim().toLowerCase());
  const lowerText = text.toLowerCase();
  return keywords.some((keyword) => lowerText.includes(keyword));
}

function evaluateRegex(pattern: string, text: string): boolean {
  try {
    const regex = new RegExp(pattern, 'i');
    return regex.test(text);
  } catch {
    // Invalid regex pattern, skip rule
    return false;
  }
}

import { getDb } from '@oven/module-registry/db';
import { agentEvalRuns } from '../schema';

// ─── Eval Types ─────────────────────────────────────────────

export interface EvalDefinition {
  id: number;
  evalType: 'rule' | 'llm';
  config: RuleEvalConfig | LLMEvalConfig;
}

export interface RuleEvalConfig {
  type: 'rule';
  checks: Array<{
    field: string; // path in execution output
    operator: 'contains' | 'not_contains' | 'matches' | 'min_length' | 'max_length' | 'is_json';
    value?: string | number;
  }>;
}

export interface LLMEvalConfig {
  type: 'llm';
  prompt: string; // Scoring prompt template
  model?: string;
  passingScore?: number; // 0-100, default 70
}

export interface EvalResult {
  score: number; // 0-100
  passed: boolean;
  details: Record<string, unknown>;
}

// ─── Run Evaluation ─────────────────────────────────────────

export async function runEvaluation(
  definition: EvalDefinition,
  executionOutput: Record<string, unknown>,
): Promise<EvalResult> {
  if (definition.evalType === 'rule') {
    return runRuleEval(definition.config as RuleEvalConfig, executionOutput);
  }
  if (definition.evalType === 'llm') {
    return runLLMEval(definition.config as LLMEvalConfig, executionOutput);
  }
  return { score: 0, passed: false, details: { error: 'Unknown eval type' } };
}

// ─── Rule-Based Eval ────────────────────────────────────────

function runRuleEval(config: RuleEvalConfig, output: Record<string, unknown>): EvalResult {
  const checks = config.checks ?? [];
  if (checks.length === 0) return { score: 100, passed: true, details: { message: 'No checks defined' } };

  let passedChecks = 0;
  const checkResults: Array<{ field: string; operator: string; passed: boolean; actual?: unknown }> = [];

  for (const check of checks) {
    const value = resolveField(output, check.field);
    const textValue = typeof value === 'string' ? value : JSON.stringify(value ?? '');
    let passed = false;

    switch (check.operator) {
      case 'contains':
        passed = textValue.includes(String(check.value ?? ''));
        break;
      case 'not_contains':
        passed = !textValue.includes(String(check.value ?? ''));
        break;
      case 'matches':
        try { passed = new RegExp(String(check.value ?? '')).test(textValue); } catch { passed = false; }
        break;
      case 'min_length':
        passed = textValue.length >= Number(check.value ?? 0);
        break;
      case 'max_length':
        passed = textValue.length <= Number(check.value ?? Infinity);
        break;
      case 'is_json':
        try { JSON.parse(textValue); passed = true; } catch { passed = false; }
        break;
    }

    if (passed) passedChecks++;
    checkResults.push({ field: check.field, operator: check.operator, passed, actual: textValue.slice(0, 100) });
  }

  const score = Math.round((passedChecks / checks.length) * 100);
  return { score, passed: score >= 70, details: { checks: checkResults, passedChecks, totalChecks: checks.length } };
}

// ─── LLM-Based Eval ─────────────────────────────────────────

async function runLLMEval(config: LLMEvalConfig, output: Record<string, unknown>): Promise<EvalResult> {
  try {
    const { aiGenerateText } = await import('@oven/module-ai');
    const prompt = config.prompt.replace('{{output}}', JSON.stringify(output));
    const result = await aiGenerateText({ prompt, model: config.model ?? 'fast', temperature: 0 });

    // Try to extract a numeric score from LLM response
    const scoreMatch = result.text.match(/(\d+)/);
    const score = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1]))) : 50;
    const passingScore = config.passingScore ?? 70;

    return { score, passed: score >= passingScore, details: { llmResponse: result.text, model: result.model } };
  } catch (err) {
    return { score: 0, passed: false, details: { error: err instanceof Error ? err.message : String(err) } };
  }
}

// ─── Record Eval Run ────────────────────────────────────────

export async function recordEvalRun(
  evalDefinitionId: number,
  executionId: number,
  result: EvalResult,
): Promise<void> {
  const db = getDb();
  await db.insert(agentEvalRuns).values({
    evalDefinitionId,
    executionId,
    score: result.score,
    passed: result.passed,
    details: result.details,
  });
}

// ─── Helpers ────────────────────────────────────────────────

function resolveField(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

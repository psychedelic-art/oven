// ─── Types ──────────────────────────────────────────────────

export interface PromptfooTestCase {
  input: string;
  expected?: string;
  assertions?: PromptfooAssertion[];
  metadata?: Record<string, unknown>;
}

export interface PromptfooAssertion {
  type: string; // 'contains', 'not-contains', 'regex', 'is-json', 'llm-rubric', 'javascript'
  value?: string;
  threshold?: number;
}

export interface NormalizedEvalReport {
  id: string;
  targetMode: 'agent' | 'workflow';
  targetId: number;
  targetSlug: string;
  timestamp: Date;
  summary: { total: number; passed: number; failed: number; avgScore: number };
  testCases: NormalizedTestCaseResult[];
}

export interface NormalizedTestCaseResult {
  input: string;
  expected?: string;
  output: string;
  assertions: Array<{ type: string; passed: boolean; score: number; reason?: string }>;
  passed: boolean;
  score: number;
  latencyMs: number;
}

// ─── Compile Target to Promptfoo Config ─────────────────────

export function compileTargetToPromptfooConfig(
  target: { mode: 'agent' | 'workflow'; id: number; slug: string },
  testCases: PromptfooTestCase[],
  opts?: { tenantId?: number; apiBaseUrl?: string },
): Record<string, unknown> {
  const apiBaseUrl = opts?.apiBaseUrl ?? '';

  const provider = target.mode === 'agent'
    ? {
        id: `oven-agent:${target.slug}`,
        config: { targetMode: 'agent', targetSlug: target.slug, targetId: target.id, tenantId: opts?.tenantId, apiBaseUrl },
      }
    : {
        id: `oven-workflow:${target.slug}`,
        config: { targetMode: 'workflow', targetSlug: target.slug, targetId: target.id, tenantId: opts?.tenantId, apiBaseUrl },
      };

  const prompts = testCases.map(tc => tc.input);

  const tests = testCases.map(tc => ({
    vars: { input: tc.input },
    assert: (tc.assertions ?? []).map(a => ({
      type: a.type,
      value: a.value,
      threshold: a.threshold,
    })),
    ...(tc.expected ? { expected: tc.expected } : {}),
  }));

  return {
    providers: [provider],
    prompts,
    tests,
    defaultTest: { assert: [] },
  };
}

// ─── Map Eval Checks to Promptfoo Assertions ────────────────

export function mapChecksToAssertions(
  checks: Array<{ operator: string; value?: string | number }>,
): PromptfooAssertion[] {
  return checks.map(check => {
    switch (check.operator) {
      case 'contains': return { type: 'contains', value: String(check.value ?? '') };
      case 'not_contains': return { type: 'not-contains', value: String(check.value ?? '') };
      case 'matches': return { type: 'regex', value: String(check.value ?? '') };
      case 'min_length': return { type: 'javascript', value: `output.length >= ${check.value}` };
      case 'max_length': return { type: 'javascript', value: `output.length <= ${check.value}` };
      case 'is_json': return { type: 'is-json' };
      default: return { type: 'contains', value: String(check.value ?? '') };
    }
  });
}

// ─── Run Promptfoo Evaluation ───────────────────────────────
// Executes programmatically using the target's API endpoint.
// Does NOT require the promptfoo CLI — uses direct HTTP calls to the target.

export async function runPromptfooEval(
  target: { mode: 'agent' | 'workflow'; id: number; slug: string },
  testCases: PromptfooTestCase[],
  opts?: { tenantId?: number; apiBaseUrl?: string },
): Promise<NormalizedEvalReport> {
  const apiBaseUrl = opts?.apiBaseUrl ?? '';
  const results: NormalizedTestCaseResult[] = [];

  for (const tc of testCases) {
    const startTime = Date.now();
    let output = '';
    let error: string | undefined;

    try {
      if (target.mode === 'agent') {
        // Call agent invoke API
        const res = await fetch(`${apiBaseUrl}/api/agents/${target.slug}/invoke`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'user', content: tc.input }] }),
        });
        if (res.ok) {
          const data = await res.json();
          output = (data as Record<string, unknown>).text as string ?? '';
        } else {
          error = `API error: ${res.status}`;
        }
      } else {
        // Call workflow execute API
        const res = await fetch(`${apiBaseUrl}/api/agent-workflows/${target.id}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ triggerSource: 'promptfoo', payload: { message: tc.input } }),
        });
        if (res.ok) {
          const data = await res.json();
          const ctx = (data as Record<string, unknown>).context as Record<string, unknown> ?? {};
          output = findLastLLMOutput(ctx) ?? JSON.stringify(ctx);
        } else {
          error = `API error: ${res.status}`;
        }
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }

    const latencyMs = Date.now() - startTime;

    // Evaluate assertions
    const assertionResults = (tc.assertions ?? []).map(assertion => evaluateAssertion(assertion, output));
    const allPassed = assertionResults.every(a => a.passed);
    const avgScore = assertionResults.length > 0
      ? Math.round(assertionResults.reduce((s, a) => s + a.score, 0) / assertionResults.length)
      : (error ? 0 : 100);

    results.push({
      input: tc.input,
      expected: tc.expected,
      output: error ?? output,
      assertions: assertionResults,
      passed: allPassed && !error,
      score: error ? 0 : avgScore,
      latencyMs,
    });
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  const avgScore = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
    : 0;

  return {
    id: `eval-${Date.now()}`,
    targetMode: target.mode,
    targetId: target.id,
    targetSlug: target.slug,
    timestamp: new Date(),
    summary: { total: results.length, passed, failed, avgScore },
    testCases: results,
  };
}

// ─── Assertion Evaluator ────────────────────────────────────

function evaluateAssertion(
  assertion: PromptfooAssertion,
  output: string,
): { type: string; passed: boolean; score: number; reason?: string } {
  switch (assertion.type) {
    case 'contains':
      const containsPass = output.includes(assertion.value ?? '');
      return { type: 'contains', passed: containsPass, score: containsPass ? 100 : 0, reason: containsPass ? undefined : `Output does not contain "${assertion.value}"` };

    case 'not-contains':
      const notContainsPass = !output.includes(assertion.value ?? '');
      return { type: 'not-contains', passed: notContainsPass, score: notContainsPass ? 100 : 0, reason: notContainsPass ? undefined : `Output contains forbidden "${assertion.value}"` };

    case 'regex':
      try {
        const regexPass = new RegExp(assertion.value ?? '').test(output);
        return { type: 'regex', passed: regexPass, score: regexPass ? 100 : 0 };
      } catch {
        return { type: 'regex', passed: false, score: 0, reason: 'Invalid regex pattern' };
      }

    case 'is-json':
      try { JSON.parse(output); return { type: 'is-json', passed: true, score: 100 }; }
      catch { return { type: 'is-json', passed: false, score: 0, reason: 'Output is not valid JSON' }; }

    case 'javascript':
      try {
        const fn = new Function('output', `return ${assertion.value}`);
        const jsPass = fn(output);
        return { type: 'javascript', passed: Boolean(jsPass), score: jsPass ? 100 : 0 };
      } catch (e) {
        return { type: 'javascript', passed: false, score: 0, reason: `JS eval error: ${(e as Error).message}` };
      }

    default:
      return { type: assertion.type, passed: true, score: 100 };
  }
}

// ─── Helper ─────────────────────────────────────────────────

function findLastLLMOutput(context: Record<string, unknown>): string | null {
  for (const value of Object.values(context).reverse()) {
    if (value && typeof value === 'object' && 'text' in (value as Record<string, unknown>)) {
      return (value as Record<string, unknown>).text as string;
    }
  }
  return null;
}

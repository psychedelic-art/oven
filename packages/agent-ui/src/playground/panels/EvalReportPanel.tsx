'use client';

import { useState, useCallback } from 'react';
import { cn } from '@oven/oven-ui';
import type { PlaygroundTarget } from '../TargetSelector';

interface TestCase {
  input: string;
  expected?: string;
  assertions?: Array<{ type: string; value?: string }>;
}

interface EvalResult {
  input: string;
  output: string;
  passed: boolean;
  score: number;
  latencyMs: number;
  assertions: Array<{ type: string; passed: boolean; score: number; reason?: string }>;
}

interface EvalReport {
  id: string;
  summary: { total: number; passed: number; failed: number; avgScore: number };
  testCases: EvalResult[];
}

interface EvalReportPanelProps {
  target: PlaygroundTarget | null;
  apiBaseUrl: string;
  className?: string;
}

const DEFAULT_TEST_CASES = `[
  { "input": "Hello, how can you help me?", "assertions": [{ "type": "contains", "value": "help" }] },
  { "input": "What are your hours?", "assertions": [{ "type": "contains", "value": "hour" }] }
]`;

export function EvalReportPanel({ target, apiBaseUrl, className }: EvalReportPanelProps) {
  const [testCasesJson, setTestCasesJson] = useState(DEFAULT_TEST_CASES);
  const [report, setReport] = useState<EvalReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const handleRunEval = useCallback(async () => {
    if (!target) return;
    setLoading(true);
    setError(null);
    try {
      let testCases: TestCase[];
      try { testCases = JSON.parse(testCasesJson); } catch { throw new Error('Invalid JSON in test cases'); }

      const res = await fetch(`${apiBaseUrl}/api/agent-eval-promptfoo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetMode: target.mode,
          targetId: target.id,
          targetSlug: target.slug,
          testCases,
        }),
      });
      if (!res.ok) throw new Error(`Eval failed: ${res.status}`);
      const data = await res.json();
      setReport(data as EvalReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [target, testCasesJson, apiBaseUrl]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className={cn('px-3 py-2 border-b bg-gray-50')}>
        <h3 className={cn('text-xs font-semibold text-gray-500 uppercase tracking-wider')}>Eval Report</h3>
      </div>

      {/* Test case editor */}
      <div className={cn('p-3 border-b')}>
        <label className={cn('text-xs font-medium text-gray-600 mb-1 block')}>Test Cases (JSON)</label>
        <textarea
          value={testCasesJson}
          onChange={e => setTestCasesJson(e.target.value)}
          rows={5}
          className={cn('w-full text-xs font-mono border rounded p-2 bg-white resize-none')}
        />
        <button
          type="button"
          onClick={handleRunEval}
          disabled={!target || loading}
          className={cn(
            'mt-2 w-full py-1.5 rounded text-xs font-medium text-white',
            'bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {loading ? 'Running...' : 'Run Eval'}
        </button>
        {error && <p className={cn('text-xs text-red-500 mt-1')}>{error}</p>}
      </div>

      {/* Summary cards */}
      {report && (
        <div className={cn('grid grid-cols-4 gap-1 p-3 border-b')}>
          <div className={cn('text-center')}>
            <p className={cn('text-lg font-bold text-gray-700')}>{report.summary.total}</p>
            <p className={cn('text-[10px] text-gray-400')}>Total</p>
          </div>
          <div className={cn('text-center')}>
            <p className={cn('text-lg font-bold text-green-600')}>{report.summary.passed}</p>
            <p className={cn('text-[10px] text-gray-400')}>Passed</p>
          </div>
          <div className={cn('text-center')}>
            <p className={cn('text-lg font-bold text-red-600')}>{report.summary.failed}</p>
            <p className={cn('text-[10px] text-gray-400')}>Failed</p>
          </div>
          <div className={cn('text-center')}>
            <p className={cn('text-lg font-bold text-blue-600')}>{report.summary.avgScore}%</p>
            <p className={cn('text-[10px] text-gray-400')}>Score</p>
          </div>
        </div>
      )}

      {/* Test case results */}
      <div className={cn('flex-1 overflow-y-auto')}>
        {report?.testCases.map((tc, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
            className={cn('w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-gray-50')}
          >
            <div className={cn('flex items-center gap-2')}>
              <span className={cn(
                'w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white',
                tc.passed ? 'bg-green-500' : 'bg-red-500',
              )}>
                {tc.passed ? '✓' : '✕'}
              </span>
              <span className={cn('text-xs text-gray-700 flex-1 truncate')}>{tc.input}</span>
              <span className={cn('text-[10px] text-gray-400')}>{tc.latencyMs}ms</span>
              <span className={cn('text-xs font-mono', tc.score >= 70 ? 'text-green-600' : 'text-red-600')}>
                {tc.score}%
              </span>
            </div>

            {expandedIdx === i && (
              <div className={cn('mt-2 space-y-1')}>
                <div className={cn('text-[10px]')}>
                  <span className={cn('text-gray-400')}>Output: </span>
                  <span className={cn('text-gray-600')}>{tc.output.slice(0, 200)}</span>
                </div>
                {tc.assertions.map((a, j) => (
                  <div key={j} className={cn('text-[10px] flex items-center gap-1')}>
                    <span className={cn(a.passed ? 'text-green-500' : 'text-red-500')}>
                      {a.passed ? '✓' : '✕'}
                    </span>
                    <span className={cn('text-gray-500')}>{a.type}</span>
                    {a.reason && <span className={cn('text-red-400')}>— {a.reason}</span>}
                  </div>
                ))}
              </div>
            )}
          </button>
        ))}

        {!report && !loading && (
          <p className={cn('text-xs text-gray-400 text-center py-8')}>
            {target ? 'Add test cases and run an evaluation' : 'Select a target first'}
          </p>
        )}
      </div>
    </div>
  );
}

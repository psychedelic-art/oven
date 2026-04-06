import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { badRequest } from '@oven/module-registry/api-utils';
import { runPromptfooEval } from '../services/promptfoo-adapter';
import type { PromptfooTestCase } from '../services/promptfoo-adapter';
import { getTraceUrl } from '../services/langsmith-tracer';

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.targetMode) return badRequest('Missing targetMode (agent | workflow)');
  if (!body.targetId) return badRequest('Missing targetId');
  if (!body.targetSlug) return badRequest('Missing targetSlug');
  if (!body.testCases || !Array.isArray(body.testCases) || body.testCases.length === 0) {
    return badRequest('Missing or empty testCases array');
  }

  const testCases: PromptfooTestCase[] = body.testCases.map((tc: Record<string, unknown>) => ({
    input: tc.input as string,
    expected: tc.expected as string | undefined,
    assertions: tc.assertions as PromptfooTestCase['assertions'],
    metadata: tc.metadata as Record<string, unknown> | undefined,
  }));

  const report = await runPromptfooEval(
    { mode: body.targetMode, id: Number(body.targetId), slug: body.targetSlug },
    testCases,
    { tenantId: body.tenantId ? Number(body.tenantId) : undefined },
  );

  return NextResponse.json(report);
}

export async function GET(request: NextRequest) {
  const executionId = request.nextUrl.searchParams.get('executionId');
  if (!executionId) return badRequest('Missing executionId parameter');

  const traceUrl = getTraceUrl(Number(executionId));
  return NextResponse.json({ executionId: Number(executionId), traceUrl });
}

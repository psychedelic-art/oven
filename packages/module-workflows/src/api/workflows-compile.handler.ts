import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { workflows } from '../schema';
import type { WorkflowDefinition } from '../types';

export async function POST(
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) {
  const { id } = (await context?.params) ?? {};
  const numId = Number(id);
  if (!id || isNaN(numId)) {
    return NextResponse.json({ error: 'Invalid workflow ID' }, { status: 400 });
  }

  const db = getDb();

  const [workflow] = await db
    .select()
    .from(workflows)
    .where(eq(workflows.id, numId))
    .limit(1);

  if (!workflow) return notFound();

  const definition = workflow.definition as WorkflowDefinition;

  if (!definition?.states || !definition?.initial) {
    return NextResponse.json({ error: 'Workflow has no valid definition' }, { status: 400 });
  }

  try {
    // Dynamic import to avoid bundling the compiler in non-compile paths
    const { compileWorkflow } = await import('@oven/module-workflow-compiler');

    const body = await request.json().catch(() => ({}));
    const options = body.options ?? {};

    const code = compileWorkflow(definition, options);
    const filename = `workflow-${workflow.slug ?? workflow.id}.ts`;

    return NextResponse.json({ code, filename });
  } catch (err) {
    return NextResponse.json(
      { error: `Compilation failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { badRequest, notFound } from '@oven/module-registry/api-utils';
import { invokeAgent } from '../engine/agent-invoker';

export async function POST(request: NextRequest, context?: { params: Promise<{ id: string }> }) {
  const { id: slug } = await context!.params;
  const body = await request.json();
  const { messages, params: invokeParams, sessionId, stream } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return badRequest('Missing required field: messages (array)');
  }
  try {
    const result = await invokeAgent(slug, { messages, params: invokeParams, sessionId, stream }, {});
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('not found')) return notFound();
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

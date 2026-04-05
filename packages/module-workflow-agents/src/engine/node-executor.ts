import type { NodeExecutionContext } from '../types';

// ─── Resolve Value ──────────────────────────────────────────
// Navigates $.path expressions against a context object.

export function resolveValue(expr: unknown, context: Record<string, unknown>): unknown {
  if (typeof expr !== 'string' || !expr.startsWith('$.')) return expr;
  const path = expr.slice(2).split('.');
  let value: unknown = context;
  for (const segment of path) {
    if (value && typeof value === 'object' && segment in (value as Record<string, unknown>)) {
      value = (value as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return value;
}

// ─── Resolve Inputs ─────────────────────────────────────────
// Resolves a mapping of { key: "$.path" | literal } against context.

export function resolveInputs(
  mapping: Record<string, unknown>,
  context: Record<string, unknown>,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, expr] of Object.entries(mapping)) {
    resolved[key] = resolveValue(expr, context);
  }
  return resolved;
}

// ─── Evaluate Guard ─────────────────────────────────────────
// Evaluates a guard condition against context.

export function evaluateGuard(
  params: { key: string; operator: string; value?: unknown },
  context: Record<string, unknown>,
): boolean {
  const actual = resolveValue(`$.${params.key}`, context);
  switch (params.operator) {
    case '==': return actual == params.value;
    case '!=': return actual != params.value;
    case '>': return Number(actual) > Number(params.value);
    case '<': return Number(actual) < Number(params.value);
    case 'exists': return actual !== undefined && actual !== null;
    case 'contains':
      return typeof actual === 'string' && typeof params.value === 'string'
        ? actual.includes(params.value) : false;
    case 'empty':
      return actual === undefined || actual === null || actual === '' ||
        (Array.isArray(actual) && actual.length === 0);
    default:
      return false;
  }
}

// ─── Execute Node ───────────────────────────────────────────
// Dispatches to the appropriate built-in node handler based on slug.

export async function executeNode(
  nodeSlug: string,
  ctx: NodeExecutionContext,
): Promise<Record<string, unknown>> {
  switch (nodeSlug) {
    case 'llm':
      return executeLLMNode(ctx);
    case 'tool-executor':
      return executeToolExecutorNode(ctx);
    case 'condition':
      return executeConditionNode(ctx);
    case 'transform':
      return executeTransformNode(ctx);
    case 'memory':
      return executeMemoryNode(ctx);
    case 'human-review':
      return executeHumanReviewNode(ctx);
    case 'rag':
      return executeRAGNode(ctx);
    case 'subagent':
      return executeSubagentNode(ctx);
    case 'prompt':
      return executePromptNode(ctx);
    default:
      return { error: `Unknown node type: ${nodeSlug}` };
  }
}

// ─── LLM Node ───────────────────────────────────────────────

async function executeLLMNode(ctx: NodeExecutionContext): Promise<Record<string, unknown>> {
  const { aiGenerateText } = await import('@oven/module-ai');
  const messages = ctx.input.messages as Array<Record<string, unknown>> ?? [];
  const lastMessage = messages[messages.length - 1];
  const prompt = typeof lastMessage?.content === 'string'
    ? lastMessage.content
    : resolveValue(lastMessage?.content as unknown, ctx.context) as string ?? '';

  const result = await aiGenerateText({
    prompt,
    model: (ctx.input.model as string) ?? ctx.config.model ?? 'fast',
    system: (ctx.input.systemPrompt as string) ?? ctx.config.systemPrompt,
    temperature: (ctx.input.temperature as number) ?? ctx.config.temperature,
  });

  return { text: result.text, toolCalls: null, tokens: result.tokens };
}

// ─── Tool Executor Node ─────────────────────────────────────

async function executeToolExecutorNode(ctx: NodeExecutionContext): Promise<Record<string, unknown>> {
  const { discoverTools, executeTool } = await import('@oven/module-agent-core');
  const toolCalls = ctx.input.toolCalls as Array<Record<string, unknown>> ?? [];
  const availableTools = discoverTools();
  const results: Array<Record<string, unknown>> = [];

  for (const call of toolCalls) {
    const toolName = call.name as string;
    const toolSpec = availableTools.find(t => t.name === toolName);
    const startTime = Date.now();

    if (!toolSpec) {
      results.push({ name: toolName, result: null, status: 'error', error: `Tool not found: ${toolName}`, durationMs: 0 });
      continue;
    }

    try {
      const output = await executeTool(toolSpec, (call.args ?? {}) as Record<string, unknown>);
      results.push({ name: toolName, result: output, status: 'success', durationMs: Date.now() - startTime });
    } catch (err) {
      results.push({ name: toolName, result: null, status: 'error', error: err instanceof Error ? err.message : String(err), durationMs: Date.now() - startTime });
    }
  }

  return { toolResults: results };
}

// ─── Condition Node ─────────────────────────────────────────

async function executeConditionNode(ctx: NodeExecutionContext): Promise<Record<string, unknown>> {
  const field = ctx.input.field as string;
  const operator = ctx.input.operator as string;
  const value = ctx.input.value;
  const fieldValue = resolveValue(`$.${field}`, ctx.context);
  let result = false;
  switch (operator) {
    case '==': result = fieldValue == value; break;
    case '!=': result = fieldValue != value; break;
    case '>': result = Number(fieldValue) > Number(value); break;
    case '<': result = Number(fieldValue) < Number(value); break;
    case 'exists': result = fieldValue !== undefined && fieldValue !== null; break;
  }
  return { branch: result ? 'true' : 'false' };
}

// ─── Transform Node ─────────────────────────────────────────

async function executeTransformNode(ctx: NodeExecutionContext): Promise<Record<string, unknown>> {
  const mapping = (ctx.input.mapping ?? {}) as Record<string, string>;
  const result: Record<string, unknown> = {};
  for (const [outKey, srcPath] of Object.entries(mapping)) {
    const expr = srcPath.startsWith('$.') ? srcPath : `$.${srcPath}`;
    result[outKey] = resolveValue(expr, ctx.context) ?? (ctx.input.data as Record<string, unknown>)?.[srcPath];
  }
  return { result };
}

// ─── Memory Node ────────────────────────────────────────────

async function executeMemoryNode(ctx: NodeExecutionContext): Promise<Record<string, unknown>> {
  const { aiEmbed } = await import('@oven/module-ai');
  const { getDb } = await import('@oven/module-registry/db');
  const { agentMemory } = await import('../schema');
  const db = getDb();

  if (ctx.input.mode === 'write') {
    const content = ctx.input.content as string ?? '';
    const key = ctx.input.key as string ?? 'default';
    const { embedding } = await aiEmbed(content);
    const [inserted] = await db.insert(agentMemory).values({
      tenantId: ctx.tenantId ?? null,
      agentId: (ctx.input.agentId as number) ?? null,
      key,
      content,
      metadata: { embedding, executionId: ctx.executionId },
    }).returning();
    return { memories: [], stored: true, id: inserted.id };
  } else {
    // Read mode: query agent_memory by key or semantic similarity
    // For now, queries by key match. Full vector search requires pgvector extension.
    const query = ctx.input.query as string ?? '';
    const key = ctx.input.key as string;
    const rows = await db.select().from(agentMemory).where(
      key ? require('drizzle-orm').eq(agentMemory.key, key) : require('drizzle-orm').ilike(agentMemory.content, `%${query}%`)
    ).limit(ctx.input.maxResults as number ?? 10);
    const memories = (rows as Array<Record<string, unknown>>).map(r => ({
      key: r.key, content: r.content, score: 1.0,
    }));
    return { memories, stored: false };
  }
}

// ─── Human Review Node ──────────────────────────────────────

async function executeHumanReviewNode(ctx: NodeExecutionContext): Promise<Record<string, unknown>> {
  // In real execution, the engine pauses here and waits for human input.
  // The decision is provided when execution resumes.
  return {
    decision: (ctx.input.decision as string) ?? 'approve',
    feedback: (ctx.input.feedback as string) ?? null,
  };
}

// ─── RAG Node ───────────────────────────────────────────────

async function executeRAGNode(ctx: NodeExecutionContext): Promise<Record<string, unknown>> {
  const { hybridSearch } = await import('@oven/module-knowledge-base');
  const query = ctx.input.query as string ?? '';
  const tenantId = (ctx.input.tenantId as number) ?? ctx.tenantId ?? 0;
  const maxResults = (ctx.input.maxResults as number) ?? 5;
  const knowledgeBaseId = ctx.input.knowledgeBaseId as number | undefined;
  const confidenceThreshold = (ctx.input.confidenceThreshold as number) ?? 0.8;

  const searchResult = await hybridSearch(
    { query, tenantId, knowledgeBaseId, maxResults },
    confidenceThreshold,
  );

  return {
    context: searchResult.results,
    query,
    resultCount: searchResult.totalResults,
    topResultConfident: searchResult.topResultConfident,
  };
}

// ─── Subagent Node ──────────────────────────────────────────

async function executeSubagentNode(ctx: NodeExecutionContext): Promise<Record<string, unknown>> {
  const { invokeAgent } = await import('@oven/module-agent-core');
  const agentSlug = ctx.input.agentSlug as string;
  const message = ctx.input.message as string ?? '';

  try {
    const result = await invokeAgent(
      agentSlug,
      { messages: [{ role: 'user', content: message }] },
      { tenantId: ctx.tenantId },
    );
    return {
      text: result.text,
      tokens: result.tokens,
      toolsUsed: result.toolsUsed,
      latencyMs: result.latencyMs,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Prompt Assembly Node ───────────────────────────────────

async function executePromptNode(ctx: NodeExecutionContext): Promise<Record<string, unknown>> {
  const template = ctx.input.template as string ?? '';
  const vars = ctx.input.variables as Record<string, string> ?? {};
  let rendered = template;
  for (const [key, val] of Object.entries(vars)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
  }
  return { systemPrompt: rendered };
}

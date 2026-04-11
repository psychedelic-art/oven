import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { aiGenerateText } from '@oven/module-ai';
import { agents, agentExecutions } from '../schema';
import { getToolsForAgent, executeTool } from './tool-wrapper';
import { getOrCreateSession, appendMessage, getSessionMessages } from './session-manager';
import { eq } from 'drizzle-orm';
import type { InvokeParams, InvokeResult, LLMConfig } from '../types';

// ─── Agent Invocation ───────────────────────────────────────

/**
 * Invoke an agent by slug. This is the core orchestration function:
 * 1. Load agent definition
 * 2. Merge allowed parameter overrides
 * 3. Get/create session
 * 4. Resolve available tools
 * 5. Build prompt with conversation history + tools
 * 6. Call LLM via module-ai
 * 7. Handle tool calls if any
 * 8. Record execution
 * 9. Return result
 */
export async function invokeAgent(
  slug: string,
  params: InvokeParams,
  context?: { tenantId?: number; userId?: number }
): Promise<InvokeResult> {
  const db = getDb();
  const startTime = Date.now();

  // 1. Load agent
  const agentRows = await db.select().from(agents)
    .where(eq(agents.slug, slug))
    .limit(1);

  if (agentRows.length === 0) {
    throw new Error(`Agent "${slug}" not found`);
  }

  const agent = agentRows[0];
  if (!agent.enabled) {
    throw new Error(`Agent "${slug}" is disabled`);
  }

  // 2. Merge allowed parameter overrides
  const llmConfig = { ...(agent.llmConfig as LLMConfig ?? {}) };
  const exposedParams = (agent.exposedParams as string[]) ?? [];

  if (params.params) {
    for (const [key, value] of Object.entries(params.params)) {
      if (exposedParams.includes(key)) {
        (llmConfig as Record<string, unknown>)[key] = value;
      }
    }
  }

  // 3. Get or create session
  const session = await getOrCreateSession({
    agentId: agent.id,
    sessionId: params.sessionId,
    tenantId: context?.tenantId ?? agent.tenantId ?? undefined,
    userId: context?.userId,
  });

  // 4. Store user message(s)
  let lastUserMessageId: number | undefined;
  for (const msg of params.messages) {
    lastUserMessageId = await appendMessage({
      sessionId: session.id,
      role: msg.role,
      content: msg.content,
    });
  }

  // 5. Get conversation history
  const history = await getSessionMessages(session.id);

  // 6. Build system prompt
  const systemPrompt = agent.systemPrompt ?? 'You are a helpful assistant.';

  // 7. Resolve tools
  const toolBindings = (agent.toolBindings as string[]) ?? [];
  const availableTools = getToolsForAgent(toolBindings);
  const toolsUsed: string[] = [];

  // 8. Create execution record
  const [execution] = await db.insert(agentExecutions).values({
    agentId: agent.id,
    sessionId: session.id,
    messageId: lastUserMessageId ?? null,
    status: 'running',
    llmConfig,
  }).returning();

  await eventBus.emit('agents.execution.started', {
    id: execution.id,
    agentId: agent.id,
    sessionId: session.id,
  });

  try {
    // 9. Build prompt from history
    const lastMessage = params.messages[params.messages.length - 1];
    const promptText = typeof lastMessage.content === 'string'
      ? lastMessage.content
      : JSON.stringify(lastMessage.content);

    // 10. Call LLM via module-ai
    const result = await aiGenerateText({
      prompt: promptText,
      system: systemPrompt,
      model: llmConfig.model ?? 'fast',
      temperature: llmConfig.temperature,
      maxTokens: llmConfig.maxTokens,
      tenantId: context?.tenantId,
      toolName: `agents.${slug}`,
    });

    const latencyMs = Date.now() - startTime;

    // 11. Store assistant response
    const assistantMessageId = await appendMessage({
      sessionId: session.id,
      role: 'assistant',
      content: result.text,
      metadata: {
        model: result.model,
        provider: result.provider,
        tokens: result.tokens,
        costCents: result.costCents,
        latencyMs,
      },
    });

    // 12. Update execution as completed
    await db.update(agentExecutions).set({
      status: 'completed',
      tokenUsage: result.tokens,
      toolsUsed,
      latencyMs,
      completedAt: new Date(),
    }).where(eq(agentExecutions.id, execution.id));

    await eventBus.emit('agents.execution.completed', {
      id: execution.id,
      agentId: agent.id,
      sessionId: session.id,
      status: 'completed',
      tokenUsage: result.tokens,
      latencyMs,
    });

    return {
      text: result.text ?? '',
      sessionId: session.id,
      messageId: assistantMessageId,
      executionId: execution.id,
      tokens: result.tokens,
      costCents: result.costCents,
      latencyMs,
      model: result.model,
      provider: result.provider,
      toolsUsed,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    await db.update(agentExecutions).set({
      status: 'failed',
      error: errorMessage,
      latencyMs,
      completedAt: new Date(),
    }).where(eq(agentExecutions.id, execution.id));

    await eventBus.emit('agents.execution.failed', {
      id: execution.id,
      agentId: agent.id,
      sessionId: session.id,
      error: errorMessage,
    });

    throw error;
  }
}

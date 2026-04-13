import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { chatMessages, chatSessions } from '../schema';
import type { MessageContentPart, CommandResult, StreamEvent } from '../types';
import { resolveCommand, executeCommand } from './command-registry';
import { loadHooks, executeHooks } from './hook-manager';
import type { HookContext } from './hook-manager';
import { buildSystemPrompt } from './prompt-builder';
import { bridgeAIStreamToEvents } from './streaming-handler';
import { eq } from 'drizzle-orm';

// ─── Record User Message ────────────────────────────────────

export async function recordUserMessage(input: {
  sessionId: number;
  content: MessageContentPart[];
  metadata?: Record<string, unknown>;
}): Promise<number> {
  const db = getDb();
  const [message] = await db
    .insert(chatMessages)
    .values({
      sessionId: input.sessionId,
      role: 'user',
      content: input.content,
      metadata: input.metadata ?? null,
    })
    .returning();

  await eventBus.emit('chat.message.sent', {
    id: message.id,
    sessionId: input.sessionId,
    role: 'user',
  });

  return message.id;
}

// ─── Record Assistant Message ───────────────────────────────

export async function recordAssistantMessage(input: {
  sessionId: number;
  content: MessageContentPart[];
  metadata?: Record<string, unknown>;
}): Promise<number> {
  const db = getDb();
  const [message] = await db
    .insert(chatMessages)
    .values({
      sessionId: input.sessionId,
      role: 'assistant',
      content: input.content,
      metadata: input.metadata ?? null,
    })
    .returning();

  await eventBus.emit('chat.message.sent', {
    id: message.id,
    sessionId: input.sessionId,
    role: 'assistant',
  });

  return message.id;
}

// ─── Record Tool Action ─────────────────────────────────────

export async function recordToolAction(input: {
  messageId: number;
  sessionId: number;
  toolName: string;
  toolInput: unknown;
  output: unknown;
  status: 'success' | 'error';
  durationMs?: number;
}): Promise<void> {
  const { chatActions } = await import('../schema');
  const db = getDb();
  await db
    .insert(chatActions)
    .values({
      messageId: input.messageId,
      sessionId: input.sessionId,
      toolName: input.toolName,
      input: input.toolInput,
      output: input.output,
      status: input.status,
      durationMs: input.durationMs ?? null,
    })
    .returning();
}

// ─── Process Incoming Message (Orchestrator) ───────────────
// The full message processing pipeline:
// 1. Run pre-message hooks
// 2. Check if message is a command -> route to command-registry
// 3. If not command -> record user message, invoke agent (Sprint 4A.4)
// 4. Run post-message hooks

export async function processMessage(input: {
  sessionId: number;
  tenantId?: number;
  text: string;
}): Promise<{ type: 'command'; result: CommandResult } | { type: 'message'; messageId: number }> {
  const hookCtx: HookContext = { sessionId: input.sessionId, tenantId: input.tenantId, message: input.text };

  // 1. Pre-message hooks
  const preHooks = await loadHooks('pre-message', input.tenantId);
  const preResults = await executeHooks(preHooks, hookCtx);
  const blocked = preResults.find(r => !r.continue);
  if (blocked) {
    return {
      type: 'command',
      result: { success: false, error: blocked.data ? String((blocked.data as Record<string, unknown>).reason) : 'Blocked by hook' },
    };
  }

  // 2. Command routing
  if (isCommand(input.text)) {
    const { command, args } = parseCommandInput(input.text);
    const cmd = await resolveCommand(command, input.tenantId);
    if (cmd) {
      const result = await executeCommand(cmd, args, { sessionId: input.sessionId, tenantId: input.tenantId });
      return { type: 'command', result };
    }
    // Unknown command - fall through and treat as regular message
  }

  // 3. Record user message
  const content: MessageContentPart[] = [{ type: 'text', text: input.text }];
  const messageId = await recordUserMessage({ sessionId: input.sessionId, content });

  // 4. Post-message hooks
  const postHooks = await loadHooks('post-message', input.tenantId);
  await executeHooks(postHooks, { ...hookCtx, messageId });

  return { type: 'message', messageId };
}

// ─── Streaming Message Processing (Sprint 4A.4) ────────────
// Processes a message and returns an async iterable of StreamEvent
// for SSE streaming. Invokes the backing agent via aiStreamText and
// bridges the raw text stream into our event format.

export async function* processMessageStreaming(input: {
  sessionId: number;
  tenantId?: number;
  text: string;
}): AsyncGenerator<StreamEvent> {
  const db = getDb();

  // 1. Record user message
  const content: MessageContentPart[] = [{ type: 'text', text: input.text }];
  await recordUserMessage({ sessionId: input.sessionId, content });

  // 2. Resolve the backing agent for this session
  const sessions = await db.select().from(chatSessions)
    .where(eq(chatSessions.id, input.sessionId));
  const session = sessions[0];
  if (!session) {
    yield { type: 'error', code: 'SESSION_NOT_FOUND', message: 'Session not found' };
    return;
  }

  // 3. Build system prompt
  const systemPrompt = await buildSystemPrompt({
    tenantId: input.tenantId ?? (session.tenantId as number | undefined),
    includeCommands: true,
    includeSkills: true,
  });

  // 4. Invoke LLM via module-ai streaming (lazy import to avoid
  //    hard coupling — module-ai may not be registered in all setups)
  let aiStreamText: (params: {
    prompt: string;
    system?: string;
    model?: string;
    tenantId?: number;
    toolName?: string;
  }) => Promise<ReadableStream<string>>;
  try {
    const moduleAi = await import('@oven/module-ai');
    aiStreamText = moduleAi.aiStreamText;
  } catch {
    yield { type: 'error', code: 'MODULE_NOT_FOUND', message: 'module-ai not available' };
    return;
  }

  try {
    const textStream = await aiStreamText({
      prompt: input.text,
      system: systemPrompt,
      model: 'fast',
      tenantId: input.tenantId ?? (session.tenantId as number | undefined),
      toolName: `chat.session.${input.sessionId}`,
    });

    // 5. Bridge the text stream to our StreamEvent format
    const events = bridgeAIStreamToEvents(textStream, async (fullText: string) => {
      const assistantId = await recordAssistantMessage({
        sessionId: input.sessionId,
        content: [{ type: 'text', text: fullText }],
        metadata: { source: 'chat-streaming' },
      });
      return assistantId;
    });

    for await (const event of events) {
      yield event;
    }
  } catch (error) {
    yield {
      type: 'error',
      code: 'INVOKE_ERROR',
      message: error instanceof Error ? error.message : 'Agent invocation failed',
    };
  }
}

// ─── Check if message is a command ──────────────────────────

export function isCommand(text: string): boolean {
  return text.startsWith('/') && text.length > 1 && !text.startsWith('/ ');
}

// ─── Extract command name and args from text ────────────────

export function parseCommandInput(text: string): { command: string; args: string } {
  const trimmed = text.slice(1).trim();
  const spaceIdx = trimmed.indexOf(' ');
  if (spaceIdx === -1) {
    return { command: trimmed, args: '' };
  }
  return {
    command: trimmed.slice(0, spaceIdx),
    args: trimmed.slice(spaceIdx + 1).trim(),
  };
}

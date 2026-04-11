import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { chatMessages } from '../schema';
import type { MessageContentPart, CommandResult } from '../types';
import { resolveCommand, executeCommand } from './command-registry';
import { loadHooks, executeHooks } from './hook-manager';
import type { HookContext } from './hook-manager';

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

  // TODO: Sprint 4A.4 - invoke agent via prompt-builder + agent-core

  // 4. Post-message hooks
  const postHooks = await loadHooks('post-message', input.tenantId);
  await executeHooks(postHooks, { ...hookCtx, messageId });

  return { type: 'message', messageId };
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

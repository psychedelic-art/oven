import { eq, and, isNull, or } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { chatCommands } from '../schema';
import type { ChatCommand, CommandResult } from '../types';

// ─── Resolve Command ────────────────────────────────────────
// Looks up command by slug. Checks tenant-scoped first, then global (tenantId=null).
// Returns null if not found or disabled.

export async function resolveCommand(slug: string, tenantId?: number): Promise<ChatCommand | null> {
  const db = getDb();
  const conditions = [eq(chatCommands.slug, slug)];
  if (tenantId) {
    conditions.push(or(eq(chatCommands.tenantId, tenantId), isNull(chatCommands.tenantId))!);
  }
  const rows = await db.select().from(chatCommands).where(and(...conditions)).limit(1);
  if (rows.length === 0) return null;
  const cmd = rows[0] as unknown as ChatCommand;
  if (!cmd.enabled) return null;
  return cmd;
}

// ─── Execute Command ────────────────────────────────────────
// Dispatches to the appropriate handler based on the handler prefix.
// Handler format: "builtin:name" or "custom:name"

export async function executeCommand(
  command: ChatCommand,
  args: string,
  context: { sessionId: number; tenantId?: number },
): Promise<CommandResult> {
  let result: CommandResult;

  try {
    const [prefix, handlerName] = command.handler.split(':');
    if (prefix === 'builtin') {
      result = await executeBuiltinCommand(handlerName, args, context);
    } else {
      result = { success: false, error: `Unknown handler prefix: ${prefix}` };
    }
  } catch (err) {
    result = { success: false, error: err instanceof Error ? err.message : 'Command execution failed' };
  }

  await eventBus.emit('chat.command.executed', {
    sessionId: context.sessionId,
    command: command.slug,
    success: result.success,
  });

  return result;
}

// ─── List Commands ──────────────────────────────────────────

export async function listCommands(tenantId?: number): Promise<ChatCommand[]> {
  const db = getDb();
  const conditions = [eq(chatCommands.enabled, true)];
  if (tenantId) {
    conditions.push(or(eq(chatCommands.tenantId, tenantId), isNull(chatCommands.tenantId))!);
  }
  const rows = await db.select().from(chatCommands).where(and(...conditions)).orderBy(chatCommands.slug);
  return rows as unknown as ChatCommand[];
}

// ─── Format Commands for Prompt ─────────────────────────────

export async function getCommandDescriptionsForPrompt(tenantId?: number): Promise<string> {
  const cmds = await listCommands(tenantId);
  if (cmds.length === 0) return '';
  const lines = cmds.map(c => `- /${c.slug}: ${c.description}`);
  return `Available commands:\n${lines.join('\n')}`;
}

// ─── Built-in Command Handlers ──────────────────────────────

async function executeBuiltinCommand(
  name: string,
  args: string,
  context: { sessionId: number; tenantId?: number },
): Promise<CommandResult> {
  switch (name) {
    case 'help':
      return handleHelp(context);
    case 'clear':
      return handleClear(context);
    case 'status':
      return handleStatus(context);
    case 'pin':
      return handlePin(context);
    case 'export':
      return handleExport(args, context);
    case 'mode':
      return handleMode(args, context);
    case 'model':
      return handleModel(args, context);
    case 'temperature':
      return handleTemperature(args, context);
    case 'reset':
      return handleReset(context);
    case 'feedback':
      return handleFeedback(args, context);
    case 'search':
      return handleSearch(args, context);
    case 'agent':
      return handleAgent(args, context);
    case 'tools':
      return handleTools(context);
    case 'skill':
      return handleSkill(args, context);
    case 'mcp':
      return handleMcp(args, context);
    default:
      return { success: false, error: `Unknown handler: builtin:${name}` };
  }
}

// ─── Individual Handlers ────────────────────────────────────
// Each returns a CommandResult. Complex handlers will be expanded in future sprints.

async function handleHelp(ctx: { sessionId: number; tenantId?: number }): Promise<CommandResult> {
  const cmds = await listCommands(ctx.tenantId);
  const lines = cmds.map(c => `/${c.slug} — ${c.description}`);
  return { success: true, output: `Available commands:\n${lines.join('\n')}` };
}

async function handleClear(ctx: { sessionId: number }): Promise<CommandResult> {
  // Clear is handled client-side; server acknowledges
  return { success: true, output: 'Chat history cleared.', data: { action: 'clear' } };
}

async function handleStatus(ctx: { sessionId: number }): Promise<CommandResult> {
  return { success: true, output: `Session #${ctx.sessionId} is active.`, data: { sessionId: ctx.sessionId } };
}

async function handlePin(ctx: { sessionId: number }): Promise<CommandResult> {
  return { success: true, output: 'Session pin toggled.', data: { action: 'togglePin', sessionId: ctx.sessionId } };
}

async function handleExport(args: string, ctx: { sessionId: number }): Promise<CommandResult> {
  const format = args.trim() || 'json';
  if (!['json', 'md', 'txt'].includes(format)) {
    return { success: false, error: 'Export format must be json, md, or txt' };
  }
  return { success: true, output: `Export queued in ${format} format.`, data: { action: 'export', format, sessionId: ctx.sessionId } };
}

async function handleMode(args: string, _ctx: { sessionId: number }): Promise<CommandResult> {
  const mode = args.trim();
  const validModes = ['concise', 'detailed', 'creative'];
  if (!mode) return { success: true, output: `Available modes: ${validModes.join(', ')}` };
  if (!validModes.includes(mode)) return { success: false, error: `Invalid mode. Choose: ${validModes.join(', ')}` };
  return { success: true, output: `Mode set to: ${mode}`, data: { action: 'setMode', mode } };
}

async function handleModel(args: string, _ctx: { sessionId: number }): Promise<CommandResult> {
  const model = args.trim();
  if (!model) return { success: true, output: 'Usage: /model <model-name>' };
  return { success: true, output: `Model set to: ${model}`, data: { action: 'setModel', model } };
}

async function handleTemperature(args: string, _ctx: { sessionId: number }): Promise<CommandResult> {
  const temp = parseFloat(args.trim());
  if (isNaN(temp) || temp < 0 || temp > 2) {
    return { success: false, error: 'Temperature must be a number between 0 and 2' };
  }
  return { success: true, output: `Temperature set to: ${temp}`, data: { action: 'setTemperature', temperature: temp } };
}

async function handleReset(ctx: { sessionId: number }): Promise<CommandResult> {
  return { success: true, output: 'Session context reset.', data: { action: 'reset', sessionId: ctx.sessionId } };
}

async function handleFeedback(args: string, ctx: { sessionId: number }): Promise<CommandResult> {
  const rating = args.trim();
  if (!rating || !['positive', 'negative'].includes(rating)) {
    return { success: false, error: 'Usage: /feedback positive|negative' };
  }
  return { success: true, output: `Feedback recorded: ${rating}`, data: { action: 'feedback', rating } };
}

async function handleSearch(args: string, _ctx: { sessionId: number }): Promise<CommandResult> {
  const query = args.trim();
  if (!query) return { success: false, error: 'Usage: /search <query>' };
  // TODO: Sprint 4A.4 — delegate to module-knowledge-base semanticSearch
  return { success: true, output: `Search queued for: "${query}"`, data: { action: 'search', query } };
}

async function handleAgent(args: string, ctx: { sessionId: number }): Promise<CommandResult> {
  const slug = args.trim();
  if (!slug) return { success: true, output: 'Usage: /agent <agent-slug>' };
  return { success: true, output: `Agent switched to: ${slug}`, data: { action: 'switchAgent', agentSlug: slug, sessionId: ctx.sessionId } };
}

async function handleTools(ctx: { sessionId: number }): Promise<CommandResult> {
  // TODO: Sprint 4A.4 — list tools from agent-core tool-wrapper
  return { success: true, output: 'Tool listing will be available after agent integration.', data: { action: 'listTools' } };
}

async function handleSkill(args: string, _ctx: { sessionId: number }): Promise<CommandResult> {
  const slug = args.trim();
  if (!slug) return { success: true, output: 'Usage: /skill <skill-slug> [args...]' };
  return { success: true, output: `Skill invocation queued: ${slug}`, data: { action: 'invokeSkill', skillSlug: slug } };
}

async function handleMcp(args: string, _ctx: { sessionId: number }): Promise<CommandResult> {
  const sub = args.trim();
  if (!sub) return { success: true, output: 'Usage: /mcp list|connect|disconnect' };
  return { success: true, output: `MCP action: ${sub}`, data: { action: 'mcp', subcommand: sub } };
}

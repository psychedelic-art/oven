import { eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { chatHooks } from '../schema';
import type { ChatHook, HookEvent } from '../types';

// ─── Hook Execution Result ──────────────────────────────────

export interface HookResult {
  hookId: number;
  hookName: string;
  continue: boolean;
  data?: unknown;
  error?: string;
}

// ─── Hook Execution Context ─────────────────────────────────

export interface HookContext {
  sessionId: number;
  tenantId?: number;
  message?: string;
  toolName?: string;
  toolInput?: unknown;
  toolOutput?: unknown;
  error?: unknown;
  [key: string]: unknown;
}

// ─── Load Hooks ─────────────────────────────────────────────
// Loads enabled hooks for a specific event, sorted by priority (ascending).

export async function loadHooks(event: HookEvent, tenantId?: number): Promise<ChatHook[]> {
  const db = getDb();
  const conditions = [
    eq(chatHooks.event, event),
    eq(chatHooks.enabled, true),
  ];
  const rows = await db.select().from(chatHooks).where(and(...conditions)).orderBy(chatHooks.priority);
  return rows as unknown as ChatHook[];
}

// ─── Execute Hooks ──────────────────────────────────────────
// Runs hooks sequentially in priority order. Stops if any hook returns continue=false.

export async function executeHooks(
  hooks: ChatHook[],
  context: HookContext,
): Promise<HookResult[]> {
  const results: HookResult[] = [];

  for (const hook of hooks) {
    const result = await executeSingleHook(hook, context);
    results.push(result);

    await eventBus.emit('chat.hook.executed', {
      sessionId: context.sessionId,
      hookId: hook.id,
      event: hook.event,
      result: result.continue ? 'continue' : 'blocked',
    });

    // Short-circuit: stop chain if hook says don't continue
    if (!result.continue) break;
  }

  return results;
}

// ─── Execute Single Hook ────────────────────────────────────
// Dispatches to the appropriate handler type.

async function executeSingleHook(hook: ChatHook, context: HookContext): Promise<HookResult> {
  const handler = hook.handler;
  const baseResult = { hookId: hook.id, hookName: hook.name };

  try {
    switch (handler.type) {
      case 'condition':
        return executeConditionHandler(hook, handler.config, context);
      case 'api':
        return executeApiHandler(hook, handler.config, context);
      case 'event':
        return executeEventHandler(hook, handler.config, context);
      case 'guardrail':
        return executeGuardrailHandler(hook, handler.config, context);
      default:
        return { ...baseResult, continue: true, error: `Unknown handler type: ${handler.type}` };
    }
  } catch (err) {
    return {
      ...baseResult,
      continue: true, // Don't block on handler errors by default
      error: err instanceof Error ? err.message : 'Hook execution failed',
    };
  }
}

// ─── Condition Handler ──────────────────────────────────────
// Evaluates a condition and decides whether to continue or block.
// Config: { action: 'block' | 'allow', reason?: string }

function executeConditionHandler(
  hook: ChatHook,
  config: Record<string, unknown>,
  _context: HookContext,
): HookResult {
  const action = config.action as string;
  if (action === 'block') {
    return {
      hookId: hook.id,
      hookName: hook.name,
      continue: false,
      data: { reason: config.reason ?? 'Blocked by condition hook' },
    };
  }
  return { hookId: hook.id, hookName: hook.name, continue: true };
}

// ─── API Handler ────────────────────────────────────────────
// Calls an external endpoint. Non-blocking by default (errors don't stop chain).
// Config: { url: string, method?: string, headers?: Record<string, string> }

async function executeApiHandler(
  hook: ChatHook,
  config: Record<string, unknown>,
  context: HookContext,
): Promise<HookResult> {
  const url = config.url as string;
  const method = (config.method as string) ?? 'POST';

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(config.headers as Record<string, string> ?? {}),
      },
      body: JSON.stringify({ hookId: hook.id, event: hook.event, context }),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    return {
      hookId: hook.id,
      hookName: hook.name,
      continue: true,
      data: { status: response.status },
    };
  } catch (err) {
    // API failures don't block the chain
    return {
      hookId: hook.id,
      hookName: hook.name,
      continue: true,
      error: err instanceof Error ? err.message : 'API hook failed',
    };
  }
}

// ─── Event Handler ──────────────────────────────────────────
// Emits an event via the EventBus.
// Config: { eventName: string, payload?: Record<string, unknown> }

async function executeEventHandler(
  hook: ChatHook,
  config: Record<string, unknown>,
  context: HookContext,
): Promise<HookResult> {
  const eventName = config.eventName as string;
  const payload = {
    ...(config.payload as Record<string, unknown> ?? {}),
    sessionId: context.sessionId,
  };

  await eventBus.emit(eventName, payload);

  return { hookId: hook.id, hookName: hook.name, continue: true };
}

// ─── Guardrail Handler ──────────────────────────────────────
// Delegates to module-ai guardrail engine for content evaluation.
// Config: { guardrailId?: number, action: 'block' | 'warn' }
// TODO: Sprint 4A.4 — wire to module-ai evaluateGuardrails

async function executeGuardrailHandler(
  hook: ChatHook,
  config: Record<string, unknown>,
  context: HookContext,
): Promise<HookResult> {
  // Placeholder: guardrail evaluation will be integrated in Sprint 4A.4
  return {
    hookId: hook.id,
    hookName: hook.name,
    continue: true,
    data: { guardrailResult: 'pass' },
  };
}

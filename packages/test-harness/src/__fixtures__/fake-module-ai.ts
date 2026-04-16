/**
 * Vitest-alias target for `@oven/module-ai`. The alias is declared in
 * `vitest.config.ts` so e2e tests don't transitively load the real
 * module-ai barrel (which pulls in 30+ handler files and Next.js).
 *
 * The queues are shared via module-level arrays. Tests import the
 * `queueEmbedding` / `queueAssistantText` helpers directly from this file
 * and push responses before invoking the system under test.
 */

// ─── Embedding queue ────────────────────────────────────────

const embedQueue: number[][] = [];

export function queueEmbedding(v: number[]): void {
  embedQueue.push(v);
}

export function resetEmbedQueue(): void {
  embedQueue.length = 0;
}

export async function aiEmbed(_input: string | string[]) {
  const vec = embedQueue.shift() ?? new Array(1536).fill(0);
  return { embedding: vec, tokens: 8 };
}

// ─── Text generation queue ──────────────────────────────────

interface QueuedAssistantText {
  text: string;
  tokens?: { input: number; output: number; total: number };
  model?: string;
  provider?: string;
}

const textQueue: QueuedAssistantText[] = [];

export function queueAssistantText(payload: QueuedAssistantText): void {
  textQueue.push(payload);
}

export function resetTextQueue(): void {
  textQueue.length = 0;
}

export async function aiGenerateText(_opts: unknown) {
  const queued = textQueue.shift();
  if (queued) {
    return {
      text: queued.text,
      tokens: queued.tokens ?? { input: 10, output: 10, total: 20 },
      model: queued.model ?? 'mock',
      provider: queued.provider ?? 'mock',
    };
  }
  return {
    text: '',
    tokens: { input: 0, output: 0, total: 0 },
    model: 'mock',
    provider: 'mock',
  };
}

// ─── Streaming queue ────────────────────────────────────────

interface QueuedStreamChunk {
  type: 'text-delta' | 'done' | 'error';
  textDelta?: string;
  error?: string;
}

const streamQueue: QueuedStreamChunk[][] = [];

export function queueAssistantStream(chunks: QueuedStreamChunk[]): void {
  streamQueue.push(chunks);
}

export function resetStreamQueue(): void {
  streamQueue.length = 0;
}

export async function* aiStreamText(_opts: unknown) {
  const chunks = streamQueue.shift() ?? [{ type: 'text-delta' as const, textDelta: '' }];
  for (const chunk of chunks) {
    yield chunk;
  }
}

// ─── Guardrails stub ────────────────────────────────────────

interface QueuedGuardrail {
  passed: boolean;
  action?: 'block' | 'warn' | 'log';
  ruleId?: string;
  message?: string;
}

const guardQueue: QueuedGuardrail[] = [];

export function queueGuardrail(result: QueuedGuardrail): void {
  guardQueue.push(result);
}

export function resetGuardQueue(): void {
  guardQueue.length = 0;
}

export async function evaluateGuardrails(
  _text: string,
  _scope: 'input' | 'output',
  _tenantId: number,
) {
  return guardQueue.shift() ?? { passed: true };
}

// ─── Reset-all helper ───────────────────────────────────────

export function resetAllQueues(): void {
  resetEmbedQueue();
  resetTextQueue();
  resetStreamQueue();
  resetGuardQueue();
}

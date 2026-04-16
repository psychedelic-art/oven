/**
 * Deterministic stand-ins for `@oven/module-ai` used by e2e tests.
 *
 * The harness favours explicit queues over generic `vi.mock()` calls so
 * that tests can:
 *   1. queue a specific assistant response before invoking the system,
 *   2. assert what was captured by the mock afterwards,
 *   3. reset cleanly between cases.
 *
 * Each e2e spec hoists `vi.mock('@oven/module-ai', () => import(...mock))`
 * to wire the module alias; call `resetMockAi()` in `beforeEach`.
 */

export interface QueuedAssistant {
  kind: 'assistant';
  text: string;
}

export interface QueuedToolCall {
  kind: 'tool';
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}

export type QueuedTurn = QueuedAssistant | QueuedToolCall;

interface MockState {
  turns: QueuedTurn[];
  embeddings: number[][];
  calls: {
    generateText: Array<unknown>;
    streamText: Array<unknown>;
    embed: Array<unknown>;
  };
}

const state: MockState = {
  turns: [],
  embeddings: [],
  calls: { generateText: [], streamText: [], embed: [] },
};

export function resetMockAi(): void {
  state.turns.length = 0;
  state.embeddings.length = 0;
  state.calls.generateText.length = 0;
  state.calls.streamText.length = 0;
  state.calls.embed.length = 0;
}

export function queueAssistant(text: string): void {
  state.turns.push({ kind: 'assistant', text });
}

export function queueToolCall(name: string, args: Record<string, unknown>, result: unknown): void {
  state.turns.push({ kind: 'tool', name, args, result });
}

export function queueEmbedding(vector: number[]): void {
  state.embeddings.push(vector);
}

export function getMockAiCalls() {
  return {
    generateText: [...state.calls.generateText],
    streamText: [...state.calls.streamText],
    embed: [...state.calls.embed],
  };
}

// ─── The mock module shape ──────────────────────────────────
// This object is used with `vi.mock('@oven/module-ai', () => mockAiModule)`.
// Only the surface exercised by the e2e suite is modelled; the production
// module has a larger API.

export const mockAiModule = {
  async aiGenerateText(opts: unknown) {
    state.calls.generateText.push(opts);
    const turn = state.turns.shift();
    if (!turn) {
      return { text: '', tokens: { input: 0, output: 0, total: 0 }, model: 'mock', provider: 'mock' };
    }
    if (turn.kind === 'tool') {
      return {
        text: '',
        toolCalls: [{ name: turn.name, args: turn.args, result: turn.result }],
        tokens: { input: 10, output: 5, total: 15 },
        model: 'mock',
        provider: 'mock',
      };
    }
    return {
      text: turn.text,
      tokens: { input: 10, output: turn.text.length, total: 10 + turn.text.length },
      model: 'mock',
      provider: 'mock',
    };
  },

  async *aiStreamText(opts: unknown) {
    state.calls.streamText.push(opts);
    const turn = state.turns.shift();
    if (!turn || turn.kind !== 'assistant') {
      yield { type: 'text-delta', textDelta: '' };
      return;
    }
    // Emit per-word tokens so tests can assert multiple token deltas.
    const words = turn.text.split(/(\s+)/);
    for (const w of words) {
      yield { type: 'text-delta', textDelta: w };
    }
    yield { type: 'finish', finishReason: 'stop' };
  },

  async aiEmbed(input: unknown) {
    state.calls.embed.push(input);
    const vec = state.embeddings.shift();
    if (!vec) {
      // Deterministic fallback: 1536-dim unit vector biased by input length
      const base = typeof input === 'string' ? input.length : 0;
      return {
        embedding: new Array(1536).fill(0).map((_, i) => (i === (base % 1536) ? 1 : 0)),
        tokens: 8,
      };
    }
    return { embedding: vec, tokens: 8 };
  },
};

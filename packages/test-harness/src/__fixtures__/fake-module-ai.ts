/**
 * Vitest-alias target for `@oven/module-ai`. The alias is declared in
 * `vitest.config.ts` so e2e tests don't transitively load the real
 * module-ai barrel (which pulls in 30+ handler files and Next.js).
 *
 * The queue is shared via a module-level array. Tests import the
 * `queueEmbedding` / `resetEmbedQueue` helpers directly from this file
 * and push embeddings before invoking the system under test.
 */

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

export async function aiGenerateText(_opts: unknown) {
  return {
    text: '',
    tokens: { input: 0, output: 0, total: 0 },
    model: 'mock',
    provider: 'mock',
  };
}

export async function* aiStreamText(_opts: unknown) {
  yield { type: 'text-delta', textDelta: '' };
}

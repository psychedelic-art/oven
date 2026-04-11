import { describe, it, expect } from 'vitest';
import {
  assertCallableProvider,
  resolveSubClientModel,
  ProviderSubClientNotCallableError,
  type AiSdkProvider,
} from '../engine/provider-types';

// F-05-04: regression tests for `resolveSubClientModel` — the typed
// replacement for `(provider as any).transcription?.(id) ?? (provider as any)(id)`
// in `ai-transcribe.handler.ts`.

function makeProvider(extras: Record<string, unknown> = {}): AiSdkProvider {
  // Simulates the Vercel AI SDK provider shape: a callable factory with
  // sibling sub-client functions hanging off it.
  return Object.assign(
    (modelId: string) => ({ modelId, kind: 'language' }),
    extras,
  ) as unknown as AiSdkProvider;
}

describe('resolveSubClientModel', () => {
  it('invokes the named sub-client and returns its result', () => {
    const provider = makeProvider({
      transcription: (m: string) => ({ modelId: m, kind: 'transcription' }),
    });
    const result = resolveSubClientModel(provider, 'transcription', 'whisper-1', 'openai');
    expect(result).toEqual({ modelId: 'whisper-1', kind: 'transcription' });
  });

  it('passes the model id through verbatim to the sub-client factory', () => {
    const received: string[] = [];
    const provider = makeProvider({
      transcription: (m: string) => {
        received.push(m);
        return { modelId: m };
      },
    });
    resolveSubClientModel(provider, 'transcription', 'whisper-large-v3', 'openai');
    expect(received).toEqual(['whisper-large-v3']);
  });

  it('supports arbitrary sub-client names (image, embedding)', () => {
    const provider = makeProvider({
      image: (m: string) => ({ modelId: m, kind: 'image' }),
      embedding: (m: string) => ({ modelId: m, kind: 'embedding' }),
    });
    expect(resolveSubClientModel(provider, 'image', 'dall-e-3', 'openai')).toEqual({
      modelId: 'dall-e-3',
      kind: 'image',
    });
    expect(resolveSubClientModel(provider, 'embedding', 'text-embedding-3-small', 'openai')).toEqual({
      modelId: 'text-embedding-3-small',
      kind: 'embedding',
    });
  });

  it('throws ProviderSubClientNotCallableError when the sub-client is missing', () => {
    const provider = makeProvider({});
    expect(() =>
      resolveSubClientModel(provider, 'transcription', 'whisper-1', 'openai'),
    ).toThrow(ProviderSubClientNotCallableError);
  });

  it('throws ProviderSubClientNotCallableError when the sub-client is not a function', () => {
    const provider = makeProvider({ transcription: { model: 'whisper-1' } });
    expect(() =>
      resolveSubClientModel(provider, 'transcription', 'whisper-1', 'openai'),
    ).toThrow(ProviderSubClientNotCallableError);
  });

  it('throws ProviderSubClientNotCallableError when the sub-client is null', () => {
    const provider = makeProvider({ transcription: null });
    expect(() =>
      resolveSubClientModel(provider, 'transcription', 'whisper-1', 'openai'),
    ).toThrow(ProviderSubClientNotCallableError);
  });

  it('throws ProviderSubClientNotCallableError when the sub-client is a string', () => {
    const provider = makeProvider({ transcription: 'whisper' });
    expect(() =>
      resolveSubClientModel(provider, 'transcription', 'whisper-1', 'openai'),
    ).toThrow(ProviderSubClientNotCallableError);
  });

  it('does NOT fall back to the top-level callable when the sub-client is absent', () => {
    // This is the critical behavioural difference vs. the old
    // `openai.transcription?.(model) ?? openai(model)` pattern:
    // calling the top-level language-model factory with a whisper id
    // returns an LLM, which would then fail at transcribe() runtime.
    // The helper must refuse the fallback and throw immediately.
    let topLevelCallCount = 0;
    const provider = Object.assign(
      (modelId: string) => {
        topLevelCallCount += 1;
        return { modelId, kind: 'language' };
      },
      // no sub-clients
    ) as unknown as AiSdkProvider;
    expect(() =>
      resolveSubClientModel(provider, 'transcription', 'whisper-1', 'openai'),
    ).toThrow(ProviderSubClientNotCallableError);
    expect(topLevelCallCount).toBe(0);
  });

  it('embeds both provider and sub-client names in the error message', () => {
    try {
      resolveSubClientModel(makeProvider({}), 'image', 'dall-e-3', 'stability-ai');
      expect.fail('expected guard to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderSubClientNotCallableError);
      const typed = err as ProviderSubClientNotCallableError;
      expect(typed.providerName).toBe('stability-ai');
      expect(typed.subClientName).toBe('image');
      expect(typed.message).toContain('stability-ai');
      expect(typed.message).toContain('image');
      expect(typed.name).toBe('ProviderSubClientNotCallableError');
    }
  });

  it('ProviderSubClientNotCallableError extends Error so instanceof Error works', () => {
    const err = new ProviderSubClientNotCallableError('openai', 'transcription');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ProviderSubClientNotCallableError);
  });

  it('composes with assertCallableProvider for the end-to-end pipeline', () => {
    // Simulates the handler pipeline exactly: resolve() -> assert -> sub-client.
    const raw: unknown = Object.assign(
      (modelId: string) => ({ modelId, kind: 'language' }),
      { transcription: (m: string) => ({ modelId: m, kind: 'transcription' }) },
    );
    assertCallableProvider(raw, 'openai');
    const model = resolveSubClientModel(raw, 'transcription', 'whisper-1', 'openai');
    expect(model).toEqual({ modelId: 'whisper-1', kind: 'transcription' });
  });

  it('does not mutate the provider while resolving the sub-client', () => {
    const provider = Object.assign(
      (m: string) => ({ m }),
      { transcription: (m: string) => ({ m }) },
    ) as unknown as AiSdkProvider;
    const snapshot = Object.keys(provider).slice().sort();
    resolveSubClientModel(provider, 'transcription', 'whisper-1', 'openai');
    expect(Object.keys(provider).slice().sort()).toEqual(snapshot);
  });
});

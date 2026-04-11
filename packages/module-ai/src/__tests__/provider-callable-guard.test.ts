import { describe, it, expect } from 'vitest';
import {
  assertCallableProvider,
  ProviderNotCallableError,
  type AiSdkProvider,
} from '../engine/provider-types';

// F-05-03: regression tests for the shape guard that replaces the
// `(sdkProvider as any)(...)` calls in ai-providers-test.handler.ts.

describe('assertCallableProvider', () => {
  it('throws ProviderNotCallableError when value is null', () => {
    expect(() => assertCallableProvider(null, 'openai')).toThrow(
      ProviderNotCallableError,
    );
  });

  it('throws ProviderNotCallableError when value is undefined', () => {
    expect(() => assertCallableProvider(undefined, 'anthropic')).toThrow(
      ProviderNotCallableError,
    );
  });

  it('throws ProviderNotCallableError when value is a plain object', () => {
    expect(() => assertCallableProvider({ apiKey: 'x' }, 'google')).toThrow(
      ProviderNotCallableError,
    );
  });

  it('throws ProviderNotCallableError when value is a string', () => {
    expect(() => assertCallableProvider('sk-test', 'openai')).toThrow(
      ProviderNotCallableError,
    );
  });

  it('throws ProviderNotCallableError when value is a number', () => {
    expect(() => assertCallableProvider(42, 'openai')).toThrow(
      ProviderNotCallableError,
    );
  });

  it('does not throw when value is a plain function', () => {
    const fn = () => ({ modelId: 'gpt-4o-mini' });
    expect(() => assertCallableProvider(fn, 'openai')).not.toThrow();
  });

  it('does not throw when value is an AI-SDK-shaped callable with sub-clients', () => {
    // Simulates `createOpenAI()` return value shape: callable + sub-clients.
    const provider = Object.assign(
      (modelId: string) => ({ modelId }),
      { transcription: (m: string) => ({ modelId: m, kind: 'transcription' }) },
    );
    expect(() => assertCallableProvider(provider, 'openai')).not.toThrow();
  });

  it('narrows the type so the variable is callable after assertion', () => {
    const raw: unknown = (modelId: string) => ({ modelId, kind: 'language' });
    assertCallableProvider(raw, 'openai');
    // After the guard, TS treats `raw` as AiSdkProvider — calling it is legal.
    // This also verifies runtime behaviour: the call produces the expected shape.
    const model = (raw as AiSdkProvider)('gpt-4o-mini');
    expect(model).toEqual({ modelId: 'gpt-4o-mini', kind: 'language' });
  });

  it('embeds the provider name in the error message for debuggability', () => {
    try {
      assertCallableProvider(null, 'custom-provider-slug');
      expect.fail('expected guard to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderNotCallableError);
      const typed = err as ProviderNotCallableError;
      expect(typed.providerName).toBe('custom-provider-slug');
      expect(typed.message).toContain('custom-provider-slug');
      expect(typed.name).toBe('ProviderNotCallableError');
    }
  });

  it('ProviderNotCallableError extends Error so instanceof Error works', () => {
    const err = new ProviderNotCallableError('openai');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ProviderNotCallableError);
  });

  it('does not mutate the value it narrows', () => {
    const provider = Object.assign(() => ({}), { transcription: () => ({}) });
    const before = { ...provider };
    assertCallableProvider(provider, 'openai');
    expect({ ...provider }).toEqual(before);
  });
});

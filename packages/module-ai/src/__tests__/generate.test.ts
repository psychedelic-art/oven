import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock AI SDK
vi.mock('ai', () => ({
  generateText: vi.fn().mockResolvedValue({
    text: 'Generated text response',
    usage: { promptTokens: 10, completionTokens: 20 },
  }),
  streamText: vi.fn(() => ({
    textStream: new ReadableStream({
      start(controller) {
        controller.enqueue('Hello');
        controller.enqueue(' world');
        controller.close();
      },
    }),
  })),
  wrapLanguageModel: vi.fn(({ model }) => model),
}));

vi.mock('../engine/provider-registry', () => ({
  providerRegistry: {
    resolve: vi.fn().mockResolvedValue(
      (modelId: string) => ({ modelId, provider: 'mock-provider' })
    ),
  },
}));

vi.mock('../engine/model-resolver', () => ({
  resolveModel: vi.fn().mockResolvedValue({
    provider: 'openai',
    modelId: 'gpt-4o-mini',
    type: 'text',
    settings: { temperature: 0.7 },
  }),
}));

vi.mock('../engine/middleware', () => ({
  wrapWithMiddleware: vi.fn((model) => model),
}));

vi.mock('../engine/cost-calculator', () => ({
  calculateCost: vi.fn(() => 0.03),
}));

import { aiGenerateText, aiStreamText } from '../tools/generate';
import { resolveModel } from '../engine/model-resolver';
import { providerRegistry } from '../engine/provider-registry';
import { wrapWithMiddleware } from '../engine/middleware';
import { calculateCost } from '../engine/cost-calculator';
import { generateText } from 'ai';

describe('aiGenerateText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves model alias and calls generateText', async () => {
    const result = await aiGenerateText({ prompt: 'Hello' });
    expect(resolveModel).toHaveBeenCalledWith('fast');
    expect(generateText).toHaveBeenCalled();
    expect(result.text).toBe('Generated text response');
  });

  it('uses provided model alias instead of default', async () => {
    await aiGenerateText({ prompt: 'Hello', model: 'smart' });
    expect(resolveModel).toHaveBeenCalledWith('smart');
  });

  it('wraps model with middleware when tenantId is present', async () => {
    await aiGenerateText({ prompt: 'Hello', tenantId: 42 });
    expect(wrapWithMiddleware).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tenantId: 42 })
    );
  });

  it('does NOT wrap with middleware when tenantId is absent', async () => {
    await aiGenerateText({ prompt: 'Hello' });
    expect(wrapWithMiddleware).not.toHaveBeenCalled();
  });

  it('returns token usage in the result', async () => {
    const result = await aiGenerateText({ prompt: 'Hello' });
    expect(result.tokens).toEqual({ input: 10, output: 20, total: 30 });
  });

  it('calculates cost using the resolved model', async () => {
    const result = await aiGenerateText({ prompt: 'Hello' });
    expect(calculateCost).toHaveBeenCalledWith('gpt-4o-mini', 10, 20);
    expect(result.costCents).toBe(0.03);
  });

  it('passes system prompt and temperature to generateText', async () => {
    await aiGenerateText({
      prompt: 'Hello',
      system: 'You are a helper',
      temperature: 0.2,
    });
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'Hello',
        system: 'You are a helper',
        temperature: 0.2,
      })
    );
  });

  it('returns model and provider in the result', async () => {
    const result = await aiGenerateText({ prompt: 'Hello' });
    expect(result.model).toBe('gpt-4o-mini');
    expect(result.provider).toBe('openai');
  });
});

describe('aiStreamText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a ReadableStream', async () => {
    const stream = await aiStreamText({ prompt: 'Hello' });
    expect(stream).toBeInstanceOf(ReadableStream);
  });

  it('resolves model alias before streaming', async () => {
    await aiStreamText({ prompt: 'Hello', model: 'claude' });
    expect(resolveModel).toHaveBeenCalledWith('claude');
  });

  it('wraps model with middleware when tenantId is present', async () => {
    await aiStreamText({ prompt: 'Hello', tenantId: 42 });
    expect(wrapWithMiddleware).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tenantId: 42 })
    );
  });
});

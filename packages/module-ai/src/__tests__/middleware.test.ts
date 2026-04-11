import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('./usage-tracker-mocks', () => ({}));
vi.mock('../engine/usage-tracker', () => ({
  trackAIUsage: vi.fn().mockResolvedValue(undefined),
  checkAIQuota: vi.fn().mockResolvedValue({ allowed: true, remaining: 10000 }),
}));

vi.mock('../engine/guardrail-engine', () => ({
  evaluateGuardrails: vi.fn().mockResolvedValue({ passed: true, action: null, message: null, ruleId: null }),
}));

import { createAIMiddleware, wrapWithMiddleware } from '../engine/middleware';
import { checkAIQuota, trackAIUsage } from '../engine/usage-tracker';
import { evaluateGuardrails } from '../engine/guardrail-engine';

describe('AIMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAIMiddleware()', () => {
    it('returns an object with transformParams, wrapGenerate, and wrapStream', () => {
      const middleware = createAIMiddleware({ tenantId: 1 });
      expect(middleware.transformParams).toBeDefined();
      expect(middleware.wrapGenerate).toBeDefined();
      expect(middleware.wrapStream).toBeDefined();
    });
  });

  describe('transformParams', () => {
    it('checks quota when tenantId is present', async () => {
      const middleware = createAIMiddleware({ tenantId: 42 });
      const params = { prompt: 'Hello', modelId: 'gpt-4o' };
      await middleware.transformParams!({ params } as any);
      expect(checkAIQuota).toHaveBeenCalledWith(42);
    });

    it('does NOT check quota when tenantId is absent', async () => {
      const middleware = createAIMiddleware({});
      const params = { prompt: 'Hello' };
      await middleware.transformParams!({ params } as any);
      expect(checkAIQuota).not.toHaveBeenCalled();
    });

    it('throws when quota is exceeded', async () => {
      vi.mocked(checkAIQuota).mockResolvedValueOnce({ allowed: false, remaining: 0 });
      const middleware = createAIMiddleware({ tenantId: 42 });
      await expect(
        middleware.transformParams!({ params: { prompt: 'Hello' } } as any)
      ).rejects.toThrow('AI quota exceeded');
    });

    it('evaluates input guardrails when tenantId is present', async () => {
      const middleware = createAIMiddleware({ tenantId: 42 });
      const params = { prompt: 'Test prompt' };
      await middleware.transformParams!({ params } as any);
      expect(evaluateGuardrails).toHaveBeenCalledWith('Test prompt', 'input', 42);
    });

    it('throws when input guardrail blocks content', async () => {
      vi.mocked(evaluateGuardrails).mockResolvedValueOnce({
        passed: false,
        action: 'block',
        message: 'Prohibited content detected',
        ruleId: 1,
      });
      const middleware = createAIMiddleware({ tenantId: 42 });
      await expect(
        middleware.transformParams!({ params: { prompt: 'bad content' } } as any)
      ).rejects.toThrow('Input blocked by guardrail');
    });

    it('allows content when guardrail warns but does not block', async () => {
      vi.mocked(evaluateGuardrails).mockResolvedValueOnce({
        passed: false,
        action: 'warn',
        message: 'Potentially sensitive content',
        ruleId: 2,
      });
      const middleware = createAIMiddleware({ tenantId: 42 });
      const result = await middleware.transformParams!({ params: { prompt: 'mild content' } } as any);
      expect(result).toEqual({ prompt: 'mild content' });
    });

    it('extracts prompt text from message array format', async () => {
      const middleware = createAIMiddleware({ tenantId: 42 });
      const params = {
        prompt: [
          { role: 'user', content: 'Hello world' },
          { role: 'assistant', content: 'Hi there' },
        ],
      };
      await middleware.transformParams!({ params } as any);
      expect(evaluateGuardrails).toHaveBeenCalledWith(
        expect.stringContaining('Hello world'),
        'input',
        42
      );
    });

    it('returns params unchanged when checks pass', async () => {
      const middleware = createAIMiddleware({ tenantId: 42 });
      const params = { prompt: 'Hello', temperature: 0.7 };
      const result = await middleware.transformParams!({ params } as any);
      expect(result).toEqual(params);
    });
  });

  describe('wrapGenerate', () => {
    const mockDoGenerate = vi.fn().mockResolvedValue({
      text: 'Generated response',
      usage: { promptTokens: 10, completionTokens: 20 },
    });

    it('calls doGenerate and returns the result', async () => {
      const middleware = createAIMiddleware({ tenantId: 42 });
      const result = await middleware.wrapGenerate!({
        doGenerate: mockDoGenerate,
        params: { modelId: 'gpt-4o', provider: 'openai' },
      } as any);
      expect(result.text).toBe('Generated response');
    });

    it('evaluates output guardrails on generated text', async () => {
      const middleware = createAIMiddleware({ tenantId: 42 });
      await middleware.wrapGenerate!({
        doGenerate: mockDoGenerate,
        params: { modelId: 'gpt-4o', provider: 'openai' },
      } as any);
      expect(evaluateGuardrails).toHaveBeenCalledWith('Generated response', 'output', 42);
    });

    it('throws when output guardrail blocks content', async () => {
      vi.mocked(evaluateGuardrails).mockResolvedValueOnce({
        passed: false,
        action: 'block',
        message: 'Output contains prohibited content',
        ruleId: 3,
      });
      const middleware = createAIMiddleware({ tenantId: 42 });
      await expect(
        middleware.wrapGenerate!({
          doGenerate: mockDoGenerate,
          params: { modelId: 'gpt-4o' },
        } as any)
      ).rejects.toThrow('Output blocked by guardrail');
    });

    it('tracks usage after successful generation', async () => {
      const middleware = createAIMiddleware({ tenantId: 42, toolName: 'ai.generate' });
      await middleware.wrapGenerate!({
        doGenerate: mockDoGenerate,
        params: { modelId: 'gpt-4o', provider: 'openai' },
      } as any);
      expect(trackAIUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 42,
          inputTokens: 10,
          outputTokens: 20,
          toolName: 'ai.generate',
        })
      );
    });

    it('does NOT track usage when tenantId is absent', async () => {
      const middleware = createAIMiddleware({});
      await middleware.wrapGenerate!({
        doGenerate: mockDoGenerate,
        params: { modelId: 'gpt-4o' },
      } as any);
      expect(trackAIUsage).not.toHaveBeenCalled();
    });
  });

  describe('wrapStream', () => {
    it('returns a stream that passes through chunks', async () => {
      const chunks = [
        { type: 'text-delta', textDelta: 'Hello' },
        { type: 'response-metadata', usage: { promptTokens: 5, completionTokens: 10 } },
        { type: 'text-delta', textDelta: ' world' },
      ];

      const readableStream = new ReadableStream({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(chunk);
          }
          controller.close();
        },
      });

      const middleware = createAIMiddleware({ tenantId: 42 });
      const { stream } = await middleware.wrapStream!({
        doStream: async () => ({ stream: readableStream }),
        params: { modelId: 'gpt-4o', provider: 'openai' },
      } as any);

      // Read all chunks from the transformed stream
      const reader = stream.getReader();
      const outputChunks = [];
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) outputChunks.push(value);
      }

      expect(outputChunks).toHaveLength(3);
    });

    it('tracks usage after stream completes via flush', async () => {
      const chunks = [
        { type: 'response-metadata', usage: { promptTokens: 15, completionTokens: 25 } },
      ];

      const readableStream = new ReadableStream({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(chunk);
          }
          controller.close();
        },
      });

      const middleware = createAIMiddleware({ tenantId: 42, toolName: 'ai.stream' });
      const { stream } = await middleware.wrapStream!({
        doStream: async () => ({ stream: readableStream }),
        params: { modelId: 'gpt-4o', provider: 'openai' },
      } as any);

      // Consume the stream to trigger flush
      const reader = stream.getReader();
      while (!(await reader.read()).done) { /* consume */ }

      // Wait for flush to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(trackAIUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 42,
          inputTokens: 15,
          outputTokens: 25,
          toolName: 'ai.stream',
        })
      );
    });
  });
});

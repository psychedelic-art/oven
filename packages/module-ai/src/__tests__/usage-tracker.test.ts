import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all external deps
vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(() => {
    const chainable: any = {};
    chainable.insert = vi.fn(() => ({ values: vi.fn().mockResolvedValue([]) }));
    chainable.update = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })) }));
    chainable.select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([]),
      })),
    }));
    return chainable;
  }),
}));

vi.mock('@oven/module-registry', () => ({
  eventBus: {
    emit: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@oven/module-subscriptions', () => ({
  usageMeteringService: {
    trackUsage: vi.fn().mockResolvedValue(undefined),
    checkQuota: vi.fn().mockResolvedValue({ allowed: true, remaining: 50000 }),
  },
}));

// Mock cost-calculator at the path used by both ESM import AND the require() in getCostRate
vi.mock('../engine/cost-calculator', () => ({
  calculateCost: vi.fn(() => 0.05),
  getModelPricing: vi.fn(() => ({ inputPerMToken: 150, outputPerMToken: 600 })),
}));

// Also mock drizzle-orm operators
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: any[]) => args),
  and: vi.fn((...args: any[]) => args),
  sql: vi.fn((strings: TemplateStringsArray, ...values: any[]) => `sql:${strings.join('')}`),
}));

import { trackAIUsage, checkAIQuota } from '../engine/usage-tracker';
import { eventBus } from '@oven/module-registry';
import { usageMeteringService } from '@oven/module-subscriptions';
import { calculateCost } from '../engine/cost-calculator';

describe('UsageTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkAIQuota()', () => {
    it('returns allowed=true when quota is available', async () => {
      const result = await checkAIQuota(1);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(50000);
    });

    it('returns allowed=false when quota is exhausted', async () => {
      vi.mocked(usageMeteringService.checkQuota).mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
      });
      const result = await checkAIQuota(1);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('passes estimatedTokens to checkQuota', async () => {
      await checkAIQuota(1, 500);
      expect(usageMeteringService.checkQuota).toHaveBeenCalledWith(1, 'llm-prompt-tokens', 500);
    });

    it('defaults estimatedTokens to 0', async () => {
      await checkAIQuota(1);
      expect(usageMeteringService.checkQuota).toHaveBeenCalledWith(1, 'llm-prompt-tokens', 0);
    });
  });

  describe('trackAIUsage()', () => {
    const baseParams = {
      tenantId: 1,
      inputTokens: 100,
      outputTokens: 50,
      model: 'gpt-4o-mini',
      provider: 'openai',
      latencyMs: 250,
    };

    it('calls calculateCost with the correct parameters', async () => {
      await trackAIUsage(baseParams);
      expect(calculateCost).toHaveBeenCalledWith('gpt-4o-mini', 100, 50);
    });

    it('forwards prompt tokens to subscription metering', async () => {
      await trackAIUsage(baseParams);
      expect(usageMeteringService.trackUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 1,
          serviceSlug: 'llm-prompt-tokens',
          amount: 100,
        })
      );
    });

    it('forwards completion tokens to subscription metering', async () => {
      await trackAIUsage(baseParams);
      expect(usageMeteringService.trackUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 1,
          serviceSlug: 'llm-completion-tokens',
          amount: 50,
        })
      );
    });

    it('does not forward zero-token counts to metering', async () => {
      await trackAIUsage({ ...baseParams, inputTokens: 0, outputTokens: 0 });
      expect(usageMeteringService.trackUsage).not.toHaveBeenCalled();
    });

    it('emits ai.call.completed event', async () => {
      await trackAIUsage(baseParams);
      expect(eventBus.emit).toHaveBeenCalledWith(
        'ai.call.completed',
        expect.objectContaining({
          tenantId: 1,
          model: 'gpt-4o-mini',
          provider: 'openai',
          inputTokens: 100,
          outputTokens: 50,
          latencyMs: 250,
        })
      );
    });

    it('includes toolName in event payload', async () => {
      await trackAIUsage({ ...baseParams, toolName: 'ai.generateText' });
      expect(eventBus.emit).toHaveBeenCalledWith(
        'ai.call.completed',
        expect.objectContaining({ toolName: 'ai.generateText' })
      );
    });

    it('defaults toolName to null in event payload', async () => {
      await trackAIUsage(baseParams);
      expect(eventBus.emit).toHaveBeenCalledWith(
        'ai.call.completed',
        expect.objectContaining({ toolName: null })
      );
    });
  });
});

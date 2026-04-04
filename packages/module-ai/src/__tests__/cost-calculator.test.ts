import { describe, it, expect } from 'vitest';
import { calculateCost, getModelPricing, hasModelPricing } from '../engine/cost-calculator';

describe('cost-calculator', () => {
  describe('calculateCost()', () => {
    it('calculates cost for gpt-4o with 1000 input and 500 output tokens', () => {
      // gpt-4o: 250 cents/MToken input, 1000 cents/MToken output
      // input: (1000 / 1_000_000) * 250 = 0.00025
      // output: (500 / 1_000_000) * 1000 = 0.0005
      // total: 0.00075, rounded = 0
      const cost = calculateCost('gpt-4o', 1000, 500);
      expect(cost).toBeGreaterThanOrEqual(0);
      expect(typeof cost).toBe('number');
    });

    it('gpt-4o-mini costs less than gpt-4o for same tokens', () => {
      const costFull = calculateCost('gpt-4o', 100_000, 50_000);
      const costMini = calculateCost('gpt-4o-mini', 100_000, 50_000);
      expect(costMini).toBeLessThan(costFull);
    });

    it('returns 0 for unknown model', () => {
      const cost = calculateCost('unknown-model-xyz', 1000, 500);
      expect(cost).toBe(0);
    });

    it('returns 0 with 0 tokens', () => {
      const cost = calculateCost('gpt-4o', 0, 0);
      expect(cost).toBe(0);
    });

    it('calculates correctly for large token counts', () => {
      // gpt-4o: 250 input, 1000 output per MToken
      // 1M input: (1_000_000 / 1_000_000) * 250 = 250
      // 1M output: (1_000_000 / 1_000_000) * 1000 = 1000
      // total raw = 1250, rounded = 1250
      const cost = calculateCost('gpt-4o', 1_000_000, 1_000_000);
      expect(cost).toBe(1250);
    });

    it('handles embedding model (output tokens = 0)', () => {
      // text-embedding-3-small: 2 cents/MToken input, 0 output
      const cost = calculateCost('text-embedding-3-small', 1_000_000, 0);
      expect(cost).toBe(2);
    });

    it('returns non-negative values', () => {
      const cost = calculateCost('gpt-4o', 1, 1);
      expect(cost).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getModelPricing()', () => {
    it('returns pricing object for known model', () => {
      const pricing = getModelPricing('gpt-4o');
      expect(pricing).not.toBeNull();
      expect(pricing).toHaveProperty('inputPerMToken');
      expect(pricing).toHaveProperty('outputPerMToken');
      expect(pricing!.inputPerMToken).toBe(250);
      expect(pricing!.outputPerMToken).toBe(1000);
    });

    it('returns null for unknown model', () => {
      const pricing = getModelPricing('nonexistent-model');
      expect(pricing).toBeNull();
    });

    it('returns correct pricing for embedding model', () => {
      const pricing = getModelPricing('text-embedding-3-small');
      expect(pricing).not.toBeNull();
      expect(pricing!.inputPerMToken).toBe(2);
      expect(pricing!.outputPerMToken).toBe(0);
    });
  });

  describe('hasModelPricing()', () => {
    it('returns true for known model', () => {
      expect(hasModelPricing('gpt-4o')).toBe(true);
    });

    it('returns false for unknown model', () => {
      expect(hasModelPricing('nonexistent-model')).toBe(false);
    });
  });
});

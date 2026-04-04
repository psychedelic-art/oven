import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock external deps before importing the module under test
vi.mock('@ai-sdk/openai', () => ({ createOpenAI: vi.fn((opts: any) => ({ id: 'openai-mock', ...opts })) }));
vi.mock('@ai-sdk/anthropic', () => ({ createAnthropic: vi.fn((opts: any) => ({ id: 'anthropic-mock', ...opts })) }));
vi.mock('@ai-sdk/google', () => ({ createGoogleGenerativeAI: vi.fn((opts: any) => ({ id: 'google-mock', ...opts })) }));

vi.mock('../engine/encryption', () => ({
  decrypt: vi.fn((val: string) => `decrypted-${val}`),
  isEncrypted: vi.fn((val: string) => val.includes(':')),
  encrypt: vi.fn((val: string) => `iv:tag:${val}`),
  maskApiKey: vi.fn(() => '••••••••'),
}));

vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  })),
}));

import { providerRegistry } from '../engine/provider-registry';

describe('ProviderRegistry', () => {
  beforeEach(() => {
    providerRegistry.clearCache();
  });

  describe('register()', () => {
    it('stores a provider factory', () => {
      const factory = () => ({ id: 'custom' });
      providerRegistry.register('custom-provider', factory);
      expect(providerRegistry.has('custom-provider')).toBe(true);
    });
  });

  describe('resolve()', () => {
    it('returns the registered provider from a factory', async () => {
      const factory = () => ({ id: 'test-provider' });
      providerRegistry.register('test-resolve', factory);
      const result = await providerRegistry.resolve('test-resolve');
      expect(result).toEqual({ id: 'test-provider' });
    });

    it('caches the provider instance after first resolve', async () => {
      let callCount = 0;
      const factory = () => {
        callCount++;
        return { id: 'cached' };
      };
      providerRegistry.register('cached-test', factory);

      await providerRegistry.resolve('cached-test');
      await providerRegistry.resolve('cached-test');
      expect(callCount).toBe(1);
    });

    it('throws for unknown provider not in registry, DB, or env', async () => {
      await expect(providerRegistry.resolve('nonexistent-xyz'))
        .rejects.toThrow('is not configured');
    });

    it('falls back to env var when DB has no key', async () => {
      // Set env var for openai
      process.env.OPENAI_API_KEY = 'test-key-123';
      providerRegistry.clearCache();

      const result = await providerRegistry.resolve('openai');
      expect(result).toBeDefined();
      expect((result as any).id).toBe('openai-mock');

      delete process.env.OPENAI_API_KEY;
    });

    it('resolves from DB when provider has encrypted key', async () => {
      const { getDb } = await import('@oven/module-registry/db');
      vi.mocked(getDb).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          slug: 'openai',
          type: 'openai',
          apiKeyEncrypted: 'iv:tag:sk-test-key',
          baseUrl: null,
          enabled: true,
        }]),
      } as any);

      providerRegistry.clearCache();
      const result = await providerRegistry.resolve('openai');
      expect(result).toBeDefined();

      // Restore default mock
      vi.mocked(getDb).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      } as any);
    });
  });

  describe('has()', () => {
    it('returns true for manually registered provider', () => {
      providerRegistry.register('my-custom', () => ({}));
      expect(providerRegistry.has('my-custom')).toBe(true);
    });

    it('returns false for unregistered provider', () => {
      expect(providerRegistry.has('does-not-exist')).toBe(false);
    });
  });

  describe('getAll()', () => {
    it('returns a Map of all registered providers', () => {
      providerRegistry.register('test-all-1', () => ({}));
      providerRegistry.register('test-all-2', () => ({}));
      const all = providerRegistry.getAll();
      expect(all).toBeInstanceOf(Map);
      expect(all.has('test-all-1')).toBe(true);
      expect(all.has('test-all-2')).toBe(true);
    });

    it('returns a copy (not the internal map)', () => {
      providerRegistry.register('copy-test', () => ({}));
      const all = providerRegistry.getAll();
      all.delete('copy-test');
      expect(providerRegistry.has('copy-test')).toBe(true);
    });
  });

  describe('clearCache()', () => {
    it('clears cached instances so factory is called again on next resolve', async () => {
      let callCount = 0;
      const factory = () => {
        callCount++;
        return { id: 'reclear' };
      };
      providerRegistry.register('reclear-test', factory);

      await providerRegistry.resolve('reclear-test');
      expect(callCount).toBe(1);

      providerRegistry.clearCache();

      await providerRegistry.resolve('reclear-test');
      expect(callCount).toBe(2);
    });
  });
});

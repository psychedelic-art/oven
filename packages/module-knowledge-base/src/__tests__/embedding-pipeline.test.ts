import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────

vi.mock('@oven/module-ai', () => ({
  aiEmbed: vi.fn().mockResolvedValue({
    embedding: new Array(1536).fill(0.1),
    tokens: 25,
  }),
}));

vi.mock('@oven/module-registry', () => ({
  eventBus: {
    emit: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@oven/module-subscriptions', () => ({
  usageMeteringService: {
    trackUsage: vi.fn().mockResolvedValue({ recorded: true, remaining: 100, exceeded: false }),
  },
}));

// Track what select().from().where().limit() returns
let selectResult: unknown[] = [];

// Create a thenable object that acts both as a promise (for await without .limit())
// and as an object with .limit() method
function createWhereResult() {
  const result = {
    limit: vi.fn(() => Promise.resolve(selectResult)),
    then: (resolve: (val: unknown) => void, reject?: (err: unknown) => void) => {
      return Promise.resolve(selectResult).then(resolve, reject);
    },
  };
  return result;
}

vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => createWhereResult()),
        limit: vi.fn(() => Promise.resolve(selectResult)),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([selectResult[0]])),
        })),
      })),
    })),
    execute: vi.fn().mockResolvedValue({ rowCount: 1 }),
  })),
}));

import { embedEntry, bulkEmbed } from '../engine/embedding-pipeline';
import { aiEmbed } from '@oven/module-ai';
import { eventBus } from '@oven/module-registry';
import { usageMeteringService } from '@oven/module-subscriptions';

describe('EmbeddingPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResult = [];
  });

  describe('embedEntry()', () => {
    const mockEntry = {
      id: 42,
      tenantId: 5,
      question: '¿Cuál es el horario?',
      answer: 'De lunes a viernes de 8AM a 6PM.',
      metadata: null,
    };

    it('calls aiEmbed with concatenated question + answer', async () => {
      selectResult = [mockEntry];
      await embedEntry(42);
      expect(aiEmbed).toHaveBeenCalledWith(
        '¿Cuál es el horario? De lunes a viernes de 8AM a 6PM.',
        undefined
      );
    });

    it('emits kb.entry.embedded event on success', async () => {
      selectResult = [mockEntry];
      await embedEntry(42);
      expect(eventBus.emit).toHaveBeenCalledWith('kb.entry.embedded', expect.objectContaining({
        id: 42,
        tenantId: 5,
      }));
    });

    it('returns success result with model and dimensions', async () => {
      selectResult = [mockEntry];
      const result = await embedEntry(42);
      expect(result.success).toBe(true);
      expect(result.entryId).toBe(42);
      expect(result.dimensions).toBe(1536);
    });

    it('returns failure result when entry not found', async () => {
      selectResult = [];
      const result = await embedEntry(999);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('handles aiEmbed errors gracefully', async () => {
      selectResult = [mockEntry];
      vi.mocked(aiEmbed).mockRejectedValueOnce(new Error('Rate limit exceeded'));
      const result = await embedEntry(42);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
    });

    it('uses custom model when provided', async () => {
      selectResult = [mockEntry];
      await embedEntry(42, 'text-embedding-3-large');
      expect(aiEmbed).toHaveBeenCalledWith(
        expect.any(String),
        'text-embedding-3-large'
      );
    });

    it('tracks usage metering on successful embed', async () => {
      selectResult = [mockEntry];
      await embedEntry(42);
      expect(usageMeteringService.trackUsage).toHaveBeenCalledWith({
        tenantId: 5,
        serviceSlug: 'ai-embeddings',
        amount: 1,
      });
    });

    it('does NOT track usage metering on failed embed', async () => {
      selectResult = [mockEntry];
      vi.mocked(aiEmbed).mockRejectedValueOnce(new Error('API error'));
      await embedEntry(42);
      expect(usageMeteringService.trackUsage).not.toHaveBeenCalled();
    });
  });

  describe('bulkEmbed()', () => {
    it('returns zero counts when no entries need embedding', async () => {
      selectResult = [];
      const result = await bulkEmbed({ tenantId: 5 });
      expect(result.total).toBe(0);
      expect(result.embedded).toBe(0);
    });
  });
});

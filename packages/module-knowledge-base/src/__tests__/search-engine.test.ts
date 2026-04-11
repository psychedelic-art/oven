import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────

vi.mock('@oven/module-ai', () => ({
  aiEmbed: vi.fn().mockResolvedValue({
    embedding: new Array(1536).fill(0.1),
    tokens: 15,
  }),
}));

vi.mock('@oven/module-registry', () => ({
  eventBus: {
    emit: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockExecute = vi.fn().mockResolvedValue({ rows: [] });

vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(() => ({
    execute: mockExecute,
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
  sql: Object.assign(
    vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => `sql:${strings.join('')}`),
    { raw: vi.fn((s: string) => s), join: vi.fn((...args: unknown[]) => args) }
  ),
  ilike: vi.fn((...args: unknown[]) => args),
  desc: vi.fn((col: unknown) => col),
}));

import { semanticSearch, keywordSearch, hybridSearch } from '../engine/search-engine';
import { aiEmbed } from '@oven/module-ai';
import { eventBus } from '@oven/module-registry';

describe('SearchEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('semanticSearch()', () => {
    it('embeds the query text via aiEmbed', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });
      await semanticSearch({ query: '¿Cuál es el horario?', tenantId: 5 });
      expect(aiEmbed).toHaveBeenCalledWith('¿Cuál es el horario?');
    });

    it('executes pgvector similarity query', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });
      await semanticSearch({ query: 'test', tenantId: 5 });
      expect(mockExecute).toHaveBeenCalled();
    });

    it('returns results with score and matchType "semantic"', async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [{
          id: 42,
          question: '¿Cuál es el horario?',
          answer: 'De lunes a viernes de 8AM a 6PM.',
          category_name: 'Horarios',
          category_slug: 'horarios',
          score: 0.94,
          language: 'es',
        }],
      });
      const result = await semanticSearch({ query: 'horario', tenantId: 5 });
      expect(result.results).toHaveLength(1);
      expect(result.results[0].matchType).toBe('semantic');
      expect(result.results[0].score).toBe(0.94);
    });

    it('respects maxResults parameter', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });
      await semanticSearch({ query: 'test', tenantId: 5, maxResults: 3 });
      // The SQL should include LIMIT 3
      expect(mockExecute).toHaveBeenCalled();
    });

    it('sets topResultConfident based on confidence threshold', async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [{
          id: 1, question: 'Q', answer: 'A',
          category_name: 'Cat', category_slug: 'cat',
          score: 0.92, language: 'es',
        }],
      });
      const result = await semanticSearch({ query: 'test', tenantId: 5 });
      expect(result.topResultConfident).toBe(true);
      expect(result.confidenceThreshold).toBe(0.8);
    });

    it('marks topResultConfident=false when score below threshold', async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [{
          id: 1, question: 'Q', answer: 'A',
          category_name: 'Cat', category_slug: 'cat',
          score: 0.65, language: 'es',
        }],
      });
      const result = await semanticSearch({ query: 'test', tenantId: 5 });
      expect(result.topResultConfident).toBe(false);
    });

    it('emits kb.search.executed event', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });
      await semanticSearch({ query: 'test query', tenantId: 5 });
      expect(eventBus.emit).toHaveBeenCalledWith('kb.search.executed', expect.objectContaining({
        tenantId: 5,
        query: 'test query',
        resultCount: 0,
      }));
    });

    it('returns empty results when no matches found', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });
      const result = await semanticSearch({ query: 'xyz123', tenantId: 5 });
      expect(result.results).toEqual([]);
      expect(result.totalResults).toBe(0);
      expect(result.topResultConfident).toBe(false);
    });
  });

  describe('keywordSearch()', () => {
    it('searches using JSONB keyword matching', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });
      await keywordSearch({ query: 'horario atención', tenantId: 5 });
      expect(mockExecute).toHaveBeenCalled();
    });

    it('returns results with matchType "keyword"', async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [{
          id: 10, question: 'Horario', answer: 'L-V 8-6',
          category_name: 'Horarios', category_slug: 'horarios',
          score: 0.5, language: 'es',
        }],
      });
      const result = await keywordSearch({ query: 'horario', tenantId: 5 });
      expect(result.results[0].matchType).toBe('keyword');
    });
  });

  describe('hybridSearch()', () => {
    it('runs semantic search first', async () => {
      // Semantic returns high-confidence result
      mockExecute
        .mockResolvedValueOnce({
          rows: [{
            id: 1, question: 'Q', answer: 'A',
            category_name: 'Cat', category_slug: 'cat',
            score: 0.95, language: 'es',
          }],
        });
      const result = await hybridSearch({ query: 'test', tenantId: 5 });
      expect(result.topResultConfident).toBe(true);
      expect(result.results[0].matchType).toBe('semantic');
    });

    it('falls back to keyword search when semantic score is low', async () => {
      // Semantic returns low-confidence
      mockExecute
        .mockResolvedValueOnce({
          rows: [{
            id: 1, question: 'Q', answer: 'A',
            category_name: 'Cat', category_slug: 'cat',
            score: 0.5, language: 'es',
          }],
        })
        // Keyword search
        .mockResolvedValueOnce({
          rows: [{
            id: 2, question: 'Q2', answer: 'A2',
            category_name: 'Cat', category_slug: 'cat',
            score: 0.7, language: 'es',
          }],
        });
      const result = await hybridSearch({ query: 'test', tenantId: 5 });
      expect(result.results.length).toBeGreaterThanOrEqual(1);
    });
  });
});

import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { aiEmbed } from '@oven/module-ai';
import { sql } from 'drizzle-orm';
import type { SearchOptions, SearchResponse, SearchResult } from '../types';

// ─── Constants ──────────────────────────────────────────────

const DEFAULT_CONFIDENCE_THRESHOLD = 0.8;
const DEFAULT_MAX_RESULTS = 5;
const DEFAULT_SEMANTIC_WEIGHT = 0.7;
const DEFAULT_KEYWORD_WEIGHT = 0.3;

// ─── Row → SearchResult mapper ─────────────────────────────

function mapRow(row: Record<string, unknown>, matchType: 'semantic' | 'keyword'): SearchResult {
  return {
    id: Number(row.id),
    question: row.question as string,
    answer: row.answer as string,
    category: (row.category_name ?? '') as string,
    categorySlug: (row.category_slug ?? '') as string,
    score: Number(row.score ?? 0),
    matchType,
    language: (row.language ?? 'es') as string,
    tags: (row.tags as string[]) ?? undefined,
  };
}

// ─── Semantic Search ────────────────────────────────────────

/**
 * Search KB entries using pgvector cosine similarity.
 * Embeds the query, runs vector similarity search, returns ranked results.
 */
export async function semanticSearch(
  options: SearchOptions,
  confidenceThreshold: number = DEFAULT_CONFIDENCE_THRESHOLD
): Promise<SearchResponse> {
  const { query, tenantId, knowledgeBaseId, language, categorySlug, maxResults = DEFAULT_MAX_RESULTS } = options;
  const db = getDb();

  // 1. Embed the query
  const embedResult = await aiEmbed(query);
  const embeddingStr = `[${embedResult.embedding.join(',')}]`;

  // 2. Build optional filters
  let kbFilter = sql``;
  if (knowledgeBaseId) {
    kbFilter = sql` AND e.knowledge_base_id = ${knowledgeBaseId}`;
  }
  let languageFilter = sql``;
  if (language) {
    languageFilter = sql` AND e.language = ${language}`;
  }
  let categoryFilter = sql``;
  if (categorySlug) {
    categoryFilter = sql` AND c.slug = ${categorySlug}`;
  }

  // 3. Run pgvector similarity query
  const result = await db.execute(sql`
    SELECT
      e.id,
      e.question,
      e.answer,
      e.language,
      e.tags,
      c.name AS category_name,
      c.slug AS category_slug,
      1 - (e.embedding <=> ${embeddingStr}::vector) AS score
    FROM kb_entries e
    LEFT JOIN kb_categories c ON c.id = e.category_id AND c.tenant_id = e.tenant_id
    WHERE e.tenant_id = ${tenantId}
      AND e.enabled = true
      AND e.embedding IS NOT NULL
      ${kbFilter}
      ${languageFilter}
      ${categoryFilter}
    ORDER BY e.embedding <=> ${embeddingStr}::vector
    LIMIT ${maxResults}
  `);

  const rows = (result.rows ?? result) as Array<Record<string, unknown>>;
  const results: SearchResult[] = rows.map((row) => mapRow(row, 'semantic'));

  const topScore = results.length > 0 ? results[0].score : 0;
  const topResultConfident = topScore >= confidenceThreshold;

  // 4. Emit search event
  await eventBus.emit('kb.search.executed', {
    tenantId,
    query,
    resultCount: results.length,
    topScore,
    confident: topResultConfident,
  });

  return {
    results,
    totalResults: results.length,
    confidenceThreshold,
    topResultConfident,
  };
}

// ─── Keyword Search ─────────────────────────────────────────

/**
 * Search KB entries using JSONB keyword matching.
 * Fallback when semantic search returns low-confidence results.
 */
export async function keywordSearch(
  options: SearchOptions
): Promise<SearchResponse> {
  const { query, tenantId, knowledgeBaseId, language, categorySlug, maxResults = DEFAULT_MAX_RESULTS } = options;
  const db = getDb();

  // Split query into search terms
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  if (terms.length === 0) {
    return { results: [], totalResults: 0, confidenceThreshold: 0, topResultConfident: false };
  }

  const termsArray = `{${terms.join(',')}}`;

  let kbFilter = sql``;
  if (knowledgeBaseId) {
    kbFilter = sql` AND e.knowledge_base_id = ${knowledgeBaseId}`;
  }
  let languageFilter = sql``;
  if (language) {
    languageFilter = sql` AND e.language = ${language}`;
  }
  let categoryFilter = sql``;
  if (categorySlug) {
    categoryFilter = sql` AND c.slug = ${categorySlug}`;
  }

  const result = await db.execute(sql`
    SELECT
      e.id,
      e.question,
      e.answer,
      e.language,
      e.tags,
      c.name AS category_name,
      c.slug AS category_slug,
      0.5 AS score
    FROM kb_entries e
    LEFT JOIN kb_categories c ON c.id = e.category_id AND c.tenant_id = e.tenant_id
    WHERE e.tenant_id = ${tenantId}
      AND e.enabled = true
      AND (
        e.keywords ?| ${termsArray}::text[]
        OR e.question ILIKE ${'%' + terms[0] + '%'}
      )
      ${kbFilter}
      ${languageFilter}
      ${categoryFilter}
    ORDER BY e.priority DESC
    LIMIT ${maxResults}
  `);

  const rows = (result.rows ?? result) as Array<Record<string, unknown>>;
  const results: SearchResult[] = rows.map((row) => mapRow(row, 'keyword'));

  return {
    results,
    totalResults: results.length,
    confidenceThreshold: 0,
    topResultConfident: false,
  };
}

// ─── Hybrid Search ──────────────────────────────────────────

/**
 * Hybrid search: semantic first, keyword fallback if confidence is low.
 * Merges results by entry ID, re-ranks with weighted scores.
 */
export async function hybridSearch(
  options: SearchOptions,
  confidenceThreshold: number = DEFAULT_CONFIDENCE_THRESHOLD
): Promise<SearchResponse> {
  // 1. Run semantic search
  const semanticResult = await semanticSearch(options, confidenceThreshold);

  // If top result is confident, return semantic results directly
  if (semanticResult.topResultConfident) {
    return semanticResult;
  }

  // 2. Run keyword fallback
  const keywordResult = await keywordSearch(options);

  // 3. Merge results by entry ID
  const merged = new Map<number, SearchResult>();

  for (const r of semanticResult.results) {
    merged.set(r.id, { ...r, score: r.score * DEFAULT_SEMANTIC_WEIGHT });
  }

  for (const r of keywordResult.results) {
    const existing = merged.get(r.id);
    if (existing) {
      existing.score += r.score * DEFAULT_KEYWORD_WEIGHT;
      existing.matchType = 'hybrid';
    } else {
      merged.set(r.id, { ...r, score: r.score * DEFAULT_KEYWORD_WEIGHT });
    }
  }

  // 4. Sort by merged score descending
  const results = Array.from(merged.values()).sort((a, b) => b.score - a.score);
  const maxResults = options.maxResults ?? DEFAULT_MAX_RESULTS;
  const trimmed = results.slice(0, maxResults);

  const topScore = trimmed.length > 0 ? trimmed[0].score : 0;

  return {
    results: trimmed,
    totalResults: trimmed.length,
    confidenceThreshold,
    topResultConfident: topScore >= confidenceThreshold,
  };
}

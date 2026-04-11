// ─── Embedding Status ────────────────────────────────────────

export type EmbeddingStatus = 'pending' | 'processing' | 'embedded' | 'failed';

// ─── Entry Metadata ──────────────────────────────────────────

export interface EntryMetadata {
  embeddingStatus?: EmbeddingStatus;
  embeddedAt?: string;
  embeddingModel?: string;
  embeddingError?: string | null;
  restoredFrom?: number;
}

// ─── Search Types ────────────────────────────────────────────

export type MatchType = 'semantic' | 'keyword' | 'hybrid';

export interface SearchResult {
  id: number;
  question: string;
  answer: string;
  category: string;
  categorySlug: string;
  score: number;
  matchType: MatchType;
  language: string;
  tags?: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  totalResults: number;
  confidenceThreshold: number;
  topResultConfident: boolean;
}

export interface SearchOptions {
  query: string;
  tenantId: number;
  knowledgeBaseId?: number;
  language?: string;
  categorySlug?: string;
  tags?: string[];
  maxResults?: number;
}

// ─── Bulk Ingest ─────────────────────────────────────────────

export interface BulkEmbedOptions {
  tenantId: number;
  knowledgeBaseId?: number;
  categoryId?: number;
  force?: boolean;
}

export interface BulkEmbedResult {
  total: number;
  embedded: number;
  failed: number;
  skipped: number;
}

// ─── Embed Entry Result ──────────────────────────────────────

export interface EmbedEntryResult {
  success: boolean;
  entryId: number;
  model?: string;
  dimensions?: number;
  error?: string;
}

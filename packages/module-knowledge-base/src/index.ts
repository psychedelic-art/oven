import type { ModuleDefinition, EventSchemaMap } from '@oven/module-registry';
import { kbSchema } from './schema';
import { seedKnowledgeBase } from './seed';
import { embedEntry } from './engine/embedding-pipeline';
import * as kbCategoriesHandler from './api/kb-categories.handler';
import * as kbCategoriesByIdHandler from './api/kb-categories-by-id.handler';
import * as kbEntriesHandler from './api/kb-entries.handler';
import * as kbEntriesByIdHandler from './api/kb-entries-by-id.handler';
import * as kbEntriesVersionsHandler from './api/kb-entries-versions.handler';
import * as kbEntriesVersionsRestoreHandler from './api/kb-entries-versions-restore.handler';
import * as kbSearchHandler from './api/kb-search.handler';
import * as kbIngestHandler from './api/kb-ingest.handler';
import * as kbStatsHandler from './api/kb-stats.handler';
import * as kbKnowledgeBasesHandler from './api/kb-knowledge-bases.handler';
import * as kbKnowledgeBasesByIdHandler from './api/kb-knowledge-bases-by-id.handler';

// ─── Event Schemas ──────────────────────────────────────────

const eventSchemas: EventSchemaMap = {
  'kb.knowledgeBase.created': {
    id: { type: 'number', description: 'KB DB ID', required: true },
    tenantId: { type: 'number', description: 'Owning tenant ID', required: true },
    name: { type: 'string', description: 'KB name' },
    slug: { type: 'string', description: 'KB slug' },
  },
  'kb.knowledgeBase.updated': {
    id: { type: 'number', description: 'KB DB ID', required: true },
    tenantId: { type: 'number', description: 'Owning tenant ID', required: true },
    name: { type: 'string', description: 'KB name' },
  },
  'kb.knowledgeBase.deleted': {
    id: { type: 'number', description: 'KB DB ID', required: true },
    tenantId: { type: 'number', description: 'Owning tenant ID', required: true },
    slug: { type: 'string', description: 'KB slug' },
  },
  'kb.category.created': {
    id: { type: 'number', description: 'Category DB ID', required: true },
    tenantId: { type: 'number', description: 'Owning tenant ID', required: true },
    name: { type: 'string', description: 'Category name' },
    slug: { type: 'string', description: 'Category slug' },
  },
  'kb.category.updated': {
    id: { type: 'number', description: 'Category DB ID', required: true },
    tenantId: { type: 'number', description: 'Owning tenant ID', required: true },
    name: { type: 'string', description: 'Category name' },
  },
  'kb.category.deleted': {
    id: { type: 'number', description: 'Category DB ID', required: true },
    tenantId: { type: 'number', description: 'Owning tenant ID', required: true },
    slug: { type: 'string', description: 'Category slug' },
  },
  'kb.entry.created': {
    id: { type: 'number', description: 'Entry DB ID', required: true },
    tenantId: { type: 'number', description: 'Owning tenant ID', required: true },
    categoryId: { type: 'number', description: 'Category FK' },
    question: { type: 'string', description: 'FAQ question text' },
    language: { type: 'string', description: 'Entry language code' },
  },
  'kb.entry.updated': {
    id: { type: 'number', description: 'Entry DB ID', required: true },
    tenantId: { type: 'number', description: 'Owning tenant ID', required: true },
    question: { type: 'string', description: 'Updated question text' },
    version: { type: 'number', description: 'New version number' },
  },
  'kb.entry.deleted': {
    id: { type: 'number', description: 'Entry DB ID', required: true },
    tenantId: { type: 'number', description: 'Owning tenant ID', required: true },
    question: { type: 'string', description: 'Deleted question text' },
  },
  'kb.entry.embedded': {
    id: { type: 'number', description: 'Entry DB ID', required: true },
    tenantId: { type: 'number', description: 'Owning tenant ID', required: true },
    embeddingModel: { type: 'string', description: 'Model used for embedding' },
    dimensions: { type: 'number', description: 'Vector dimensions' },
  },
  'kb.search.executed': {
    tenantId: { type: 'number', description: 'Searched tenant ID', required: true },
    query: { type: 'string', description: 'Search query text' },
    resultCount: { type: 'number', description: 'Number of results returned' },
    topScore: { type: 'number', description: 'Highest similarity score' },
    confident: { type: 'boolean', description: 'Whether top result met confidence threshold' },
  },
};

// ─── Module Definition ──────────────────────────────────────

export const knowledgeBaseModule: ModuleDefinition = {
  name: 'knowledge-base',
  dependencies: ['ai'],
  description: 'Structured FAQ and knowledge management with categories, entries, embeddings, and semantic search.',
  capabilities: [
    'manage FAQ categories',
    'manage FAQ entries',
    'semantic search',
    'keyword search',
    'bulk embed entries',
  ],
  schema: kbSchema,
  seed: seedKnowledgeBase,
  resources: [
    { name: 'kb-knowledge-bases', options: { label: 'Knowledge Bases' } },
    { name: 'kb-categories', options: { label: 'Categories' } },
    { name: 'kb-entries', options: { label: 'Entries' } },
  ],
  menuItems: [
    { label: 'Knowledge Bases', to: '/kb-knowledge-bases' },
    { label: 'Categories', to: '/kb-categories' },
    { label: 'Entries', to: '/kb-entries' },
  ],
  apiHandlers: {
    // Knowledge Bases CRUD
    'kb-knowledge-bases': { GET: kbKnowledgeBasesHandler.GET, POST: kbKnowledgeBasesHandler.POST },
    'kb-knowledge-bases/[id]': {
      GET: kbKnowledgeBasesByIdHandler.GET,
      PUT: kbKnowledgeBasesByIdHandler.PUT,
      DELETE: kbKnowledgeBasesByIdHandler.DELETE,
    },
    // Categories CRUD
    'kb-categories': { GET: kbCategoriesHandler.GET, POST: kbCategoriesHandler.POST },
    'kb-categories/[id]': {
      GET: kbCategoriesByIdHandler.GET,
      PUT: kbCategoriesByIdHandler.PUT,
      DELETE: kbCategoriesByIdHandler.DELETE,
    },
    // Entries CRUD
    'kb-entries': { GET: kbEntriesHandler.GET, POST: kbEntriesHandler.POST },
    'kb-entries/[id]': {
      GET: kbEntriesByIdHandler.GET,
      PUT: kbEntriesByIdHandler.PUT,
      DELETE: kbEntriesByIdHandler.DELETE,
    },
    // Versions
    'kb-entries/[id]/versions': { GET: kbEntriesVersionsHandler.GET },
    'kb-entries/[id]/versions/[versionId]/restore': { POST: kbEntriesVersionsRestoreHandler.POST },
    // Public search
    'knowledge-base/[tenantSlug]/search': { POST: kbSearchHandler.POST },
    // Bulk operations
    'knowledge-base/[tenantSlug]/ingest': { POST: kbIngestHandler.POST },
    'knowledge-base/[tenantSlug]/stats': { GET: kbStatsHandler.GET },
  },
  configSchema: [
    {
      key: 'MAX_ENTRIES_PER_TENANT',
      type: 'number',
      description: 'Maximum FAQ entries per tenant',
      defaultValue: 500,
      instanceScoped: true,
    },
    {
      key: 'EMBEDDING_MODEL',
      type: 'string',
      description: 'Embedding model for FAQ entries',
      defaultValue: 'text-embedding-3-small',
      instanceScoped: true,
    },
    {
      key: 'EMBEDDING_DIMENSIONS',
      type: 'number',
      description: 'Vector dimensions for embeddings',
      defaultValue: 1536,
      instanceScoped: false,
    },
    {
      key: 'SEARCH_CONFIDENCE_THRESHOLD',
      type: 'number',
      description: 'Minimum cosine similarity score for a confident match (0-1)',
      defaultValue: 0.8,
      instanceScoped: true,
    },
    {
      key: 'SEARCH_MAX_RESULTS',
      type: 'number',
      description: 'Maximum search results per query',
      defaultValue: 5,
      instanceScoped: true,
    },
    {
      key: 'SEARCH_SEMANTIC_WEIGHT',
      type: 'number',
      description: 'Weight for semantic score in hybrid search (0-1)',
      defaultValue: 0.7,
      instanceScoped: true,
    },
    {
      key: 'SEARCH_KEYWORD_WEIGHT',
      type: 'number',
      description: 'Weight for keyword score in hybrid search (0-1)',
      defaultValue: 0.3,
      instanceScoped: true,
    },
    {
      key: 'SEARCH_RATE_LIMIT',
      type: 'number',
      description: 'Rate limit for public search endpoint (requests per minute)',
      defaultValue: 60,
      instanceScoped: true,
    },
  ],
  events: {
    emits: [
      'kb.knowledgeBase.created',
      'kb.knowledgeBase.updated',
      'kb.knowledgeBase.deleted',
      'kb.category.created',
      'kb.category.updated',
      'kb.category.deleted',
      'kb.entry.created',
      'kb.entry.updated',
      'kb.entry.deleted',
      'kb.entry.embedded',
      'kb.search.executed',
    ],
    listeners: {
      'kb.entry.created': async (payload: { id: number }) => {
        embedEntry(payload.id).catch(() => {});
      },
      'kb.entry.updated': async (payload: { id: number; version?: number }) => {
        embedEntry(payload.id).catch(() => {});
      },
    },
    schemas: eventSchemas,
  },
  chat: {
    description: 'FAQ and knowledge management with semantic search. Manages categories and question-answer entries with embeddings for AI-powered retrieval.',
    capabilities: [
      'search FAQ entries',
      'list categories',
      'create entries',
      'get entry details',
    ],
    actionSchemas: [
      {
        name: 'kb.search',
        description: 'Search the knowledge base for FAQ entries matching a query',
        parameters: {
          tenantSlug: { type: 'string', description: 'Tenant slug', required: true },
          query: { type: 'string', description: 'Search query', required: true },
        },
        returns: { results: { type: 'array' }, totalResults: { type: 'number' }, topResultConfident: { type: 'boolean' } },
        requiredPermissions: [],
        endpoint: { method: 'POST', path: 'knowledge-base/[tenantSlug]/search' },
      },
      {
        name: 'kb.listEntries',
        description: 'List FAQ entries with filtering by category and tenant',
        parameters: {
          tenantId: { type: 'number' },
          categoryId: { type: 'number' },
          enabled: { type: 'boolean' },
        },
        returns: { data: { type: 'array' }, total: { type: 'number' } },
        requiredPermissions: ['kb-entries.read'],
        endpoint: { method: 'GET', path: 'kb-entries' },
      },
      {
        name: 'kb.getEntry',
        description: 'Get a single FAQ entry by ID',
        parameters: {
          id: { type: 'number', description: 'Entry ID', required: true },
        },
        returns: { question: { type: 'string' }, answer: { type: 'string' }, category: { type: 'string' } },
        requiredPermissions: ['kb-entries.read'],
        endpoint: { method: 'GET', path: 'kb-entries/[id]' },
      },
    ],
  },
};

// ─── Re-exports ─────────────────────────────────────────────

export { kbSchema, kbKnowledgeBases, kbCategories, kbEntries, kbEntryVersions } from './schema';
export { seedKnowledgeBase } from './seed';
export * from './types';

// Engine exports
export { embedEntry, bulkEmbed } from './engine/embedding-pipeline';
export { semanticSearch, keywordSearch, hybridSearch } from './engine/search-engine';

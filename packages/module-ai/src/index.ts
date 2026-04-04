import type { ModuleDefinition, EventSchemaMap } from '@oven/module-registry';
import { aiSchema } from './schema';
import { seedAI } from './seed';
import * as aiProvidersHandler from './api/ai-providers.handler';
import * as aiProvidersByIdHandler from './api/ai-providers-by-id.handler';
import * as aiAliasesHandler from './api/ai-aliases.handler';
import * as aiAliasesByIdHandler from './api/ai-aliases-by-id.handler';
import * as aiVectorStoresHandler from './api/ai-vector-stores.handler';
import * as aiVectorStoresByIdHandler from './api/ai-vector-stores-by-id.handler';
import * as aiBudgetsHandler from './api/ai-budgets.handler';
import * as aiBudgetsByIdHandler from './api/ai-budgets-by-id.handler';
import * as aiUsageLogsHandler from './api/ai-usage-logs.handler';
import * as aiBudgetAlertsHandler from './api/ai-budget-alerts.handler';
import * as aiEmbedHandler from './api/ai-embed.handler';
import * as aiGenerateHandler from './api/ai-generate.handler';
import * as aiStreamHandler from './api/ai-stream.handler';
import * as aiGenerateImageHandler from './api/ai-generate-image.handler';
import * as aiGenerateObjectHandler from './api/ai-generate-object.handler';
import * as aiToolsHandler from './api/ai-tools.handler';
import * as aiUsageSummaryHandler from './api/ai-usage-summary.handler';
import * as aiGuardrailsHandler from './api/ai-guardrails.handler';
import * as aiGuardrailsByIdHandler from './api/ai-guardrails-by-id.handler';
import * as aiPlaygroundExecutionsHandler from './api/ai-playground-executions.handler';
import * as aiPlaygroundExecutionsByIdHandler from './api/ai-playground-executions-by-id.handler';
import * as aiProvidersTestHandler from './api/ai-providers-test.handler';

// ─── Event Schemas ───────────────────────────────────────────

const eventSchemas: EventSchemaMap = {
  'ai.provider.created': {
    id: { type: 'number', description: 'Provider DB ID', required: true },
    tenantId: { type: 'number', description: 'Tenant ID (null for global providers)' },
    name: { type: 'string', description: 'Provider name' },
    slug: { type: 'string', description: 'Provider slug' },
    type: { type: 'string', description: 'Provider type (openai, anthropic, google, custom)' },
  },
  'ai.provider.updated': {
    id: { type: 'number', description: 'Provider DB ID', required: true },
    tenantId: { type: 'number', description: 'Tenant ID (null for global providers)' },
    name: { type: 'string', description: 'Provider name' },
    slug: { type: 'string', description: 'Provider slug' },
  },
  'ai.provider.deleted': {
    id: { type: 'number', description: 'Provider DB ID', required: true },
    tenantId: { type: 'number', description: 'Tenant ID (null for global providers)' },
    slug: { type: 'string', description: 'Provider slug' },
  },
  'ai.alias.created': {
    id: { type: 'number', description: 'Alias DB ID', required: true },
    tenantId: { type: 'number', description: 'Tenant ID (null for global aliases)' },
    alias: { type: 'string', description: 'Alias name' },
    modelId: { type: 'string', description: 'Resolved model ID' },
  },
  'ai.alias.updated': {
    id: { type: 'number', description: 'Alias DB ID', required: true },
    tenantId: { type: 'number', description: 'Tenant ID (null for global aliases)' },
    alias: { type: 'string', description: 'Alias name' },
    modelId: { type: 'string', description: 'Resolved model ID' },
  },
  'ai.alias.deleted': {
    id: { type: 'number', description: 'Alias DB ID', required: true },
    tenantId: { type: 'number', description: 'Tenant ID (null for global aliases)' },
    alias: { type: 'string', description: 'Alias name' },
  },
  'ai.vectorStore.created': {
    id: { type: 'number', description: 'Vector store DB ID', required: true },
    name: { type: 'string', description: 'Store name' },
    adapter: { type: 'string', description: 'Adapter type (pgvector, pinecone)' },
    tenantId: { type: 'number', description: 'Tenant ID' },
  },
  'ai.vectorStore.updated': {
    id: { type: 'number', description: 'Vector store DB ID', required: true },
    name: { type: 'string', description: 'Store name' },
  },
  'ai.vectorStore.deleted': {
    id: { type: 'number', description: 'Vector store DB ID', required: true },
    tenantId: { type: 'number', description: 'Tenant ID' },
  },
  'ai.call.completed': {
    tenantId: { type: 'number', description: 'Tenant ID' },
    providerId: { type: 'number', description: 'Provider DB ID' },
    model: { type: 'string', description: 'Model used' },
    inputTokens: { type: 'number', description: 'Input tokens consumed' },
    outputTokens: { type: 'number', description: 'Output tokens consumed' },
    costCents: { type: 'number', description: 'Cost in cents' },
    latencyMs: { type: 'number', description: 'Call latency in milliseconds' },
  },
  'ai.call.failed': {
    tenantId: { type: 'number', description: 'Tenant ID' },
    model: { type: 'string', description: 'Model attempted' },
    error: { type: 'string', description: 'Error message' },
  },
  'ai.budget.warning': {
    budgetId: { type: 'number', description: 'Budget DB ID', required: true },
    scope: { type: 'string', description: 'Budget scope' },
    utilizationPct: { type: 'number', description: 'Current utilization percentage' },
    threshold: { type: 'number', description: 'Warning threshold percentage' },
  },
  'ai.budget.exceeded': {
    budgetId: { type: 'number', description: 'Budget DB ID', required: true },
    scope: { type: 'string', description: 'Budget scope' },
    currentCostCents: { type: 'number', description: 'Current spend in cents' },
    costLimitCents: { type: 'number', description: 'Budget limit in cents' },
  },
  'ai.guardrail.triggered': {
    ruleId: { type: 'number', description: 'Guardrail rule ID' },
    ruleType: { type: 'string', description: 'Rule type (keyword, regex, classifier)' },
    action: { type: 'string', description: 'Action taken (block, warn, modify)' },
    scope: { type: 'string', description: 'Input or output' },
    tenantId: { type: 'number', description: 'Tenant ID' },
  },
  'ai.playground.executed': {
    id: { type: 'number', description: 'Execution DB ID', required: true },
    type: { type: 'string', description: 'Execution type (text, embedding, image, structured-output)' },
    model: { type: 'string', description: 'Model used' },
    status: { type: 'string', description: 'Execution status (completed, failed)' },
    latencyMs: { type: 'number', description: 'Execution latency in milliseconds' },
  },
};

// ─── Module Definition ───────────────────────────────────────

export const aiModule: ModuleDefinition = {
  name: 'ai',
  dependencies: ['subscriptions'],
  description: 'AI services abstraction layer — provider registry, model aliases, embeddings, vector stores, usage tracking, budgets, and guardrails.',
  capabilities: [
    'manage AI providers',
    'configure model aliases',
    'manage vector stores',
    'generate text',
    'embed text',
    'generate images',
    'generate structured output',
    'track AI usage and costs',
    'enforce budgets',
    'apply content guardrails',
  ],
  schema: aiSchema,
  seed: seedAI,
  resources: [
    { name: 'ai-providers', options: { label: 'AI Providers' } },
    { name: 'ai-aliases', options: { label: 'Model Aliases' } },
    { name: 'ai-vector-stores', options: { label: 'Vector Stores' } },
    { name: 'ai-usage-logs', options: { label: 'Usage Logs' } },
    { name: 'ai-budgets', options: { label: 'Budgets' } },
    { name: 'ai-budget-alerts', options: { label: 'Budget Alerts' } },
    { name: 'ai-guardrails', options: { label: 'Guardrails' } },
    { name: 'ai-playground-executions', options: { label: 'Playground History' } },
  ],
  menuItems: [
    { label: 'Providers', to: '/ai-providers' },
    { label: 'Model Aliases', to: '/ai-aliases' },
    { label: 'Vector Stores', to: '/ai-vector-stores' },
    { label: 'Usage Logs', to: '/ai-usage-logs' },
    { label: 'Budgets', to: '/ai-budgets' },
    { label: 'Guardrails', to: '/ai-guardrails' },
    { label: 'Playground History', to: '/ai-playground-executions' },
  ],
  apiHandlers: {
    // CRUD — Providers
    'ai-providers': { GET: aiProvidersHandler.GET, POST: aiProvidersHandler.POST },
    'ai-providers/[id]': {
      GET: aiProvidersByIdHandler.GET,
      PUT: aiProvidersByIdHandler.PUT,
      DELETE: aiProvidersByIdHandler.DELETE,
    },
    'ai-providers/[id]/test': { POST: aiProvidersTestHandler.POST },
    // CRUD — Aliases
    'ai-aliases': { GET: aiAliasesHandler.GET, POST: aiAliasesHandler.POST },
    'ai-aliases/[id]': {
      GET: aiAliasesByIdHandler.GET,
      PUT: aiAliasesByIdHandler.PUT,
      DELETE: aiAliasesByIdHandler.DELETE,
    },
    // CRUD — Vector Stores
    'ai-vector-stores': { GET: aiVectorStoresHandler.GET, POST: aiVectorStoresHandler.POST },
    'ai-vector-stores/[id]': {
      GET: aiVectorStoresByIdHandler.GET,
      PUT: aiVectorStoresByIdHandler.PUT,
      DELETE: aiVectorStoresByIdHandler.DELETE,
    },
    // CRUD — Budgets
    'ai-budgets': { GET: aiBudgetsHandler.GET, POST: aiBudgetsHandler.POST },
    'ai-budgets/[id]': {
      GET: aiBudgetsByIdHandler.GET,
      PUT: aiBudgetsByIdHandler.PUT,
      DELETE: aiBudgetsByIdHandler.DELETE,
    },
    // Read-only
    'ai-usage-logs': { GET: aiUsageLogsHandler.GET },
    'ai-budget-alerts': { GET: aiBudgetAlertsHandler.GET },
    // Custom — AI operations
    'ai/embed': { POST: aiEmbedHandler.POST },
    'ai/generate': { POST: aiGenerateHandler.POST },
    'ai/stream': { POST: aiStreamHandler.POST },
    'ai/generate-image': { POST: aiGenerateImageHandler.POST },
    'ai/generate-object': { POST: aiGenerateObjectHandler.POST },
    'ai/tools': { GET: aiToolsHandler.GET },
    'ai/usage/summary': { GET: aiUsageSummaryHandler.GET },
    // CRUD — Guardrails
    'ai-guardrails': { GET: aiGuardrailsHandler.GET, POST: aiGuardrailsHandler.POST },
    'ai-guardrails/[id]': {
      GET: aiGuardrailsByIdHandler.GET,
      PUT: aiGuardrailsByIdHandler.PUT,
      DELETE: aiGuardrailsByIdHandler.DELETE,
    },
    // Playground Executions
    'ai-playground-executions': { GET: aiPlaygroundExecutionsHandler.GET, POST: aiPlaygroundExecutionsHandler.POST },
    'ai-playground-executions/[id]': {
      GET: aiPlaygroundExecutionsByIdHandler.GET,
      DELETE: aiPlaygroundExecutionsByIdHandler.DELETE,
    },
  },
  configSchema: [
    {
      key: 'DEFAULT_PROVIDER',
      type: 'string',
      description: 'Default AI provider for new requests',
      defaultValue: 'openai',
      instanceScoped: true,
    },
    {
      key: 'DEFAULT_TEXT_MODEL',
      type: 'string',
      description: 'Default model for text generation',
      defaultValue: 'gpt-4o-mini',
      instanceScoped: true,
    },
    {
      key: 'DEFAULT_EMBEDDING_MODEL',
      type: 'string',
      description: 'Default model for embeddings',
      defaultValue: 'text-embedding-3-small',
      instanceScoped: true,
    },
    {
      key: 'DEFAULT_EMBEDDING_DIMENSIONS',
      type: 'number',
      description: 'Default embedding vector dimensions',
      defaultValue: 1536,
      instanceScoped: false,
    },
    {
      key: 'MAX_TOKENS_PER_REQUEST',
      type: 'number',
      description: 'Maximum tokens allowed per single AI request',
      defaultValue: 4096,
      instanceScoped: true,
    },
    {
      key: 'RATE_LIMIT_RPM',
      type: 'number',
      description: 'Default rate limit (requests per minute) for AI operations',
      defaultValue: 60,
      instanceScoped: true,
    },
    {
      key: 'GUARDRAILS_ENABLED',
      type: 'boolean',
      description: 'Enable content guardrails for AI input/output',
      defaultValue: true,
      instanceScoped: true,
    },
    {
      key: 'LANGSMITH_TRACING',
      type: 'boolean',
      description: 'Enable LangSmith tracing (requires LANGSMITH_API_KEY env var)',
      defaultValue: false,
      instanceScoped: false,
    },
  ],
  events: {
    emits: [
      'ai.provider.created',
      'ai.provider.updated',
      'ai.provider.deleted',
      'ai.alias.created',
      'ai.alias.updated',
      'ai.alias.deleted',
      'ai.vectorStore.created',
      'ai.vectorStore.updated',
      'ai.vectorStore.deleted',
      'ai.call.completed',
      'ai.call.failed',
      'ai.budget.warning',
      'ai.budget.exceeded',
      'ai.guardrail.triggered',
      'ai.playground.executed',
    ],
    schemas: eventSchemas,
  },
  chat: {
    description: 'AI services layer — LLM generation, embeddings, image generation, vector stores, usage tracking',
    capabilities: [
      'generate text',
      'embed text',
      'generate images',
      'generate structured output',
      'manage vector stores',
      'track AI usage',
    ],
    actionSchemas: [
      {
        name: 'ai.embed',
        description: 'Embed text into vector representation',
        parameters: {
          text: { type: 'string', description: 'Text to embed', required: true },
          model: { type: 'string', description: 'Embedding model (optional)' },
        },
        returns: { embedding: { type: 'array' }, tokens: { type: 'number' } },
        requiredPermissions: ['ai-tools.read'],
        endpoint: { method: 'POST', path: 'ai/embed' },
      },
      {
        name: 'ai.generate',
        description: 'Generate text using an LLM',
        parameters: {
          prompt: { type: 'string', description: 'User prompt', required: true },
          model: { type: 'string', description: 'Model alias or ID' },
          system: { type: 'string', description: 'System prompt' },
          temperature: { type: 'number', description: 'Sampling temperature (0-2)' },
        },
        returns: { text: { type: 'string' }, tokens: { type: 'object' }, costCents: { type: 'number' } },
        requiredPermissions: ['ai-tools.read'],
        endpoint: { method: 'POST', path: 'ai/generate' },
      },
      {
        name: 'ai.generateImage',
        description: 'Generate an image from a text prompt',
        parameters: {
          prompt: { type: 'string', description: 'Image description', required: true },
          size: { type: 'string', description: 'Image size (1024x1024, etc.)' },
        },
        returns: { url: { type: 'string' } },
        requiredPermissions: ['ai-tools.read'],
        endpoint: { method: 'POST', path: 'ai/generate-image' },
      },
      {
        name: 'ai.tools',
        description: 'List all available AI tools',
        parameters: {},
        returns: { data: { type: 'array' } },
        requiredPermissions: ['ai-tools.read'],
        endpoint: { method: 'GET', path: 'ai/tools' },
      },
    ],
  },
};

// ─── Re-exports ──────────────────────────────────────────────

export { aiSchema } from './schema';
export { seedAI } from './seed';
export * from './types';

// Engine exports
export { providerRegistry } from './engine/provider-registry';
export { resolveModel } from './engine/model-resolver';
export { createAIMiddleware } from './engine/middleware';
export { calculateCost, getModelPricing } from './engine/cost-calculator';
export { evaluateGuardrails } from './engine/guardrail-engine';
export { trackAIUsage, checkAIQuota } from './engine/usage-tracker';
export { encrypt, decrypt, maskApiKey } from './engine/encryption';

// Vector store exports
export { createVectorStoreAdapter } from './vector-store/adapter';

// Tool exports
export { aiEmbed, aiEmbedMany } from './tools/embed';
export { aiGenerateText, aiStreamText } from './tools/generate';
export { aiGenerateImage } from './tools/generate-image';
export { aiGenerateObject } from './tools/generate-object';
export { getBuiltInTools, getAllTools } from './tools/registry';

// ─── Enums / Union Types ──────────────────────────────────────

export type AIProviderType = 'openai' | 'anthropic' | 'google' | 'custom';

export type ModelType = 'text' | 'embedding' | 'image' | 'audio' | 'video' | 'object';

export type VectorStoreAdapter = 'pgvector' | 'pinecone';

export type DistanceMetric = 'cosine' | 'euclidean' | 'dotProduct';

export type BudgetScope = 'global' | 'tenant' | 'agent' | 'provider';

export type GuardrailRuleType = 'keyword' | 'regex' | 'classifier';

export type GuardrailScope = 'input' | 'output' | 'both';

export type GuardrailAction = 'block' | 'warn' | 'modify';

export type AICallStatus = 'success' | 'error' | 'rate_limited' | 'quota_exceeded';

// ─── Config Interfaces ────────────────────────────────────────

export interface ProviderConfig {
  name: string;
  slug: string;
  type: AIProviderType;
  apiKeyEncrypted?: string;
  baseUrl?: string;
  defaultModel?: string;
  rateLimitRpm?: number;
  rateLimitTpm?: number;
  enabled?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ParameterFieldSchema {
  type: 'number' | 'integer' | 'select' | 'boolean' | 'string';
  label: string;
  description?: string;
  default?: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

export type ParametersSchema = Record<string, ParameterFieldSchema>;

export interface ModelAliasConfig {
  alias: string;
  providerId: number;
  modelId: string;
  type: ModelType;
  defaultSettings?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  parametersSchema?: ParametersSchema;
}

export interface VectorStoreConfig {
  name: string;
  slug: string;
  tenantId: number;
  adapter: VectorStoreAdapter;
  connectionConfig: Record<string, unknown>;
  embeddingModel?: string;
  dimensions?: number;
  distanceMetric?: DistanceMetric;
}

// ─── Vector Store Data ────────────────────────────────────────

export interface VectorDocument {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  embedding?: number[];
}

export interface VectorQueryResult {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

// ─── AI Call Results ──────────────────────────────────────────

export interface AICallResult {
  text?: string;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  costCents: number;
  latencyMs: number;
  model: string;
  provider: string;
}

// ─── Guardrails ───────────────────────────────────────────────

export interface GuardrailResult {
  passed: boolean;
  action: GuardrailAction;
  message?: string;
  ruleId?: number;
}

// ─── Budgets ──────────────────────────────────────────────────

export interface BudgetStatus {
  withinBudget: boolean;
  currentTokens: number;
  currentCostCents: number;
  tokenLimit: number;
  costLimitCents: number;
  utilizationPct: number;
}

// ─── Cost Tracking ────────────────────────────────────────────

export interface CostEntry {
  model: string;
  inputPricePerMToken: number;
  outputPricePerMToken: number;
}

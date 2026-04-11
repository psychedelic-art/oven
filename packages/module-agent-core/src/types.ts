// ─── Agent Types ─────────────────────────────────────────────

export interface LLMConfig {
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
}

export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  method: string;
  route: string;
  moduleSlug: string;
  requiredPermissions?: string[];
}

export interface InvokeParams {
  messages: Array<{
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: unknown;
  }>;
  params?: Record<string, unknown>;
  sessionId?: number;
  stream?: boolean;
}

export interface InvokeResult {
  text: string;
  sessionId: number;
  messageId: number;
  executionId: number;
  tokens: { input: number; output: number; total: number };
  costCents: number;
  latencyMs: number;
  model: string;
  provider: string;
  toolsUsed: string[];
}

// ─── Input Schema ───────────────────────────────────────────

export interface InputSchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  description?: string;
  defaultValue?: unknown;
  options?: string[]; // for select type
  required?: boolean;
}

// ─── Node Types ─────────────────────────────────────────────

export type NodeCategory = 'llm' | 'tool' | 'condition' | 'transform' | 'human-in-the-loop' | 'memory';

export interface NodeParam {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
}

// ─── Session Types ──────────────────────────────────────────

export type SessionStatus = 'active' | 'archived';

export interface MessageContent {
  type: 'text' | 'image' | 'audio';
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
}

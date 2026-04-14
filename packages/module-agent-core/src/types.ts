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

// ─── Agent Row (F-04-04) ────────────────────────────────────
// Typed shape for a `agents` table row. Replaces `(agent.exposedParams
// as string[])` and `(agent.toolBindings as string[])` casts scattered
// through the invoker.

export interface AgentRow {
  id: number;
  tenantId: number | null;
  slug: string;
  name: string;
  description: string | null;
  systemPrompt: string | null;
  llmConfig: LLMConfig | null;
  exposedParams: string[] | null;
  toolBindings: string[] | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Session Types ──────────────────────────────────────────

export type SessionStatus = 'active' | 'archived';

export interface MessageContent {
  type: 'text' | 'image' | 'audio';
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
}

// ─── Chat Session ───────────────────────────────────────────

export type SessionStatus = 'active' | 'archived' | 'closed';
export type SessionChannel = 'web' | 'portal' | 'api' | 'widget';

export interface ChatSession {
  id: number;
  tenantId: number | null;
  agentId: number | null;
  userId: number | null;
  sessionToken: string | null;
  channel: SessionChannel;
  title: string | null;
  context: Record<string, unknown> | null;
  status: SessionStatus;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSessionInput {
  tenantId?: number;
  agentSlug?: string;
  agentId?: number;
  userId?: number;
  channel?: SessionChannel;
  title?: string;
}

// ─── Chat Message ───────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface MessageContentPart {
  type: 'text' | 'image' | 'tool-call' | 'tool-result';
  text?: string;
  imageUrl?: string;
  toolCallId?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  durationMs?: number;
  status?: 'success' | 'error';
}

export interface ChatMessage {
  id: number;
  sessionId: number;
  role: MessageRole;
  content: MessageContentPart[];
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

// ─── Chat Action (tool calls logged per message) ────────────

export interface ChatAction {
  id: number;
  messageId: number;
  sessionId: number;
  toolName: string;
  input: unknown;
  output: unknown;
  status: 'success' | 'error';
  durationMs: number | null;
  createdAt: Date;
}

// ─── Commands ───────────────────────────────────────────────

export interface ChatCommand {
  id: number;
  tenantId: number | null;
  name: string;
  slug: string;
  description: string;
  category: string;
  handler: string;
  args: Record<string, unknown> | null;
  isBuiltIn: boolean;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommandResult {
  success: boolean;
  output?: string;
  data?: unknown;
  error?: string;
}

// ─── Skills ─────────────────────────────────────────────────

export type SkillSource = 'built-in' | 'custom' | 'mcp';

export interface ChatSkill {
  id: number;
  tenantId: number | null;
  name: string;
  slug: string;
  description: string;
  promptTemplate: string;
  source: SkillSource;
  params: Record<string, unknown> | null;
  isBuiltIn: boolean;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Hooks ──────────────────────────────────────────────────

export type HookEvent =
  | 'pre-message'
  | 'post-message'
  | 'pre-tool-use'
  | 'post-tool-use'
  | 'on-error'
  | 'on-escalation'
  | 'session-start'
  | 'session-end';

export type HookHandlerType = 'condition' | 'api' | 'event' | 'guardrail';

export interface HookHandler {
  type: HookHandlerType;
  config: Record<string, unknown>;
}

export interface ChatHook {
  id: number;
  tenantId: number | null;
  name: string;
  event: HookEvent;
  handler: HookHandler;
  priority: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── MCP Connections ────────────────────────────────────────

export type MCPTransport = 'sse' | 'http';
export type MCPStatus = 'connected' | 'disconnected' | 'error' | 'pending';

export interface ChatMcpConnection {
  id: number;
  tenantId: number | null;
  name: string;
  transport: MCPTransport;
  url: string;
  credentials: Record<string, unknown> | null;
  status: MCPStatus;
  discoveredTools: Record<string, unknown>[] | null;
  lastConnectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Feedback ───────────────────────────────────────────────

export type FeedbackRating = 'positive' | 'negative';

export interface ChatFeedback {
  id: number;
  sessionId: number;
  messageId: number;
  userId: number | null;
  rating: FeedbackRating;
  comment: string | null;
  createdAt: Date;
}

// ─── SSE Stream Events ──────────────────────────────────────

export type StreamEvent =
  | { type: 'token'; text: string }
  | { type: 'toolCallStart'; toolCallId: string; toolName: string; input: unknown }
  | { type: 'toolCallEnd'; toolCallId: string; output: unknown; durationMs: number; status: 'success' | 'error' }
  | { type: 'done'; messageId: number; metadata?: Record<string, unknown> }
  | { type: 'error'; code: string; message: string };

// ─── Prompt Builder ─────────────────────────────────────────

export interface PromptSection {
  name: string;
  content: string;
  priority: number;
  isStatic: boolean;
}

// ─── Context Manager ────────────────────────────────────────

export interface ContextAccumulator {
  entities: Record<string, unknown>;
  preferences: Record<string, unknown>;
  turnCount: number;
  tokenEstimate: number;
}

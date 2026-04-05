// ─── Re-export backend types (compile-time only) ────────────
// These are imported via `import type` — no runtime dependency on module-chat.

export type { SessionStatus, SessionChannel, MessageRole, FeedbackRating } from '@oven/module-chat';
export type { StreamEvent, MessageContentPart, CommandResult } from '@oven/module-chat';

// ─── UI Message ─────────────────────────────────────────────

export interface UIMessage {
  id: string | number;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  parts?: Array<{
    type: 'text' | 'image' | 'tool-call' | 'tool-result';
    text?: string;
    imageUrl?: string;
    toolCallId?: string;
    toolName?: string;
    input?: unknown;
    output?: unknown;
    durationMs?: number;
    status?: 'success' | 'error';
  }>;
  createdAt: Date;
  isStreaming?: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

// ─── Tenant Config ──────────────────────────────────────────

export interface TenantPublicConfig {
  tenantId: number;
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor?: string;
  surfaceColor?: string;
  fontFamily?: string;
  welcomeMessage?: string;
  outOfHoursMessage?: string;
  schedule?: BusinessSchedule;
  contactInfo?: ContactInfo;
  schedulingUrl?: string;
}

export interface BusinessSchedule {
  timezone: string;
  hours: DaySchedule[];
}

export interface DaySchedule {
  day: number; // 0=Sunday, 6=Saturday
  open: string; // "HH:mm"
  close: string; // "HH:mm"
  isOpen: boolean;
}

export interface ContactInfo {
  phone?: string;
  email?: string;
  whatsapp?: string;
}

// ─── Session Persistence ────────────────────────────────────

export interface PersistedSession {
  sessionId: number;
  sessionToken: string;
  tenantSlug: string;
  createdAt: number; // epoch ms
  expiresAt: number; // epoch ms
}

// ─── Command Palette ────────────────────────────────────────

export interface PaletteCommand {
  slug: string;
  name: string;
  description: string;
  category: string;
}

export interface CommandPaletteState {
  isOpen: boolean;
  filter: string;
  filteredCommands: PaletteCommand[];
  selectedIndex: number;
}

// ─── useChat Return ─────────────────────────────────────────

export interface UseChatReturn {
  messages: UIMessage[];
  sendMessage: (text: string) => Promise<void>;
  isStreaming: boolean;
  stop: () => void;
  error: Error | null;
  status: 'idle' | 'loading' | 'streaming' | 'error';
  sessionId: number | null;
  isSessionReady: boolean;
}

// ─── Component Props ────────────────────────────────────────

export interface ChatWidgetProps {
  tenantSlug: string;
  agentSlug?: string;
  theme?: 'light' | 'dark' | 'auto';
  position?: 'bottom-right' | 'bottom-left' | 'inline';
  initialOpen?: boolean;
  welcomeMessage?: string;
  placeholder?: string;
  quickReplies?: string[];
  apiBaseUrl?: string;
  onEscalation?: (reason: string) => void;
  className?: string;
}

export interface AgentPlaygroundProps {
  agentSlug?: string;
  tenantId?: number;
  apiBaseUrl?: string;
  showExposedParams?: boolean;
  showToolCalls?: boolean;
  className?: string;
}

export interface ConversationViewProps {
  sessionId: number;
  apiBaseUrl?: string;
  showToolCalls?: boolean;
  showTimestamps?: boolean;
  className?: string;
}

export interface MessageBubbleProps {
  message: UIMessage;
  showTimestamp?: boolean;
  showFeedback?: boolean;
  onFeedback?: (rating: 'positive' | 'negative') => void;
  className?: string;
}

export interface MessageListProps {
  messages: UIMessage[];
  isStreaming?: boolean;
  showTimestamps?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  className?: string;
}

export interface MessageInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  commands?: PaletteCommand[];
  onCommandSelect?: (slug: string) => void;
  className?: string;
}

export interface StreamingTextProps {
  text: string;
  isStreaming?: boolean;
  className?: string;
}

export interface ToolCallCardProps {
  toolName: string;
  input?: unknown;
  output?: unknown;
  status?: 'success' | 'error';
  durationMs?: number;
  className?: string;
}

export interface ChatErrorCardProps {
  error: string;
  category?: 'network' | 'session' | 'agent';
  onRetry?: () => void;
  className?: string;
}

export interface MessageFeedbackProps {
  messageId: string | number;
  currentRating?: 'positive' | 'negative' | null;
  onFeedback: (rating: 'positive' | 'negative') => void;
  className?: string;
}

export interface SessionSidebarProps {
  sessions: Array<{ id: number; title: string | null; isPinned: boolean; updatedAt: Date; messageCount?: number }>;
  activeSessionId?: number;
  onSelectSession: (id: number) => void;
  onNewSession: () => void;
  onPinSession?: (id: number) => void;
  onDeleteSession?: (id: number) => void;
  className?: string;
}

export interface CommandPaletteProps {
  commands: PaletteCommand[];
  filter: string;
  selectedIndex: number;
  onSelect: (slug: string) => void;
  onClose: () => void;
  className?: string;
}

export interface WelcomeScreenProps {
  message: string;
  quickReplies?: string[];
  onQuickReply: (text: string) => void;
  className?: string;
}

export interface EscalationBannerProps {
  contactInfo: ContactInfo;
  reason?: string;
  className?: string;
}

export interface WidgetLauncherProps {
  isOpen: boolean;
  onClick: () => void;
  unreadCount?: number;
  className?: string;
}

export interface ParamsPanelProps {
  params: Array<{ name: string; type: string; description?: string; defaultValue?: unknown }>;
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
  className?: string;
}

export interface TypingIndicatorProps {
  className?: string;
}

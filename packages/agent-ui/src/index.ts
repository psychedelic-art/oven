// ─── Hooks ──────────────────────────────────────────────────
export {
  useChat,
  useChatAI,
  useChatLegacy,
  OvenChatTransport,
  useTenantConfig,
  useBusinessHours,
  useAnonymousSession,
  useSessionPersistence,
  useChatScroll,
  useCommandPalette,
  useDualStateMessages,
  usePlaygroundCommands,
  WORKFLOW_BLOCKED_COMMANDS,
  useSessionManager,
} from './hooks';
export type {
  UseChatOpts,
  UseChatAIOpts,
  UsePlaygroundCommandsOptions,
  UsePlaygroundCommandsReturn,
  PlaygroundRuntimeConfig,
  UseSessionManagerOpts,
  UseSessionManagerReturn,
  SessionSummary,
} from './hooks';

// ─── Shared Components ──────────────────────────────────────
export {
  StreamingText,
  TypingIndicator,
  ChatErrorCard,
  ToolCallCard,
  MessageFeedback,
  MessageBubble,
  CommandPalette,
  MessageInput,
  MessageList,
  SessionSidebar,
  ConversationView,
  ChatHeader,
  ConfirmDialog,
  filterMessagesForDisplay,
} from './shared';
export type { ChatHeaderProps, ConfirmDialogProps } from './shared';

// ─── Widget Components ──────────────────────────────────────
export {
  ChatWidget,
  WidgetLauncher,
  WelcomeScreen,
  EscalationBanner,
} from './widget';

// ─── Playground Components ──────────────────────────────────
export {
  AgentPlayground,
  ParamsPanel,
  UnifiedAIPlayground,
  TargetSelector,
  RuntimeConfigPanel,
  ExecutionInspector,
  EvalReportPanel,
  TracePanel,
} from './playground';
export type { UnifiedAIPlaygroundProps, PlaygroundTarget, PlaygroundMode } from './playground';

// ─── Layout ─────────────────────────────────────────────────
export { LayoutManager } from './layout';
export type { LayoutManagerProps, LayoutMode } from './layout';

// ─── Theming ────────────────────────────────────────────────
export {
  themePresets,
  applyTheme,
  applyThemeWithOverrides,
  getResolvedTheme,
  clearTheme,
} from './themes';
export type { ThemeVariables, ThemePresetName } from './themes';

// ─── Types ──────────────────────────────────────────────────
export type * from './types';

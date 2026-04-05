// ─── Hooks ──────────────────────────────────────────────────
export {
  useChat,
  useTenantConfig,
  useBusinessHours,
  useAnonymousSession,
  useSessionPersistence,
  useChatScroll,
  useCommandPalette,
  useDualStateMessages,
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
} from './shared';

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
} from './playground';

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

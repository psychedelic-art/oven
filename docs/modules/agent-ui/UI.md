# Agent UI — Component Contracts

This document is the canonical contract for every exported component.
When adding a new component, extend this document in the same commit.

## Guiding rules

- **Zero MUI.** `@oven/agent-ui` must not import `@mui/*` or anything
  under `apps/dashboard`. The dashboard wrapper is a separate shell.
- **Tailwind via `cn()`.** All className composition goes through
  `cn()` from `@oven/oven-ui`. No raw `clsx` imports, no string
  concatenation, no template-literal className builders.
- **No inline styles.** `style={}` is forbidden except for dynamic
  CSS custom properties populated from runtime values (e.g., brand
  colours resolved from `GET /api/tenants/[slug]/public`).
- **Type-only imports.** `import type { … }` for anything that only
  appears in annotations.
- **Boundary-only error handling.** Only `useChat`, `useTenantConfig`,
  `useSessionPersistence`, and the top-level widget entry may catch.

---

## `<UnifiedAIPlayground />` (playground/UnifiedAIPlayground.tsx)

The canonical playground surface. Single source of truth for testing
both agents (`module-agent-core`) and workflow agents
(`module-workflow-agents`).

### Props

```ts
interface UnifiedAIPlaygroundProps {
  apiBaseUrl?: string;
  tenantSlug?: string;
  defaultMode?: 'agent' | 'workflow';
  className?: string;
}
```

### Layout (3 panels)

| Panel  | Content |
|--------|---------|
| Left   | Tabbed `<TargetSelector>` / `<RuntimeConfigPanel>` — lists agents and workflows from `/api/agents` and `/api/agent-workflows` |
| Center | `<ChatHeader>` + `<MessageList>` + `<MessageInput>` (empty-state splash when no target) |
| Right  | Tabbed Inspector / Eval / Trace — `<ExecutionInspector>`, `<EvalReportPanel>`, `<TracePanel>` |

### Runtime modes

- **Agent mode** — `useChat.sendMessage` → `POST /api/chat-sessions/[id]/messages`. Streams via SSE. Inspector shows message-level details.
- **Workflow mode** — bypasses `sendMessage`, `POST /api/agent-workflows/[id]/execute`, fetches execution detail from `/api/agent-workflow-executions/[id]`, injects the assistant response via `chat.appendMessage(..., { metadata: { source: 'workflow' } })`. Inspector shows node execution trace.

### Slash commands

Local (always available, even offline): `/clear`, `/help`, `/status`, `/model <fast|smart|claude>`, `/temperature <0-2>`, `/export`.

Blocked in workflow mode: `agent, tools, skill, mcp, pin, feedback, search, reset` — short-circuits with a system message.

Everything else is forwarded to the backend via agent `sendMessage` or workflow execute.

Tests: `src/__tests__/UnifiedAIPlayground.test.tsx`, `src/__tests__/usePlaygroundCommands.test.ts`.

---

## `<ChatWidget />` (widget/ChatWidget.tsx)

Embeddable conversational interface for anonymous end-users.

### Props

```ts
interface ChatWidgetProps {
  tenantSlug: string;
  agentSlug?: string;
  theme?: 'light' | 'dark' | 'auto';
  position?: 'bottom-right' | 'bottom-left' | 'inline';
  initialOpen?: boolean;
  welcomeMessage?: string;
  placeholder?: string;
  quickReplies?: string[];
  showSchedulingButton?: boolean;
  onEscalation?: (reason: string) => void;
  className?: string;
  apiBaseUrl?: string;
}
```

### Features

- **Business-hours-aware welcome** — `useBusinessHours` consults
  tenant schedule + timezone. Different welcome message in and out
  of hours.
- **Streaming responses** — `useChat` from `@ai-sdk/react`.
- **Quick-reply buttons** — category buttons rendered before the
  first message.
- **Scheduling button** — opens `tenant.schedulingUrl` in a new tab.
- **Escalation display** — when the agent sets `handoff=true`, the
  `<EscalationBanner>` replaces the input with contact info.
- **Anonymous sessions** — `useAnonymousSession` manages a
  localStorage `sessionToken` with TTL + retry-with-backoff validation.
- **Responsive** — full-screen overlay on mobile, floating panel on
  desktop.

---

## `<AgentPlayground />` (playground/AgentPlayground.tsx) — *legacy*

Full-featured conversational testing interface for dashboard users.
**Prefer `<UnifiedAIPlayground>` for new work.** Kept for
backwards compatibility with routes that still mount it directly.

---

## `<ConversationView />` (shared/ConversationView.tsx)

Read-only message history viewer.

```ts
interface ConversationViewProps {
  sessionId: number;
  showToolCalls?: boolean;
  showTimestamps?: boolean;
  showMetadata?: boolean;
}
```

---

## Shared primitives

| Component | Role |
|---|---|
| `<MessageList>` | Scrollable list, auto-scroll on new messages, infinite-scroll pagination at the top. |
| `<MessageBubble>` | Single message with role-based styling, markdown rendering, tool-call cards, feedback buttons. |
| `<MessageInput>` | Auto-growing textarea (1–6 rows), `/` triggers `<CommandPalette>`, Shift+Enter for newline, Enter to send, disabled states (Initializing / Sending / Error / Offline). |
| `<ChatHeader>` | Target title, connection state, action buttons. Unit tested in `ChatHeader.test.tsx`. |
| `<CommandPalette>` | Fuzzy search on command name and description, arrow-nav, Tab to complete, Escape to close. |
| `<ToolCallCard>` | Expandable card showing tool name, input, output, duration. |
| `<StreamingText>` | Token-by-token renderer with blinking cursor during streaming. |
| `<TypingIndicator>` | Animated dots while the agent is thinking. |
| `<ChatErrorCard>` | Error display with a retry button. |
| `<SessionSidebar>` | Pinnable session list with search, preview, and actions. |
| `<MessageFeedback>` | Like/dislike buttons with optional comment on dislike. |

---

## Layout modes (`layout/LayoutManager.tsx`)

| Mode | When | Layout |
|---|---|---|
| `inline` | Default on desktop dashboard | Split panel: 60% content, 40% chat |
| `modal` | Default on dashboard pages | Side panel overlay with backdrop |
| `fullscreen` | User toggle | Full viewport with session sidebar on the left |
| `embedded` | External site widget | Floating panel in bottom-right |

Responsive breakpoints:

| >= 1024px | 768–1023px | < 768px |
|---|---|---|
| Split or modal (user choice) | Modal side panel | Full-screen overlay with back button |

Panel sizes persist to `localStorage` via `useResizablePanels` (naming
mirrors `react-resizable-panels`).

---

## Hooks

All hooks are exported from `@oven/agent-ui/hooks`.

| Hook | Purpose |
|---|---|
| `useChat` | Thin wrapper around `@ai-sdk/react` `useChat`, extended with `appendMessage` for workflow-mode injection. |
| `useTenantConfig` | Fetches `GET /api/tenants/[slug]/public` once and caches. |
| `useBusinessHours` | Pure derivation from tenant schedule + timezone. Unit tested. |
| `useAnonymousSession` | Manages the anonymous `sessionToken` with TTL. |
| `useSessionPersistence` | `localStorage` + validation + retry with exponential backoff. |
| `useDualStateMessages` | Merges real-time + paginated history with dedup. |
| `useCommandPalette` | Slash-command detection + keyboard navigation. |
| `usePlaygroundCommands` | Loads `/api/chat-commands` at mount, merges with local six. |
| `useChatScroll` | Auto-scroll on new messages with manual-override detection. |

---

## Theme presets (`themes/presets.ts`)

10 built-in presets: Light, Dark, Ocean, Forest, Sunset, Midnight,
Rose, Clinical, Professional, Warm. Each preset exports a
`Record<string, string>` of CSS custom property names to colour
tokens consumed by `applyTheme(preset)`.

Per-tenant branding loads colours from
`GET /api/tenants/[slug]/public` and sets CSS variables at mount time
via `applyTheme`. Config keys that override any preset:
`WIDGET_PRIMARY_COLOR`, `WIDGET_SURFACE_COLOR`, `WIDGET_FONT_FAMILY`.

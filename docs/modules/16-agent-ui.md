# Package: Agent UI

> **Package**: `packages/agent-ui/`
> **Name**: `@oven/agent-ui`
> **Dependencies**: `module-chat`, `module-agent-core`, `@ai-sdk/react`, `@oven/oven-ui`
> **Type**: Editor Package (no ModuleDefinition — pure UI components, Tailwind CSS + cn())
> **Status**: Planned (Phase 4B)
> **Last Updated**: 2026-04-05
> **Reference patterns**: See `docs/modules/chat/newsan-patterns.md` for reusable frontend patterns

---

## 1. Overview

Agent UI is a **standalone React component library** that provides the embeddable chat widget, agent playground, and conversation view components used across the platform. It follows the editor package pattern (like `packages/form-editor/`, `packages/workflow-editor/`, `packages/map-editor/`) — no database schema, no API handlers, no `ModuleDefinition`. Just reusable UI components.

The chat widget is designed to be embedded in tenant portals (via `module-ui-flows` chat pages) and external websites (via a bundled `<script>` tag). The playground is used in the dashboard for agent testing. Both consume the same `module-chat` API and `@ai-sdk/react` hooks.

---

## 2. Core Components

### `<ChatWidget />`

An embeddable conversational interface for end-users (patients, customers). Renders as a floating bubble or inline panel.

**Props**:
```typescript
interface ChatWidgetProps {
  tenantSlug: string;               // resolves tenant config for branding and business hours
  agentSlug?: string;               // specific agent to back the conversation (optional)
  theme?: 'light' | 'dark' | 'auto';
  position?: 'bottom-right' | 'bottom-left' | 'inline';
  initialOpen?: boolean;
  welcomeMessage?: string;          // overrides tenant config
  placeholder?: string;
  quickReplies?: string[];          // category buttons shown before first message
  showSchedulingButton?: boolean;   // shows "Schedule Appointment" CTA
  onEscalation?: (reason: string) => void;
  className?: string;
}
```

**Features**:
- **Business-hours-aware welcome**: Fetches tenant config via `GET /api/tenants/[slug]/public`, shows different welcome message for business hours vs. out-of-hours
- **Streaming responses**: Uses `useChat` from `@ai-sdk/react` for real-time token streaming
- **Quick-reply buttons**: Category buttons (e.g., "Horarios", "Servicios", "Agendamiento") shown before the first message for common intents
- **Scheduling button**: One-tap button that opens the tenant's `schedulingUrl` in a new tab
- **Escalation display**: When the agent escalates, shows contact info (phone, email, WhatsApp) from tenant config instead of continuing the conversation
- **Typing indicator**: Animated dots during response generation
- **Message bubbles**: User messages (right, primary color), assistant messages (left, surface color), system messages (center, muted)
- **Anonymous sessions**: Creates chat sessions with `sessionToken` (no login required)
- **Responsive**: Works on mobile (full-screen overlay) and desktop (floating panel)

### `<UnifiedAIPlayground />`

The canonical playground surface. This is a new version of the newsan chat
experience — it reuses the newsan‑lineage chat primitives (`MessageList`,
`MessageInput`, `CommandPalette`, `useChat`, `useDualStateMessages`,
`useChatScroll`) and adds a 3‑panel playground shell around them. It is the
single source of truth for testing both agents (`module-agent-core`) and
workflow agents (`module-workflow-agents`).

**Props**:
```typescript
interface UnifiedAIPlaygroundProps {
  apiBaseUrl?: string;
  tenantSlug?: string;
  defaultMode?: 'agent' | 'workflow';
  className?: string;
}
```

**Architecture rules**:
- **Zero MUI.** The playground lives in `@oven/agent-ui` and must not import
  `@mui/*`, `react-router-dom`, or anything under `apps/dashboard`. This keeps
  it embeddable in docs, script tags, and third-party hosts.
- **Dashboard wrapper**: the React Admin route `/ai-playground` mounts a ~40
  line MUI shell (back button + title) around `<UnifiedAIPlayground>`. Do not
  reintroduce chat UI into that wrapper.
- **Tailwind in dashboard**: because dashboard's `globals.css` intentionally
  omits Tailwind (React Admin uses MUI), the wrapper imports a scoped
  `ai-playground.css` file that loads `tailwindcss/theme + tailwindcss/utilities`
  (no preflight, so MUI resets stay intact) and `@source`-scans the agent-ui
  package.

**Layout** (3 panels):
- **Left** — tabbed `TargetSelector` / `RuntimeConfigPanel`. Target tab lists
  agents and workflows from `/api/agents` and `/api/agent-workflows`.
- **Center** — `ChatHeader` + `MessageList` + `MessageInput`. Empty-state
  splash when no target is selected; per-target welcome state when selected but
  no messages sent.
- **Right** — tabbed Inspector / Eval / Trace (`ExecutionInspector`,
  `EvalReportPanel`, `TracePanel`).

**Runtime modes**:
- **Agent mode** — routes to `useChat.sendMessage` which POSTs to
  `/api/chat-sessions/[id]/messages` (and through that, the agent invoker).
  Streams tokens via SSE. Inspector shows message-level details.
- **Workflow mode** — bypasses `sendMessage`, POSTs to
  `/api/agent-workflows/[id]/execute`, fetches execution detail from
  `/api/agent-workflow-executions/[id]`, and injects the assistant response
  into the same `MessageList` via `chat.appendMessage(...)` with
  `metadata.source === 'workflow'`. Inspector shows node execution trace.

**Slash commands** (`/commands` support):
- Commands are fetched from `/api/chat-commands` at mount via the new
  `usePlaygroundCommands` hook.
- `MessageInput` opens the `CommandPalette` automatically when the user types
  `/`. Palette filtering / keyboard nav / Tab completion come from the existing
  `useCommandPalette` hook.
- Six commands are handled locally so they work even without backend routing:
  - `/clear` — clear the conversation
  - `/help` — list all available commands
  - `/status` — show mode, target, model, temperature
  - `/model <fast|smart|claude>` — change the runtime config
  - `/temperature <0-2>` — change the runtime config
  - `/export` — download the conversation as JSON
- In workflow mode, a blocked set (`agent, tools, skill, mcp, pin, feedback,
  search, reset`) short-circuits with a user-visible warning system message.
- Unknown commands are forwarded to the backend (agent mode via
  `chat.sendMessage`, workflow mode via the workflow execute path).

**Embedding**:
```tsx
import { UnifiedAIPlayground } from '@oven/agent-ui';

<UnifiedAIPlayground
  apiBaseUrl="https://api.example.com"
  tenantSlug="my-tenant"
  defaultMode="agent"
/>
```
No React Router and no MUI required in the host.

### `<AgentPlayground />` *(legacy — prefer `UnifiedAIPlayground`)*

A full-featured conversational testing interface for dashboard users.

**Props**:
```typescript
interface AgentPlaygroundProps {
  agentSlug?: string;               // pre-selected agent
  tenantId?: number;                // tenant context for testing
  showExposedParams?: boolean;      // show configurable params panel
  showExecutionMetadata?: boolean;  // show token usage, latency, tools used
  showToolCalls?: boolean;          // expand tool call details inline
  height?: string | number;
}
```

**Features**:
- **Agent selector**: Dropdown to pick which agent to test
- **Exposed params panel**: Side panel showing agent's `exposedParams` with editable values
- **Multimodal input**: Text input + image upload (drag-and-drop or file picker)
- **Streaming display**: Token-by-token response rendering
- **Tool call cards**: Expandable cards showing each tool invocation (name, input, output, duration)
- **Execution metadata**: Token count, latency, model used, cost estimate
- **Session management**: New session button, session history list
- **System prompt viewer**: Read-only view of the effective system prompt

### `<ConversationView />`

A read-only message history viewer used for reviewing past conversations.

**Props**:
```typescript
interface ConversationViewProps {
  sessionId: number;                // chat session to display
  showToolCalls?: boolean;
  showTimestamps?: boolean;
  showMetadata?: boolean;
}
```

**Features**:
- **Role-based styling**: User, assistant, system, tool messages with distinct visual treatments
- **Timestamp display**: Relative or absolute timestamps per message
- **Tool call expansion**: Collapsible tool invocation details
- **Metadata panel**: Session context, agent info, execution stats
- **Export**: Copy conversation to clipboard or download as JSON

---

## 2A. Session Management UI

### Inspired by Newsan enterprise chat patterns

**Session Sidebar**:
- Pinnable sessions with pin indicator
- Session search/filtering by title
- Session preview (last message truncated)
- Message count badge
- New session button
- Click to switch active session

**Session Persistence**:
- localStorage with configurable TTL (default 24h)
- Session validation on app restore (check against backend)
- Retry with exponential backoff (max 5 attempts, 500ms interval)
- Graceful degradation when backend unavailable

**Session Switching**:
- Validate target session before switching
- Clear real-time messages from previous session
- Load paginated history for target session
- Deduplication logic to prevent message doubling

**Session Actions**:
| Action | Endpoint | UI |
|--------|----------|-----|
| Pin/unpin | `PATCH /api/chat/sessions/[id]` | Toggle pin icon |
| Rename | `PATCH /api/chat/sessions/[id]` | Inline edit title |
| Delete | `DELETE /api/chat/sessions/[id]` | Confirm dialog |
| Export | `GET /api/chat/sessions/[id]/export` | Download JSON/MD/TXT |

---

## 2B. Message Architecture

### Dual-State Message Pattern (from Newsan)

Messages use a dual-state architecture that separates real-time (current turn) from history (paginated API):

```typescript
// Real-time messages: current conversation turn, optimistically added
const realtimeBySession = Record<string, Message[]>;

// History messages: fetched from API, paginated
const historyMessages = Message[]; // from infinite query

// Combined on render
const messages = useMemo(() => {
  if (historyMessages.length) {
    const effectiveRealtime = suppressDuplicates ? [] : currentRealtimeMessages;
    return [...historyMessages, ...effectiveRealtime];
  }
  return [DEFAULT_WELCOME_MESSAGE, ...currentRealtimeMessages];
}, [historyMessages, currentRealtimeMessages]);
```

**Optimistic Updates**:
1. User message added to real-time state immediately
2. Cache updated with session preview (React Query)
3. API call sent to backend
4. On success: messages moved to history cache, real-time cleared
5. On error: error message added to real-time state

**Pagination**:
- Infinite scroll for older messages (default page size: 20)
- "Load more" button at top of message list
- Newest messages at bottom (natural chat order)

**Message Filtering**:
```typescript
function filterMessagesForDisplay(messages: Message[]): Message[] {
  return messages.filter(msg => {
    if (msg.role === 'user') return true;
    if (msg.error) return true;
    if (msg.toolCalls?.length || msg.data?.length) return true;
    return !!msg.content?.trim();
  });
}
```

---

## 2C. Chat Input

### Enhanced Input (from Newsan + Claude Code)

**Auto-Growing Textarea**:
- Starts as single line, grows up to 6 rows
- Shift+Enter for newline, Enter to send
- Max character limit (configurable, default 2000)
- Character counter shown at 80% capacity

**Command Detection**:
- When input starts with `/`, triggers command palette
- Filters available commands as user types
- Arrow keys + Enter to select command
- Tab to autocomplete command name
- Escape to dismiss palette

### CommandPalette Component

```typescript
interface CommandPaletteProps {
  commands: ChatCommand[];
  filter: string;           // current input after '/'
  onSelect: (command: ChatCommand) => void;
  onClose: () => void;
  position: { top: number; left: number };
}
```

**Features**:
- Keyboard navigation: Arrow Up/Down, Enter to select, Escape to close
- Fuzzy search on command name and description
- Category headers (Navigation, Agent, Tools, Export, Settings)
- Description preview for focused command
- Parameter hints (e.g., "/mode <creative|precise|balanced>")

**File Attachments**:
- Drag-and-drop onto input area
- File picker button (images, audio, documents)
- Preview thumbnails for attached files
- Remove attachment button

**Voice Input** (optional):
- Microphone button toggles recording
- Uses `ai.transcribe` tool for speech-to-text
- Transcribed text appears in input field
- Configurable via `WIDGET_ENABLE_VOICE_INPUT` config key

**Disabled States**:
| State | Condition | UI |
|-------|-----------|-----|
| Initializing | Session not yet created | Input disabled, "Connecting..." |
| Sending | Message in flight | Input disabled, spinner on send button |
| Error | Session invalid | Input disabled, error message |
| Offline | Network unavailable | Input disabled, "Offline" badge |

---

## 2D. Message Rendering

### Rich Message Display (from Newsan + Claude Code)

**Role-Based Styling**:
| Role | Position | Background | Avatar |
|------|----------|------------|--------|
| User | Right-aligned | Primary color | User initials |
| Assistant | Left-aligned | Surface color | Agent icon |
| System | Center | Muted | Info icon |
| Tool | Left-aligned, indented | Code background | Tool icon |

**Content Parts**:
- **Text**: Rendered with react-markdown, syntax highlighting for code blocks
- **Tool calls**: Expandable `ToolCallCard` component showing name, input, output, duration
- **Charts**: Plotly/Recharts integration for data visualization (from Newsan)
- **Data tables**: Inline table for structured results
- **Images**: Inline image display with lightbox zoom
- **Audio**: Audio player component
- **Error**: `ChatErrorCard` with error message and retry button

**Streaming Display**:
```typescript
// StreamingText component renders tokens as they arrive
<StreamingText
  text={partialContent}
  isStreaming={status === 'streaming'}
  cursor={true}  // blinking cursor during streaming
/>
```

**Message Feedback**:
- Like/dislike buttons below each assistant message
- Optional comment field on dislike
- Feedback stored via `POST /api/chat/feedback`
- Visual state: liked (green), disliked (red), neutral (gray)

---

## 2E. Layout Modes

### Resizable Chat Layout (from Newsan)

**Layout Modes**:
| Mode | When | Layout |
|------|------|--------|
| Inline | Default on desktop | Split panel: 60% content, 40% chat |
| Modal | Default on dashboard pages | Side panel overlay with backdrop |
| Fullscreen | User toggle | Full viewport, session sidebar on left |
| Embedded | Widget on external site | Floating panel in bottom-right |

**Resizable Panels**:
- `react-resizable-panels` integration
- Drag handle between content and chat panels
- Minimum widths: content 300px, chat 320px
- Persistence: panel sizes saved to localStorage

**Responsive Behavior**:
| Breakpoint | Layout |
|-----------|--------|
| >= 1024px | Split panel or modal (user choice) |
| 768-1023px | Modal side panel |
| < 768px | Full-screen overlay with back button |

---

## 3. Embeddable Widget Bundle

### Build Configuration

The chat widget is bundled as a standalone JavaScript file for embedding on external websites:

```
packages/agent-ui/
  src/
    widget/
      mount.tsx               <- Auto-mount logic: reads data-* attributes, renders ChatWidget
      styles.css              <- Scoped styles (CSS modules or shadow DOM)
  vite.config.widget.ts       <- Vite build config for standalone bundle
  dist/
    chat-widget.js            <- Single file, self-contained
    chat-widget.css           <- Optional external styles (or inlined)
```

### Embedding on External Websites

```html
<!-- Embed on a dental office website -->
<script
  src="https://cdn.example.com/chat-widget.js"
  data-tenant="clinica-xyz"
  data-theme="light"
  data-position="bottom-right"
  data-quick-replies="Horarios,Servicios,Agendamiento,Pagos"
  defer
></script>
```

The `mount.tsx` script:
1. Reads `data-*` attributes from the `<script>` tag
2. Creates a container `<div>` at the end of `<body>`
3. Renders `<ChatWidget>` with the parsed props
4. Scopes styles to avoid conflicts with the host page

### API Communication

The widget communicates with the OVEN API:
- `GET /api/tenants/[slug]/public` — Tenant config (branding, schedule, welcome messages)
- `POST /api/chat-sessions` — Create anonymous session
- `POST /api/chat-sessions/[id]/messages` — Send message (SSE streaming response)

All requests include a `X-Session-Token` header for anonymous session identification.

---

## 4. Theming

### CSS Custom Properties

The widget uses CSS custom properties for branding, populated from tenant config:

```css
:root {
  --oven-widget-primary: #1976D2;
  --oven-widget-primary-contrast: #FFFFFF;
  --oven-widget-surface: #F5F5F5;
  --oven-widget-background: #FFFFFF;
  --oven-widget-text: #333333;
  --oven-widget-text-secondary: #666666;
  --oven-widget-border-radius: 12px;
  --oven-widget-font-family: 'Inter', system-ui, sans-serif;
  --oven-widget-bubble-user: var(--oven-widget-primary);
  --oven-widget-bubble-assistant: var(--oven-widget-surface);
  --oven-widget-max-width: 400px;
  --oven-widget-max-height: 600px;
}
```

### Dark Mode

When `theme="dark"` or `theme="auto"` (follows system preference):

```css
[data-oven-theme="dark"] {
  --oven-widget-background: #1A1A1A;
  --oven-widget-surface: #2D2D2D;
  --oven-widget-text: #E0E0E0;
  --oven-widget-text-secondary: #999999;
}
```

### Theme Presets (inspired by Newsan's 15-theme system)

| Preset | Primary | Surface | Background |
|--------|---------|---------|------------|
| Light | #1976D2 | #F5F5F5 | #FFFFFF |
| Dark | #90CAF9 | #2D2D2D | #1A1A1A |
| Ocean | #0288D1 | #E1F5FE | #F0F8FF |
| Forest | #2E7D32 | #E8F5E9 | #F1F8E9 |
| Sunset | #E65100 | #FFF3E0 | #FFFDE7 |
| Midnight | #5C6BC0 | #1A237E | #0D1F4B |
| Rose | #AD1457 | #FCE4EC | #FFF0F5 |
| Clinical | #00695C | #E0F2F1 | #F5FFFE |
| Professional | #37474F | #ECEFF1 | #F5F5F5 |
| Warm | #BF360C | #FBE9E7 | #FFFAF5 |

**Per-Tenant Branding**:
- Colors loaded from `GET /api/tenants/[slug]/public`
- CSS variables set at widget mount time
- Tenant can override any theme variable via module-config
- Config keys: `WIDGET_PRIMARY_COLOR`, `WIDGET_SURFACE_COLOR`, `WIDGET_FONT_FAMILY`

---

## 5. Package Structure

```
packages/agent-ui/
  package.json
  tsconfig.json
  vite.config.ts                     <- Library build (React components)
  vite.config.widget.ts              <- Standalone widget build
  src/
    index.ts                         <- Export ChatWidget, AgentPlayground, ConversationView
    widget/
      ChatWidget.tsx                 <- Main widget component (Props: tenantSlug, theme, agentSlug, apiBaseUrl)
      ChatBubble.tsx                 <- Single message bubble (user/assistant) with markdown rendering
      TypingIndicator.tsx            <- Animated dots while agent is thinking
      WelcomeScreen.tsx              <- Initial state: welcome message + quick-reply category buttons
      EscalationBanner.tsx           <- Shows contact info when handoff=true
      AppointmentButton.tsx          <- "Agendar cita" button -> opens schedulingUrl
      WidgetLauncher.tsx             <- Floating button (bottom-right) that opens/closes the widget
      embed.ts                       <- Embeddable entry point: reads data-* attrs, renders into shadow DOM
      styles.css                     <- Widget-specific scoped styles
    playground/
      AgentPlayground.tsx            <- Full playground: message list, input bar, settings panel, tool call cards
      ToolCallCard.tsx               <- Expandable card showing tool name, input, output, duration
      ParamsPanel.tsx                <- Sidebar: model selector, temperature slider, maxTokens (from agent.exposedParams)
    shared/
      ConversationView.tsx           <- Generic message thread renderer (Props: messages[], onSendMessage, streaming)
      MessageList.tsx                <- Scrollable message list with auto-scroll on new messages
      MessageInput.tsx               <- Text input + send button + optional file attach
      StreamingText.tsx              <- Component that renders streaming tokens as they arrive
      CommandPalette.tsx             <- Slash-command palette with fuzzy search and keyboard navigation
      ChatErrorCard.tsx              <- Error display with retry button
      SessionSidebar.tsx             <- Pinnable session list with search, preview, and actions
      LayoutManager.tsx              <- Resizable panel orchestrator (inline, modal, fullscreen, embedded)
      MessageFeedback.tsx            <- Like/dislike buttons with optional comment
    hooks/
      useChat.ts                     <- Wrapper around @ai-sdk/react useChat
      useTenantConfig.ts             <- Fetches public tenant config
      useBusinessHours.ts            <- Computes business hours status
      useAnonymousSession.ts         <- Session token management (localStorage)
      useSessionPersistence.ts       <- localStorage TTL, validation, retry with backoff
      useDualStateMessages.ts        <- Real-time + history message merging with deduplication
      useCommandPalette.ts           <- Slash-command detection, filtering, keyboard navigation
      useResizablePanels.ts          <- Panel size persistence and responsive breakpoint logic
    themes/
      light.css                      <- Light theme variables
      dark.css                       <- Dark theme variables
      presets.ts                     <- Theme preset definitions (10 presets)
    types.ts                         <- Shared TypeScript types
```

### Peer Dependencies

```json
{
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0",
    "@ai-sdk/react": "^1.0.0"
  },
  "dependencies": {
    "@mui/material": "^6.0.0",
    "@mui/icons-material": "^6.0.0",
    "react-resizable-panels": "^2.0.0",
    "react-markdown": "^9.0.0"
  }
}
```

---

## 6. Configuration Integration

The widget reads configuration from two sources:

### 1. Tenant Config (runtime)

Fetched via `GET /api/tenants/[slug]/public`:
- Welcome messages (business hours / out of hours)
- Schedule (to determine business hours)
- Human contact info (for escalation display)
- Scheduling URL (for appointment button)
- Tone preference (affects system prompt behavior)

### 2. Module Config (3-tier cascade)

Resolved via the config cascade system. Configurable at platform, module, or tenant level:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `WIDGET_MAX_MESSAGES_PER_SESSION` | number | 100 | Max messages per chat session |
| `WIDGET_SHOW_POWERED_BY` | boolean | true | Show "Powered by OVEN" badge |
| `WIDGET_ENABLE_FILE_UPLOAD` | boolean | false | Allow file uploads in widget |
| `WIDGET_ENABLE_VOICE_INPUT` | boolean | false | Allow voice input in widget |
| `WIDGET_PRIMARY_COLOR` | string | '#1976D2' | Override primary theme color |
| `WIDGET_SURFACE_COLOR` | string | '#F5F5F5' | Override surface theme color |
| `WIDGET_FONT_FAMILY` | string | 'Inter, system-ui' | Override font family |
| `WIDGET_MAX_CHAR_LIMIT` | number | 2000 | Max characters per message input |
| `WIDGET_SESSION_TTL_HOURS` | number | 24 | localStorage session TTL in hours |
| `WIDGET_DEFAULT_LAYOUT` | string | 'inline' | Default layout mode (inline/modal/fullscreen) |
| `PLAYGROUND_DEFAULT_AGENT` | string | '' | Default agent slug for playground |

---

## 7. Integration Points

| Module | Integration |
|--------|-------------|
| **module-chat** | All conversation API calls go through module-chat endpoints |
| **module-agent-core** | Agent selection, playground testing, tool call display |
| **module-tenants** | Tenant config for branding, schedule, contact info |
| **module-ui-flows** | Chat page type embeds `<ChatWidget>` with configured agent |
| **module-files** | File upload in chat uses module-files upload API |
| **module-notifications** | Web chat sessions can share context with WhatsApp conversations |

---

## 8. Usage in Dashboard

The exported components are used in several dashboard pages:

```typescript
// In module-chat Dashboard UI
import { AgentPlayground, ConversationView } from '@oven/agent-ui';

// Chat page — full playground experience
export const ChatPage = () => (
  <AgentPlayground
    showExposedParams
    showExecutionMetadata
    showToolCalls
    height="calc(100vh - 64px)"
  />
);

// Session detail — read-only history
export const SessionShow = ({ id }) => (
  <ConversationView
    sessionId={id}
    showToolCalls
    showTimestamps
  />
);
```

```typescript
// In module-ui-flows portal rendering
import { ChatWidget } from '@oven/agent-ui';

// Chat page type renderer
export const ChatPageRenderer = ({ config, tenantSlug }) => (
  <ChatWidget
    tenantSlug={tenantSlug}
    agentSlug={config.agentSlug}
    position="inline"
    placeholder={config.placeholder}
    welcomeMessage={config.welcomeMessage}
    showSchedulingButton
  />
);
```

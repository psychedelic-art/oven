# Agent UI — Overview

> **Package**: `packages/agent-ui/`
> **Name**: `@oven/agent-ui`
> **Type**: Editor Package (pure UI — no `ModuleDefinition`, no schema, no API handlers)
> **Dependencies**: `@oven/oven-ui`, `react-markdown`
> **Peer dependencies**: `react`, `react-dom` (consumer brings `@ai-sdk/react` when using chat hooks)
> **Spec**: [`docs/modules/16-agent-ui.md`](../16-agent-ui.md)
> **Status**: LIVE — shipped, used by dashboard `/ai-playground` route and portal chat page renderer

---

## What It Does

`@oven/agent-ui` is a **standalone React component library** that provides
the embeddable chat widget, the unified AI playground, the conversation
viewer, and the session-management sidebar used across the OVEN platform.

It follows the editor package pattern (`packages/form-editor/`,
`packages/workflow-editor/`, `packages/map-editor/`): pure reusable UI
components, no database schema, no API handlers, no `ModuleDefinition`.
The package is consumed by three surfaces:

1. **Dashboard `/ai-playground` route** — React Admin wraps a ~40-line
   MUI shell (back button + title) around `<UnifiedAIPlayground>`.
2. **Portal chat page renderer** — `module-ui-flows` chat page type
   embeds `<ChatWidget>` with the tenant's configured agent.
3. **Standalone widget bundle** — `src/entry/widget.ts` is built by
   `vite.config.widget.ts` into a single `chat-widget.js` that can be
   embedded on external tenant websites via a `<script>` tag with
   `data-*` attributes.

---

## What's in the Package

```
packages/agent-ui/src/
  widget/       ChatWidget, WelcomeScreen, EscalationBanner, WidgetLauncher
  playground/   UnifiedAIPlayground, AgentPlayground (legacy), TargetSelector,
                ParamsPanel, panels/{ExecutionInspector,EvalReportPanel,
                TracePanel,RuntimeConfigPanel}
  shared/       MessageList, MessageBubble, MessageInput, ChatHeader,
                ConversationView, SessionSidebar, CommandPalette,
                ToolCallCard, StreamingText, TypingIndicator,
                ChatErrorCard, MessageFeedback, filterMessagesForDisplay
  layout/       LayoutManager (inline | modal | fullscreen | embedded)
  hooks/        useChat, useBusinessHours, useAnonymousSession,
                useSessionPersistence, useTenantConfig, useChatScroll,
                useDualStateMessages, useCommandPalette, usePlaygroundCommands
  themes/       applyTheme, presets (10 theme presets)
  entry/        widget.ts — standalone bundle entry point
  __tests__/    vitest + @testing-library/react suites
```

---

## Why It Exists

Without `@oven/agent-ui`, every surface that renders a chat experience
would rebuild message lists, streaming displays, session switching, and
command palettes from scratch. The package centralises:

1. **The message architecture** (real-time + history dual-state, with
   deduplication, optimistic updates, and pagination).
2. **The streaming UX** (token-by-token display with cursor, typing
   indicator, error cards with retry).
3. **Command handling** (`/clear`, `/help`, `/status`, `/model`,
   `/temperature`, `/export` resolved locally; unknown commands
   forwarded to backend).
4. **Theming and tenant branding** (CSS custom properties populated
   from `GET /api/tenants/[slug]/public`).
5. **Session management** (pinnable sessions, TTL-based localStorage
   persistence, retry with backoff, graceful degradation).
6. **Layout orchestration** (inline, modal, fullscreen, embedded modes
   with `react-resizable-panels`).

---

## Architectural Position

```
apps/dashboard     /ai-playground route
     +---> @oven/agent-ui (MUI-free inside)
                |
apps/dashboard/.../portal  chat page renderer
     +---> @oven/agent-ui

external tenant websites
     +---> chat-widget.js  (bundled from src/entry/widget.ts)
                |
                v
          module-chat API
          (chat sessions, messages, commands, feedback, sessions/export)
```

`@oven/agent-ui` is a **pure UI layer**. It talks to:

- `module-chat` — all session/message/command endpoints
- `module-agent-core` — agent selection metadata (via `/api/agents`)
- `module-workflow-agents` — workflow selection (via `/api/agent-workflows`)
- `module-tenants` — `GET /api/tenants/[slug]/public` for branding
- `module-files` — upload endpoint when `WIDGET_ENABLE_FILE_UPLOAD` is on
- `module-config` — runtime config cascade for widget behaviour flags

It has **zero** dependency on `apps/dashboard`, React Admin, `@mui/*`,
or `react-router-dom`. The dashboard wrapper imports `agent-ui` — never
the other way round.

---

## Quick Start

### Dashboard playground

```tsx
// apps/dashboard/src/app/(admin)/ai-playground/page.tsx
import { UnifiedAIPlayground } from '@oven/agent-ui';
import './ai-playground.css'; // scoped Tailwind load (no preflight)

export default function Page() {
  return (
    <UnifiedAIPlayground
      apiBaseUrl="/api"
      tenantSlug="default"
      defaultMode="agent"
    />
  );
}
```

### Portal chat page

```tsx
import { ChatWidget } from '@oven/agent-ui';

export const ChatPageRenderer = ({ config, tenantSlug }) => (
  <ChatWidget
    tenantSlug={tenantSlug}
    agentSlug={config.agentSlug}
    position="inline"
    welcomeMessage={config.welcomeMessage}
    showSchedulingButton
  />
);
```

### External website embed

```html
<script
  src="https://cdn.example.com/chat-widget.js"
  data-tenant="clinica-xyz"
  data-theme="light"
  data-position="bottom-right"
  defer
></script>
```

---

## Graduation status

- Canonical doc shape: 11/11 (this folder)
- Spec: [`../16-agent-ui.md`](../16-agent-ui.md)
- Package source: `packages/agent-ui/src/`
- Tests: `packages/agent-ui/src/__tests__/` — vitest + @testing-library/react
- Todo folder: [`../todo/agent-ui/`](../todo/agent-ui/)

See `module-design.md` for the layering rules, `UI.md` for component
contracts, `api.md` for the backend endpoints consumed, and
`secure.md` for the embedded-on-external-site threat model.

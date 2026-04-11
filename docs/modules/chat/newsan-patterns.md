# Newsan Dashboard — Reusable Patterns for Oven

> Reference analysis of `C:\Users\HardM\Desktop\Enterprise\newsan\newsan-dashboard-fe`
> **Purpose**: Identify production-quality patterns to adapt for agent-ui and module-chat.
> **Date**: 2026-04-05

---

## 1. Chat Composition Hook Pattern

**Source**: `src/features/chat/hooks/use-vanna-enhanced.ts`

The main chat hook composes smaller specialized hooks into a unified interface:

```typescript
// Pattern: Composition hook that merges sub-hooks
function useVannaEnhanced() {
  const session = useVannaSession();     // session lifecycle
  const messages = useVannaMessages();   // message history + pagination
  const filters = useVannaFilters();     // filter state for context
  const scroll = useChatScroll();        // auto-scroll logic

  return { ...session, ...messages, ...filters, ...scroll };
}
```

**Oven adaptation**: `useChat.ts` in agent-ui wraps `@ai-sdk/react` useChat and composes:
- `useAnonymousSession()` — session token management
- `useDualStateMessages()` — realtime + history merging
- `useCommandPalette()` — `/` command detection
- `useChatScroll()` — auto-scroll behavior

---

## 2. Session Management

**Source**: `src/features/chat/hooks/use-vanna-session.ts`, `src/features/chat/api/use-chat-api.ts`

Key patterns:
- Session creation via React Query mutation
- Session switching with message cache invalidation
- Session validation on reconnect
- Session list with preview (last message, timestamp)

**Oven adaptation**: `useAnonymousSession.ts` + API hooks:
- localStorage sessionToken with TTL (24h default)
- Creates session via POST /api/chat-sessions
- Validates on mount, creates new if expired
- Session sidebar with search, pin, message count badge

---

## 3. Message Pagination

**Source**: `src/features/chat/hooks/use-vanna-messages.ts`, `src/features/chat/api/use-conversation-history.ts`

Pattern: Load-more pagination for older messages, realtime append for new ones.

**Oven adaptation**: `useDualStateMessages.ts`:
- Realtime messages from SSE stream (newest)
- History messages from GET /api/chat-sessions/[id]/messages (paginated, older)
- ID-based deduplication when history confirms realtime messages
- React Query cache invalidation on new messages

---

## 4. Resizable Chat Panel

**Source**: `src/features/chat/components/resizable-chat-panel.tsx`

Pattern: Dual-mode panel (modal overlay or layout sidebar) with draggable resize handle.

**Oven adaptation**: `LayoutManager.tsx` using `react-resizable-panels`:
- Modes: inline (split 60/40), modal (overlay), fullscreen, embedded
- Resize handle with visual feedback
- Panel size persisted to localStorage
- Responsive: mobile → fullscreen, desktop → configurable

---

## 5. Chat Scroll Behavior

**Source**: `src/features/chat/hooks/use-chat-scroll.ts`

Pattern: Auto-scroll on new messages, pause auto-scroll when user scrolls up, resume on scroll to bottom.

**Oven adaptation**: `useChatScroll.ts`:
- Same auto-scroll logic
- Load-more trigger at scroll top (older messages)
- Smooth scroll for new messages
- Scroll-to-bottom button when not at bottom

---

## 6. Query Key Factory

**Source**: `src/shared/config/query-keys.ts`

Pattern: Hierarchical query key structure for React Query cache management.

```typescript
const queryKeys = {
  chat: {
    all: ['chat'],
    session: () => [...queryKeys.chat.all, 'session'],
    messages: (sessionId) => [...queryKeys.chat.all, 'messages', sessionId],
    sessions: () => [...queryKeys.chat.all, 'sessions'],
  }
};
```

**Oven adaptation**: Same pattern in agent-ui for all chat API hooks.

---

## 7. Chat UI Component Structure

**Source**: `src/features/chat/components/`

Component hierarchy:
```
AIChatInterfaceEnhanced (main container)
  ├── ChatHeader (session info, controls)
  ├── MessageList (scrollable message area)
  │   └── ChatMessage (individual message)
  │       ├── MessageBubble (text content)
  │       ├── ChartResolver (data visualizations)
  │       └── MessageFeedback (like/dislike)
  ├── ChatInput (text area + send button)
  └── SessionsSidebar (session list)
```

**Oven adaptation**: Similar hierarchy in agent-ui:
```
ChatWidget / UnifiedAIPlayground (facade)
  ├── SessionSidebar
  ├── ChatHeader                       (ported from newsan)
  ├── MessageList                      (fed via filterMessagesForDisplay, ported from newsan)
  │   └── MessageBubble
  │       ├── StreamingText
  │       ├── ToolCallCard
  │       └── MessageFeedback
  ├── MessageInput
  │   └── CommandPalette               (net-new, not in newsan)
  └── WidgetLauncher
```

**Ported in the April 2026 playground refactor**:
- `ChatHeader` — dedicated session header (newsan had one, agent-ui had an
  ad-hoc inline top bar). Now used by `UnifiedAIPlayground` and available to
  `ChatWidget` next.
- `filterMessagesForDisplay` — hides empty non-streaming assistant rows while
  always keeping errors, streaming messages, user, system, and tool messages.
  Applied inside `UnifiedAIPlayground` before handing messages to `MessageList`.

---

## 8. Error Boundary Pattern

**Source**: `src/app/error-boundary.tsx`

Pattern: React error boundary with retry capability and user-friendly error display.

**Oven adaptation**: `ChatErrorCard.tsx` in agent-ui:
- Error display with retry button
- Distinguish network errors vs agent errors vs session errors
- Fallback UI that doesn't break the widget

---

## 9. Filter Persistence

**Source**: `src/shared/utils/filter-persistence.ts`

Pattern: localStorage wrapper with versioning, history tracking, import/export.

**Oven adaptation**: Adapt for session and config persistence:
- Session token TTL management
- User preferences (theme, layout mode)
- Recent sessions list
- Version migration support

---

## 10. Feature Directory Structure

**Source**: `src/features/chat/`

```
features/chat/
├── api/           # React Query hooks for API calls
├── components/    # UI components
├── hooks/         # Business logic hooks
├── utils/         # Helper functions
└── types/         # TypeScript types
```

**Oven adaptation**: Apply to agent-ui package:
```
agent-ui/src/
├── hooks/         # useChat, useAnonymousSession, etc.
├── shared/        # MessageBubble, MessageList, etc.
├── widget/        # ChatWidget, WidgetLauncher, etc.
├── playground/    # AgentPlayground, ParamsPanel
├── themes/        # Theme presets
└── types.ts       # All TypeScript interfaces
```

---

## 11. Data Visualization in Chat

**Source**: `src/features/data-visualization/components/chart-resolver.tsx`

Pattern: Polymorphic renderer that detects data type and renders appropriate visualization.

**Oven adaptation**: Future consideration for Phase 5+ (agent responses with structured data). For Phase 4, focus on text + tool call cards.

---

## Reusability Matrix

| Pattern | Reusability | Effort | Priority |
|---------|-------------|--------|----------|
| Chat composition hook | HIGH (90%) | LOW | Sprint 4B.1 |
| Session management | HIGH (85%) | LOW | Sprint 4B.1 |
| Message pagination | HIGH (80%) | MEDIUM | Sprint 4B.1 |
| Resizable panel | HIGH (90%) | LOW | Sprint 4B.2 |
| Chat scroll | HIGH (95%) | LOW | Sprint 4B.1 |
| Query key factory | HIGH (100%) | LOW | Sprint 4B.1 |
| Chat UI structure | MEDIUM (70%) | MEDIUM | Sprint 4B.1 |
| Error boundary | HIGH (85%) | LOW | Sprint 4B.1 |
| Filter persistence | MEDIUM (60%) | LOW | Sprint 4B.1 |
| Feature directory | HIGH (100%) | LOW | Sprint 4B.1 |
| Data visualization | LOW (30%) | HIGH | Phase 5+ |

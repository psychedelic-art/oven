# Agent UI — Architecture

`@oven/agent-ui` is a **pure UI library**. It ships three build outputs,
consumes seven upstream modules, has zero database, and owns no
backend handlers. This document is the single source of truth for
how the package is layered, how it talks to the backend, and how it
is bundled.

---

## Layering

```
+-----------------------------------------------------------+
|  Consumer surface (dashboard / portal / external site)    |
+-----------------------------------------------------------+
                        |
                        v
+-----------------------------------------------------------+
|  @oven/agent-ui         (this package)                    |
|                                                           |
|  widget/                playground/                       |
|    ChatWidget             UnifiedAIPlayground              |
|    WelcomeScreen          TargetSelector                   |
|    EscalationBanner       ParamsPanel                      |
|    WidgetLauncher         AgentPlayground (legacy)         |
|                           panels/                          |
|                             ExecutionInspector             |
|                             EvalReportPanel                |
|                             TracePanel                     |
|                             RuntimeConfigPanel             |
|                                                           |
|  shared/                   layout/                         |
|    MessageList               LayoutManager                 |
|    MessageBubble             (inline|modal|fullscreen|     |
|    MessageInput               embedded)                    |
|    CommandPalette                                          |
|    ToolCallCard            themes/                         |
|    StreamingText             applyTheme                    |
|    TypingIndicator           presets (10 presets)          |
|    SessionSidebar                                          |
|    ...                                                     |
|                                                           |
|  hooks/                                                    |
|    useChat               useBusinessHours                  |
|    useTenantConfig       useAnonymousSession               |
|    useSessionPersistence useDualStateMessages              |
|    useCommandPalette     usePlaygroundCommands             |
|    useChatScroll                                           |
|                                                           |
|  entry/widget.ts  <-- standalone vite bundle entry         |
+-----------------------------------------------------------+
                        |
                        v
+-----------------------------------------------------------+
|  OVEN backend modules                                     |
|    module-chat     module-tenants     module-agent-core   |
|    module-files    module-config      module-workflow-    |
|                                       agents              |
+-----------------------------------------------------------+
```

**Invariants**:

1. `widget/` may import from `shared/`, `layout/`, `themes/`, `hooks/`.
2. `playground/` may import from `shared/`, `layout/`, `themes/`, `hooks/`.
3. `shared/` may import from `themes/` only.
4. `layout/` may import from `themes/` only.
5. `hooks/` may import nothing else in the package (pure data layer).
6. `themes/` imports nothing else in the package.
7. **Nothing** in the package imports `@mui/*`, `react-router-dom`,
   or anything under `apps/`.

---

## Build outputs

### 1. Library build (primary)

Consumed via `import { UnifiedAIPlayground } from '@oven/agent-ui'`
and its subpaths. Resolved by pnpm workspace + `exports` field in
`package.json`. No bundler is involved at consumption time — Next.js
and Vite on the consumer side handle tree-shaking.

### 2. Standalone widget bundle

```
src/entry/widget.ts          <-- reads data-* attrs from <script>
vite.config.widget.ts        <-- rollup/vite library build
dist/chat-widget.js          <-- single self-contained file
dist/chat-widget.css         <-- scoped styles
```

Built by `pnpm build:widget`. The entry module:

1. Reads every `data-*` attribute from the active `<script>` tag
2. Creates a container `<div>` at the end of `<body>` (or inside a
   shadow root when `data-shadow="true"`)
3. `createRoot(...).render(<ChatWidget {...parsedProps} />)`
4. Scopes styles to avoid conflicts with the host page

### 3. Dashboard route wrapper

```
apps/dashboard/src/app/(admin)/ai-playground/
  page.tsx              <-- ~40-line MUI shell around <UnifiedAIPlayground>
  ai-playground.css     <-- loads tailwindcss/theme + tailwindcss/utilities
                            with @source scan on @oven/agent-ui
```

The dashboard's `globals.css` intentionally omits Tailwind (React
Admin uses MUI). The scoped `ai-playground.css` opts in to Tailwind
**only on this route**, without `@tailwind base` preflight so MUI
resets remain intact.

---

## Data flow — agent mode

```
User types "hello"
      |
      v
MessageInput.onSubmit
      |
      v
useChat.sendMessage("hello")
      |
      +--> optimistic: push user msg to realtime state
      |
      v
POST /api/chat-sessions/:id/messages (SSE)
      |
      +--> for each token delta:
      |         useChat.onDelta(..)
      |         StreamingText re-renders
      |
      +--> for each tool_call event:
      |         useChat.onToolCall(..)
      |         ToolCallCard renders
      |
      +--> on finish:
                useChat.onFinish(..)
                message moves from realtime to history
```

## Data flow — workflow mode

```
User types "run classifier"
      |
      v
MessageInput.onSubmit
      |
      v
UnifiedAIPlayground.handleWorkflowSend("run classifier")
      |
      +--> POST /api/agent-workflows/:id/execute
      |
      v
poll GET /api/agent-workflow-executions/:id (or stream)
      |
      +--> on terminal:
            chat.appendMessage(assistantMsg, { metadata: { source: 'workflow' } })
            ExecutionInspector renders node trace
            TracePanel renders timeline
```

---

## Session persistence state machine

`useSessionPersistence` stores:

```ts
interface PersistedSession {
  sessionToken: string;
  createdAt: number;    // epoch ms
  lastValidatedAt: number;
  ttlHours: number;     // from WIDGET_SESSION_TTL_HOURS
}
```

Transitions:

```
[no storage] --createSession()--> [fresh]
[fresh] --age > ttl--> [expired]
[expired] --validate success--> [fresh]
[expired] --validate fail--> [discarded]
[discarded] --createSession()--> [fresh]

validate() uses exponential backoff:
  attempt n: wait 500 * 2^(n-1) ms
  max attempts: 5
  on exhaustion: fall through to [discarded]
```

Tests: `useSessionPersistence.test.ts` covers all transitions plus
the `localStorage` quota-exceeded fallback (degrades to in-memory).

---

## Message deduplication

`useDualStateMessages` merges two streams:

```
realtime: Record<sessionId, Message[]>    // current turn, optimistic
history:  Message[]                       // infinite query result

merged = historyMessages.length
         ? [...historyMessages, ...realtime[currentSessionId]]
         : [DEFAULT_WELCOME_MESSAGE, ...realtime[currentSessionId]];
```

Deduplication rule: on `useChat.onFinish`, the real-time entry is
cleared BEFORE the history cache invalidation refetch completes, so
a duplicate would only ever appear inside a single render. The
`filterMessagesForDisplay` helper drops empty assistant frames.

Tests: `filterMessagesForDisplay.test.ts`,
`useChat.appendMessage.test.ts`.

---

## Error handling boundaries

- `useChat` — catches network errors, surfaces as `<ChatErrorCard>`
  with retry.
- `useTenantConfig` — catches 4xx/5xx, falls back to a minimal
  default tenant config (generic welcome + no contact info).
- `useSessionPersistence` — catches `localStorage` quota-exceeded
  and falls back to in-memory storage.
- `entry/widget.ts` — wraps `createRoot.render` in a `try/catch`
  that logs to `console.error` and injects a minimal
  "chat unavailable" DOM node on fatal failure.

**Nothing else** catches. Per `CLAUDE.md`, error handling lives at
system boundaries; internal helpers throw.

---

## Tests

The `__tests__` folder covers the non-trivial derivations:

- `filterMessagesForDisplay.test.ts` — rendering filter rules
- `useBusinessHours.test.ts` — schedule × timezone × instant
- `useChat.appendMessage.test.ts` — workflow-mode injection
- `useCommandPalette.test.ts` — slash-command parsing + kbd nav
- `usePlaygroundCommands.test.ts` — local vs backend command routing
- `useSessionPersistence.test.ts` — TTL + backoff state machine
- `themes.test.ts` — `applyTheme` writes every documented CSS var
- `ChatHeader.test.tsx` — header rendering contract
- `UnifiedAIPlayground.test.tsx` — 3-panel mount, target selection,
  mode switching, command handling

Framework: `vitest` + `@testing-library/react` + `jsdom`. Setup file:
`src/__tests__/setup.ts`.

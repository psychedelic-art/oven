# Agent UI — Detailed Requirements

Source of truth for acceptance criteria. Every `sprint-*.md` under
`docs/modules/todo/agent-ui/` lists which requirements it satisfies by
ID. Requirement IDs are stable; never renumber — strike and add.

## R1. Package boundaries

- **R1.1** — `@oven/agent-ui` MUST NOT import from `@mui/*`,
  `react-router-dom`, or any path under `apps/dashboard`.
- **R1.2** — All className composition MUST go through `cn()` from
  `@oven/oven-ui`. No raw `clsx` imports; no template-literal
  className builders.
- **R1.3** — No inline `style={}` except for dynamic CSS custom
  properties populated from runtime tenant-brand values.
- **R1.4** — Every type-only import MUST use `import type { … }`.
- **R1.5** — zustand stores (if introduced) MUST follow the factory +
  React-context pattern. No singletons with per-instance config.

## R2. UnifiedAIPlayground component

- **R2.1** — 3-panel layout (left target/config, center chat, right
  inspector) rendered without horizontal scroll at ≥ 1024px.
- **R2.2** — Agent mode streams tokens from
  `POST /api/chat-sessions/:id/messages` via SSE and renders them
  live through `<StreamingText>`.
- **R2.3** — Workflow mode bypasses `useChat.sendMessage`, fires
  `POST /api/agent-workflows/:id/execute`, and injects the response
  via `chat.appendMessage` with
  `metadata.source === 'workflow'`.
- **R2.4** — Mode switch MUST reset `<ExecutionInspector>` and
  `<TracePanel>` state but MUST preserve the message list until the
  user confirms via `/clear`.
- **R2.5** — Slash commands `/clear`, `/help`, `/status`, `/model`,
  `/temperature`, `/export` MUST resolve locally without hitting the
  network.
- **R2.6** — In workflow mode, a locally-blocked set of commands
  (`agent, tools, skill, mcp, pin, feedback, search, reset`) MUST
  short-circuit with a system message.
- **R2.7** — Unknown slash commands MUST forward to the backend via
  `useChat.sendMessage` (agent mode) or the workflow execute path
  (workflow mode).

## R3. ChatWidget component

- **R3.1** — Welcome message MUST be business-hours-aware: fetched
  from `useTenantConfig`, resolved by `useBusinessHours(schedule, tz)`.
- **R3.2** — Scheduling button MUST be hidden when
  `tenant.schedulingUrl` is empty and MUST be shown when
  `showSchedulingButton` is true AND the URL is present.
- **R3.3** — Escalation (agent sets `handoff=true`) MUST replace the
  `<MessageInput>` with `<EscalationBanner>` showing phone / email /
  WhatsApp.
- **R3.4** — Anonymous sessions MUST be created via
  `POST /api/chat-sessions` on first interaction and MUST persist the
  `sessionToken` in `localStorage` with the configured TTL.
- **R3.5** — Mobile breakpoint (< 768px) MUST render the widget as a
  full-screen overlay with a back button.
- **R3.6** — External-site embed MUST read every documented
  `data-*` attribute from the `<script>` tag and MUST render into
  a container created at the end of `<body>`, with scoped styles.

## R4. Session persistence

- **R4.1** — `useSessionPersistence` MUST validate stored sessions
  against the backend on restore, with exponential backoff
  (500ms × 2^n, max 5 attempts).
- **R4.2** — Expired sessions (age > `WIDGET_SESSION_TTL_HOURS`)
  MUST be discarded and a fresh session created transparently.
- **R4.3** — `localStorage` quota-exceeded errors MUST fall back to
  an in-memory `Map` without surfacing an error to the user.
- **R4.4** — No PII (user names, emails, message bodies, contact
  details) MUST be written to `localStorage`.

## R5. Theming

- **R5.1** — `applyTheme(preset)` MUST write every documented CSS
  custom property (`--oven-widget-*`) to the host element or shadow
  root, with no missing keys.
- **R5.2** — Per-tenant brand colours MUST override preset colours
  when provided via `GET /api/tenants/:slug/public`.
- **R5.3** — `theme="auto"` MUST honour
  `prefers-color-scheme: dark` at mount and on change.
- **R5.4** — 10 presets MUST be available: Light, Dark, Ocean,
  Forest, Sunset, Midnight, Rose, Clinical, Professional, Warm.

## R6. Message rendering

- **R6.1** — `<MessageBubble>` MUST render markdown via
  `react-markdown` with syntax highlighting for code blocks.
- **R6.2** — Tool calls MUST render as expandable `<ToolCallCard>`
  with name, input (JSON), output (JSON or text), duration.
- **R6.3** — Role-based styling MUST match the spec table (user
  right-aligned primary, assistant left-aligned surface, system
  centered muted, tool left-aligned indented).
- **R6.4** — `<MessageFeedback>` like/dislike MUST `POST /api/chat/feedback`
  optimistically and MUST NOT block the user from continuing.
- **R6.5** — `filterMessagesForDisplay` MUST preserve the rules
  documented in `UI.md` (all user messages, errored messages, any
  message with a tool call / data, and any message with trimmed
  text).

## R7. Command input

- **R7.1** — Auto-growing textarea MUST start at 1 row and grow to
  a maximum of 6 rows.
- **R7.2** — Shift+Enter MUST insert a newline; Enter MUST submit.
- **R7.3** — Character counter MUST appear at ≥ 80% of
  `WIDGET_MAX_CHAR_LIMIT`.
- **R7.4** — Typing `/` as the first character MUST open
  `<CommandPalette>` and dismiss it on Escape or non-slash input.
- **R7.5** — Input MUST be disabled with the appropriate label
  during `Initializing`, `Sending`, `Error`, `Offline` states.

## R8. Layout modes

- **R8.1** — `LayoutManager` MUST support `inline`, `modal`,
  `fullscreen`, `embedded`.
- **R8.2** — Resizable panels MUST honour minimum widths
  (content 300px, chat 320px).
- **R8.3** — Panel sizes MUST persist per surface to `localStorage`
  (key prefix `oven.agent-ui.panels.*`).
- **R8.4** — Breakpoint behaviour MUST match the spec table
  (desktop split/modal, tablet modal, mobile full-screen overlay).

## R9. Embeddability

- **R9.1** — `src/entry/widget.ts` MUST be the only entry point used
  by the standalone bundle. No dashboard-only code may be reachable
  from this entry.
- **R9.2** — The bundle MUST work without any pre-existing React on
  the host page.
- **R9.3** — Widget styles MUST be scoped so they never leak onto
  the host page's own classes.
- **R9.4** — All network calls MUST target `apiBaseUrl` (defaults
  to current origin) and MUST send the `X-Session-Token` header.

## R10. Tests

- **R10.1** — Every hook in `hooks/` that owns derivable or
  state-machine logic MUST have a `__tests__/*.test.ts` file.
- **R10.2** — The three components that own non-trivial rendering
  rules (`<UnifiedAIPlayground>`, `<ChatHeader>`,
  `<filterMessagesForDisplay>`) MUST have a test.
- **R10.3** — Adding a new slash command MUST add a case to
  `usePlaygroundCommands.test.ts`.

## R11. Accessibility (new — Phase A11Y)

- **R11.1** — Every interactive element MUST have an accessible
  name (label, aria-label, or aria-labelledby).
- **R11.2** — Keyboard navigation MUST work for the full playground
  (Tab order, Enter to submit, Esc to dismiss palette, Arrow nav in
  sidebar).
- **R11.3** — Live region MUST announce streaming token updates to
  screen readers in an unobtrusive way (polite, not assertive).
- **R11.4** — Colour contrast MUST meet WCAG AA for every theme
  preset.

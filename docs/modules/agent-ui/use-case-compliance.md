# Agent UI — Use-case compliance

Mapping from the platform-wide use cases defined in
`docs/use-cases.md` to the components in `@oven/agent-ui` that
implement them. Each row lists the UC id, a brief summary, the
component(s) that realise it, and the current state.

Update this file in the same commit that adds or changes a use
case binding. When in doubt, the source of truth is
`docs/use-cases.md`.

---

## UC-AU-01 — Anonymous patient chats on a tenant site

**Flow**: A visitor lands on `clinica-xyz.com`, sees the floating
chat bubble, opens it, and asks a question. The agent responds
with business-hours-aware context. If the agent cannot help, it
escalates to a human.

**Realised by**:

- `<ChatWidget>` with `position="bottom-right"`.
- `useTenantConfig` → `GET /api/tenants/clinica-xyz/public`.
- `useBusinessHours` decides the welcome message.
- `useAnonymousSession` issues `POST /api/chat-sessions`.
- `useChat.sendMessage` streams from
  `POST /api/chat-sessions/:id/messages`.
- `<EscalationBanner>` renders on `handoff=true`.

**Status**: LIVE (widget shipped, portal chat page renderer uses
it, standalone bundle builds from `src/entry/widget.ts`).

---

## UC-AU-02 — Visitor books an appointment via the widget

**Flow**: After chatting about availability, the visitor taps
"Agendar cita" and is taken to the tenant's scheduling URL.

**Realised by**:

- `<ChatWidget>` with `showSchedulingButton={true}`.
- `tenant.schedulingUrl` from `useTenantConfig`.
- One-tap button opens the URL in a new tab with
  `rel="noreferrer noopener"`.

**Status**: LIVE.

---

## UC-AU-03 — Agent escalates to a human operator

**Flow**: The agent decides the conversation needs a human. It
sets `handoff=true` on the last message. The widget swaps the
input area for a contact banner with phone / email / WhatsApp
from tenant config.

**Realised by**:

- `<ChatWidget>` consumes `message.handoff` via `useChat`.
- `<EscalationBanner>` reads `tenant.contact` from `useTenantConfig`.
- `onEscalation` callback fires so the embedder can log the
  handoff.

**Status**: LIVE.

---

## UC-DA-01 — Dashboard operator tests an agent in the playground

**Flow**: Operator navigates to `/ai-playground`, picks an agent
from `<TargetSelector>`, sends test messages, inspects the
response metadata and tool-call trace.

**Realised by**:

- `<UnifiedAIPlayground>` in agent mode.
- `<TargetSelector>` → `GET /api/agents`.
- `<MessageInput>` + `<MessageList>` + `<ChatHeader>`.
- `<ExecutionInspector>` renders message metadata.
- `<ToolCallCard>` inside `<MessageBubble>` renders tool calls.

**Status**: LIVE.

---

## UC-DA-02 — Dashboard operator runs a workflow agent in the playground

**Flow**: Operator switches the playground to workflow mode,
picks a workflow agent, and inspects node-level execution trace,
cost, and latency.

**Realised by**:

- `<UnifiedAIPlayground defaultMode="workflow">`.
- `<TargetSelector>` (workflow tab) → `GET /api/agent-workflows`.
- `POST /api/agent-workflows/:id/execute`.
- `GET /api/agent-workflow-executions/:id` consumed by
  `<ExecutionInspector>` and `<TracePanel>`.
- `chat.appendMessage(assistantMsg, { metadata: { source: 'workflow' } })`
  injects the final response into the same `<MessageList>`.

**Status**: LIVE.

---

## UC-DA-03 — Operator uses slash commands to steer the session

**Flow**: Operator types `/` and the command palette opens. They
pick `/model smart` to switch runtime config, then `/export` to
save the conversation as JSON.

**Realised by**:

- `<MessageInput>` detects leading `/`.
- `<CommandPalette>` renders filtered matches from
  `usePlaygroundCommands` (local six + backend catalog).
- Local commands run synchronously.
- `/export` downloads from `GET /api/chat-sessions/:id/export`.

**Status**: LIVE.

---

## UC-DA-04 — Operator reviews a past conversation

**Flow**: Operator opens the Sessions list, picks a past session,
and views the read-only message history with tool calls expanded.

**Realised by**:

- `<SessionSidebar>` (pinnable list, search, preview).
- `<ConversationView>` with `showToolCalls showTimestamps showMetadata`.
- `GET /api/chat-sessions/:id/messages` consumed by
  `useDualStateMessages`.

**Status**: LIVE (conversation view), PARTIAL (sessions sidebar
still needs pin/unpin wiring — tracked as sprint-02).

---

## UC-PO-01 — Portal chat page embeds a configured agent

**Flow**: A tenant authors a "chat page" in `module-ui-flows`,
picks an agent slug and welcome message, publishes. Visitors
browse to the portal URL and see the chat inline on the page.

**Realised by**:

- `<ChatWidget position="inline">` mounted by the portal's
  `ChatPageRenderer`.
- `config.agentSlug`, `config.welcomeMessage`,
  `config.placeholder` passed as props.
- `showSchedulingButton` toggled by the page config.

**Status**: LIVE.

---

## UC-A11Y-01 — Screen reader user interacts with the playground

**Flow**: A screen-reader user opens `/ai-playground`, Tabs through
the target selector, sends a message with Enter, listens for
streamed tokens via a polite live region, opens the command
palette with `/`, navigates with arrow keys, selects with Enter.

**Realised by**:

- Every interactive element has an accessible name (R11.1).
- Live region announces streaming updates (R11.3).
- Keyboard navigation works end-to-end (R11.2).
- Theme presets meet WCAG AA contrast (R11.4).

**Status**: PLANNED — sprint-04 "Accessibility hardening" owns
this. Requirements R11.1–R11.4 are tracked in
`docs/modules/agent-ui/detailed-requirements.md`.

---

## UC-SEC-01 — External tenant site embeds the widget safely

**Flow**: A tenant adds the `<script>` tag to their WordPress
template. The widget mounts, scopes its styles, creates an
anonymous session, and handles chats without leaking data to or
from the host page.

**Realised by**:

- `src/entry/widget.ts` reads `data-*` attrs.
- Scoped CSS + optional shadow DOM (R9.3).
- `X-Session-Token` header on every request.
- Link rel hardening (T2 in `secure.md`).
- No `dangerouslySetInnerHTML`, no `rehype-raw`.

**Status**: LIVE. Threat model documented in
[`secure.md`](secure.md).

---

## Cross-cutting compliance

- **Module-rules.md §1 — Package separation**: PASS. Pure editor
  package, no `ModuleDefinition`, no backend.
- **Module-rules.md §2 — Naming**: PASS. `@oven/agent-ui` matches
  the editor package pattern.
- **Module-rules.md §10.1 — List endpoints**: N/A. No list
  endpoints owned.
- **Module-rules.md §14 — Error envelopes**: PASS. All error
  displays consume the OVEN standard envelope via `<ChatErrorCard>`.
- **Package-composition.md**: PASS. Peer-deps on `react`/`react-dom`;
  runtime dep on `@oven/oven-ui` workspace; no cross-package imports
  from `apps/dashboard`.
- **Routes.md**: N/A. No routes owned. Consumers mount
  `/ai-playground` in the dashboard and `/chat` in the portal.
- **CLAUDE.md styling**: PASS. Tailwind via `cn()`; no inline
  `style={}`; `import type` for type-only imports.

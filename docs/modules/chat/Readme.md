# Module Chat + Agent UI

> Documentation for `packages/module-chat` and `packages/agent-ui` in the OVEN platform.

---

## What These Packages Do

**module-chat** (`@oven/module-chat`) is a full ModuleDefinition that manages the conversational layer of the OVEN platform. It handles chat session lifecycle (create, resume, escalate, close, archive), message routing to agents, SSE streaming responses, escalation detection, and session-level analytics. It supports both authenticated dashboard sessions and anonymous widget sessions (via server-generated `sessionToken`).

**agent-ui** (`@oven/agent-ui`) is an Editor Package (no ModuleDefinition) that provides three core React components: ChatWidget for end-user chat on external websites and portals, AgentPlayground for agent testing in the dashboard, and ConversationView for reviewing past conversations. It also produces a standalone JavaScript bundle (`chat-widget.js`) for embedding via a `<script>` tag with shadow DOM isolation.

---

## Why Two Packages

The split exists because of fundamentally different deployment targets:

- **module-chat** runs inside the dashboard. Its API handlers live in Next.js, its dashboard UI components use MUI 7 with the `sx` prop, and it follows the standard ModuleDefinition pattern with schema, seed, events, and config.
- **agent-ui** runs on external websites and inside portals. Its components use Tailwind CSS with `cn()` from `@oven/oven-ui`. The widget must work on any website without MUI or the dashboard runtime. The Vite-built standalone bundle is completely self-contained.

---

## Phase and Dependencies

Both packages are Phase 4.

**module-chat depends on:**
- `module-registry` -- schema composition, API utilities, event bus
- `module-agent-core` -- agent invocation, tool wrapper, agent resolution
- `module-ai` -- streaming infrastructure, provider resolution, guardrails
- `module-tenants` -- tenant config resolution, business hours, branding

**agent-ui depends on:**
- `module-chat` -- all chat API endpoints (sessions, messages, actions)
- `module-agent-core` -- agent selection, playground agent invocation
- `@ai-sdk/react` -- `useChat` hook for client-side streaming

---

## Styling Split

| Context | Technology | Rule |
|---------|-----------|------|
| Dashboard components (`apps/dashboard/src/components/chat/`) | MUI 7 + `sx` prop | Never use `style={}`, `className=` with custom CSS, or `styled()` |
| Widget/portal components (`packages/agent-ui/src/`) | Tailwind CSS + `cn()` from `@oven/oven-ui` | Never use template literals for className, never import clsx directly |

This split is enforced by the project coding standards in `CLAUDE.md`.

---

## Quick Start

### Using the Chat API (module-chat)

```typescript
// Create an anonymous session (widget)
const res = await fetch('/api/chat-sessions', {
  method: 'POST',
  body: JSON.stringify({ tenantSlug: 'clinica-xyz', channel: 'widget' }),
});
const { id, sessionToken } = await res.json();

// Send a message (SSE streaming)
const stream = await fetch(`/api/chat-sessions/${id}/messages`, {
  method: 'POST',
  headers: { 'X-Session-Token': sessionToken },
  body: JSON.stringify({ content: [{ type: 'text', text: 'What are your hours?' }] }),
});
// stream is an SSE response with token, toolCallStart, toolCallEnd, done events
```

### Embedding the Widget (agent-ui)

```html
<script
  src="https://cdn.example.com/chat-widget.js"
  data-tenant="clinica-xyz"
  data-theme="light"
  data-position="bottom-right"
  data-quick-replies="Horarios,Servicios,Agendamiento"
  defer
></script>
```

### Using Components in React (agent-ui)

```typescript
import { ChatWidget, AgentPlayground, ConversationView } from '@oven/agent-ui';

// Widget in a portal page
<ChatWidget tenantSlug="clinica-xyz" position="inline" />

// Playground in dashboard
<AgentPlayground showExposedParams showToolCalls height="calc(100vh - 64px)" />

// Read-only history
<ConversationView sessionId={42} showToolCalls showTimestamps />
```

---

## Key Exports

### module-chat

| Export | Description |
|--------|-------------|
| `chatModule` | ModuleDefinition (schema, seed, apiHandlers, events, configSchema, resources, menuItems) |
| `chatSessions` | Drizzle table definition |
| `chatMessages` | Drizzle table definition |
| `chatActions` | Drizzle table definition |
| `chatAnalytics` | Drizzle table definition |
| `seedChat` | Idempotent seed function (permissions, public endpoints) |

### agent-ui

| Export | Description |
|--------|-------------|
| `ChatWidget` | Embeddable floating chat component (Tailwind) |
| `AgentPlayground` | Full testing interface component (Tailwind) |
| `ConversationView` | Read-only message history component (Tailwind) |
| `useChat` | Wrapper hook around `@ai-sdk/react` useChat |
| `useTenantConfig` | Hook to fetch public tenant configuration |
| `useBusinessHours` | Hook to compute business hours status |
| `useAnonymousSession` | Hook for sessionToken management (localStorage) |

---

## Documentation Index

| File | Contents |
|------|----------|
| [architecture.md](./architecture.md) | Design patterns, message flow diagrams, state machines |
| [module-design.md](./module-design.md) | High/low-level design, dependency graphs, data flow |
| [detailed-requirements.md](./detailed-requirements.md) | Functional requirements with acceptance criteria |
| [use-case-compliance.md](./use-case-compliance.md) | Mapping to platform use cases |
| [api.md](./api.md) | All 9 API endpoints with request/response schemas |
| [database.md](./database.md) | 4 tables with column-level detail and JSONB examples |
| [secure.md](./secure.md) | Security model: anonymous sessions, CORS, CSP, rate limiting |
| [references.md](./references.md) | External references and prior art |
| [UI.md](./UI.md) | Dashboard and widget component specifications |
| [prompts.md](./prompts.md) | Implementation prompt (authoritative spec) |

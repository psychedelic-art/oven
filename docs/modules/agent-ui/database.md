# Agent UI — Database

`@oven/agent-ui` is a pure UI layer. **It owns no database schema.**
Every piece of persistent state the UI displays or mutates belongs to
a different module. This document records every storage-like surface
the package touches so that a DBA searching for "chat widget data"
lands in the right place.

---

## Durable storage (owned elsewhere)

| Data | Owner | Tables | UI surface |
|---|---|---|---|
| Chat sessions, messages, commands, feedback | `module-chat` | `chat_sessions`, `chat_messages`, `chat_commands`, `chat_feedback` | `<SessionSidebar>`, `<MessageList>`, `<MessageInput>`, `<MessageFeedback>` |
| Agents | `module-agent-core` | `agents`, `agent_exposed_params` | `<TargetSelector>` (agent tab), `<ParamsPanel>` |
| Workflow agents + executions | `module-workflow-agents` | `agent_workflows`, `agent_workflow_executions` | `<TargetSelector>` (workflow tab), `<ExecutionInspector>`, `<TracePanel>` |
| Tenants (public config) | `module-tenants` | `tenants`, `tenant_config_keys` | `useTenantConfig`, `applyTheme` |
| Module config cascade | `module-config` | `module_config_values` | `usePlaygroundCommands` (reads `WIDGET_*` keys) |
| File uploads | `module-files` | `files` | `<MessageInput>` attachment path |

Changing any of these schemas is the owning module's responsibility.
This package only renders what the API returns.

---

## Browser-side state (owned by this package)

`@oven/agent-ui` persists a small amount of state locally via
`localStorage`. None of it is authoritative — all of it is
re-derivable from the backend or safely discardable.

### `localStorage` keys

| Key | Writer | Shape | Purpose |
|---|---|---|---|
| `oven.agent-ui.session.<tenantSlug>` | `useSessionPersistence` | `{ sessionToken, createdAt, lastValidatedAt, ttlHours }` | Anonymous session continuity across page reloads. Validated against the backend on restore. |
| `oven.agent-ui.panels.<surface>` | `useResizablePanels` | `{ left: number, right: number }` (percentages) | Persist resizable panel sizes per surface (playground, portal chat). |
| `oven.agent-ui.theme.<tenantSlug>` | `applyTheme` | `{ preset, overrides }` | Remember the user's last theme choice. Seeded from `WIDGET_PRIMARY_COLOR` etc. |
| `oven.agent-ui.sidebar.pinned.<userId?>` | `<SessionSidebar>` | `Record<sessionId, true>` | Which sessions the user has pinned (mirrors server state, displayed optimistically before `PATCH` responds). |

### Quota handling

`useSessionPersistence` catches `QuotaExceededError` from
`localStorage.setItem` and falls back to an in-memory `Map`. The
widget keeps working but loses session continuity on page reload.
This is the only place the package performs internal error handling.

### TTL and expiry

Every `localStorage` entry written by the package includes a
`createdAt` epoch-ms timestamp. Read sites compare against the
resolved `WIDGET_SESSION_TTL_HOURS` (from config cascade, default 24)
and discard entries that are past their TTL.

### Privacy

No PII is written to `localStorage`. The `sessionToken` is an opaque
server-issued identifier. Message bodies, user names, emails, and
contact details are never serialised to local storage — they live in
memory only and are refetched on reload.

---

## In-memory caches

`useTenantConfig` keeps a per-`tenantSlug` in-memory cache for the
lifetime of the component tree. It does **not** persist — every
page load fetches fresh config.

`useDualStateMessages` uses React Query under the hood; cache
invalidation on `useChat.onFinish` moves real-time messages into
history. React Query's default 5-minute `staleTime` is overridden
for chat history to `Infinity` because the backend owns the source
of truth and invalidation is explicit on mutation.

---

## Tests

No schema → no migration tests. The state-machine tests in
`useSessionPersistence.test.ts` cover the `localStorage` paths
(happy, expired, TTL rollover, quota-exceeded fallback).

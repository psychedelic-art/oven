# Agent UI — References

External libraries, patterns, and prior art that inform the design
of `@oven/agent-ui`. When adding a new dependency, extend this
document in the same commit.

---

## Runtime dependencies

| Package | Version | Why |
|---|---|---|
| `react` | `>=18.0.0 || >=19.0.0` | Peer. Consumer brings React. |
| `react-dom` | `>=18.0.0 || >=19.0.0` | Peer. Consumer brings React DOM. |
| `@oven/oven-ui` | workspace | `cn()` utility, lucide-react icon re-exports, base primitives. |
| `react-markdown` | `^9.0.0` | Markdown rendering in `<MessageBubble>` with syntax highlighting. |

Dev / test dependencies:

| Package | Version | Why |
|---|---|---|
| `vitest` | `^3.0.0` | Test runner for every `*.test.ts(x)`. |
| `@testing-library/react` | `^16.0.0` | Component rendering tests. |
| `@testing-library/jest-dom` | `^6.0.0` | Matcher extensions (`toBeInTheDocument`, etc.). |
| `jsdom` | `^25.0.0` | DOM environment for node-side tests. |
| `@types/react` | `^19.0.0` | React type defs. |
| `@types/react-dom` | `^19.0.0` | React DOM type defs. |
| `typescript` | `^5.0.0` | Type system. |

Notably **not** depended on:

- `@mui/*` — banned per R1.1. Dashboard wraps.
- `react-router-dom` — banned. Dashboard owns routing.
- `@ai-sdk/react` — consumer brings it (via `useChat`'s host
  binding). Listed as consumer peer, not as a package dep, so the
  standalone widget bundle can omit it when not needed.
- `clsx` / `classnames` — banned. Use `cn()` from `@oven/oven-ui`.

---

## Sibling packages

| Package | Relationship |
|---|---|
| `packages/oven-ui/` | Base UI primitives + `cn()` utility. Used throughout. |
| `packages/form-editor/` | Same editor-package pattern. Reference for structure. |
| `packages/workflow-editor/` | Same editor-package pattern + similar 3-panel layout reference for `<UnifiedAIPlayground>`. |
| `packages/map-editor/` | Same editor-package pattern. |

---

## Consumed modules (backend)

| Module | API surface used | Doc |
|---|---|---|
| `module-chat` | sessions, messages, commands, feedback, export | [`../chat/api.md`](../chat/api.md) |
| `module-tenants` | public tenant config | [`../tenants/api.md`](../tenants/api.md) |
| `module-agent-core` | agent list | [`../agent-core/api.md`](../agent-core/api.md) |
| `module-workflow-agents` | workflow list + execution detail | [`../workflow-agents/api.md`](../workflow-agents/api.md) |
| `module-files` | file upload | [`../files/api.md`](../files/api.md) |
| `module-config` | widget config cascade | [`../config/api.md`](../config/api.md) |

---

## Patterns inherited

### Newsan chat primitives

The `<MessageList>`, `<MessageInput>`, `<CommandPalette>`,
`useDualStateMessages`, `useChatScroll`, and `useChat` primitives
are inherited from the Newsan enterprise chat lineage. Key
patterns:

- **Dual-state messages** — separate real-time vs history state,
  merge on render. Documented in `architecture.md` §"Data flow".
- **Session pinning + sidebar** — `<SessionSidebar>` layout with
  pin indicator, search, preview, message count badge.
- **Slash-command palette** — fuzzy search, arrow nav, Tab
  complete, Esc to dismiss, parameter hints.
- **Resizable layout** — `react-resizable-panels` with
  per-surface persistence. Not brought in as a hard dep yet;
  deferred to sprint-01.

### Claude Code input conventions

The auto-growing textarea (1–6 rows), character counter at 80%,
and the Enter-to-submit / Shift+Enter-for-newline convention are
inherited from Claude Code's input patterns.

### Anthropic SDK for LLM behaviour (consumer side)

Consumers of `useChat` typically back the stream with
`@anthropic-ai/sdk` or the Vercel AI SDK (`@ai-sdk/anthropic`,
`@ai-sdk/openai`). The widget does not care which — it speaks the
OVEN `module-chat` REST envelope, and the backend module is the
LLM boundary.

---

## Prior art

- **Intercom / Drift widgets** — inspiration for the
  floating-bubble embed, anonymous session token, and the
  business-hours welcome split.
- **Vercel AI Playground** — inspiration for the 3-panel layout
  (target / chat / inspector) of `<UnifiedAIPlayground>`.
- **LangChain LangGraph Studio** — inspiration for the
  `<TracePanel>` timeline view of workflow executions.
- **Linear's keyboard-first UX** — inspiration for command
  palette keyboard navigation.

---

## Tooling

- **Vite** — library + standalone widget build.
- **Vitest** — test runner, colocated `__tests__/` folder.
- **pnpm workspace** — this package is a workspace dep under
  `@oven/agent-ui`.
- **TypeScript 5.x** — `import type` enforced on type-only
  imports.

---

## Further reading

- `docs/modules/16-agent-ui.md` — full spec.
- `docs/modules/chat/UI.md` — upstream API surface.
- `docs/modules/chat/newsan-patterns.md` — reusable patterns
  from the Newsan chat lineage (if present).
- `docs/modules/agent-core/UI.md` — agent selector contract.
- `docs/modules/tenants/api.md` — tenant public endpoint contract.
- `CLAUDE.md` — project-wide styling and type-import rules.

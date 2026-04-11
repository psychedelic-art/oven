# Agent UI — Module Design

This file answers "why is the code laid out the way it is?" for
`@oven/agent-ui`. If you are about to restructure the package,
read this first and check whether your change violates an
explicit invariant.

---

## Package type

`@oven/agent-ui` is an **editor package**, not a platform module.
It has no `ModuleDefinition`, no schema, no API handlers, no seed.
Registration in `apps/dashboard/src/lib/modules.ts` is **not
required** and would be incorrect — the dashboard simply imports
components.

The closest siblings are `packages/form-editor/`,
`packages/workflow-editor/`, `packages/map-editor/`. All four
follow the same rules: pure UI, importable, no platform lifecycle.

## Hard invariants

These are the rules that make the package work. Any PR that breaks
one of them should be sent back.

1. **Zero MUI inside the package.** The dashboard is the only place
   MUI and agent-ui meet, and they meet through a ~40-line shell
   that wraps `<UnifiedAIPlayground>`. If you need an icon in
   agent-ui, use `lucide-react` via `@oven/oven-ui`, not
   `@mui/icons-material`.
2. **Tailwind via `cn()`.** All className composition goes through
   `cn()` from `@oven/oven-ui`. This guarantees class merging and
   allows consumers to append their own classes via the `className`
   prop.
3. **No inline `style={}`.** The only exception is the
   `--oven-widget-*` custom properties set by `applyTheme` from a
   runtime value. Every other style goes through Tailwind utility
   classes.
4. **`import type` for types.** TypeScript's `import type` keeps
   runtime imports and type imports clearly separated, which matters
   for the standalone widget bundle where dead-code elimination
   trims every type-only edge.
5. **No network code outside `hooks/`.** Components consume data
   through hooks. `fetch()` / `EventSource` / `XMLHttpRequest`
   appear only inside `hooks/` files. This is what lets
   `vitest` + `jsdom` test components without a live backend.
6. **Error handling only at boundaries.** Per `CLAUDE.md`, internal
   helpers throw; only `useChat`, `useTenantConfig`,
   `useSessionPersistence`, and `src/entry/widget.ts` catch.

## Import rules (strict layering)

```
widget/     -> shared/, layout/, themes/, hooks/, types
playground/ -> shared/, layout/, themes/, hooks/, types
shared/     -> themes/, types
layout/     -> themes/, types
hooks/      -> types
themes/     -> types
```

`hooks/` must stay leaf-level so it can be reused from every other
folder without risking a cycle. `shared/` must stay leaf-level with
respect to `widget/` and `playground/` so a widget-only surface
does not drag playground-only code into the bundle.

## Message state architecture

The dual-state (real-time + history) approach is a deliberate
choice inherited from Newsan-lineage chat primitives. The
alternative — a single flat list with optimistic updates — fails
when history pagination crosses the boundary of a still-streaming
message, because the streaming frame is still changing while the
history frame is immutable. Keeping the two streams separated and
merging them at render time avoids the entire class of "message
jumps when history loads" bugs.

`useDualStateMessages` owns the merge. `useChat` owns the
real-time stream. React Query owns the history cache with
`staleTime: Infinity` because the backend is the source of truth
and invalidation is explicit on mutation.

## Session persistence state machine

`useSessionPersistence` models `localStorage` as a finite state
machine:

```
no-storage --createSession--> fresh
fresh --age > ttl--> expired
expired --validate success--> fresh
expired --validate fail--> discarded
discarded --createSession--> fresh
```

The machine is deliberately exhaustive: every transition is tested
in `useSessionPersistence.test.ts`. The `validate` step uses an
exponential-backoff retry (500ms × 2^n, max 5 attempts) so a
transient network glitch does not lose the user's session.

Quota-exceeded writes fall through to an in-memory `Map`. The
widget keeps working; reload loses continuity. This is the only
place in the package where error handling is allowed to swallow
and substitute — everywhere else, we surface the error via
`<ChatErrorCard>`.

## Command palette architecture

Commands live in two places:

1. **Local six** (`usePlaygroundCommands` hard-codes them):
   `/clear`, `/help`, `/status`, `/model`, `/temperature`,
   `/export`. These work offline and without backend routing.
2. **Backend catalog** (`GET /api/chat-commands`): everything else.

The hook merges them at mount. `<MessageInput>` calls
`useCommandPalette` on every keystroke to decide whether to open
the palette. When the user selects a command:

- Local commands run synchronously in the playground.
- Backend commands fall through to `useChat.sendMessage` in agent
  mode or the workflow execute path in workflow mode.
- Workflow-blocked commands (`agent, tools, skill, mcp, pin,
  feedback, search, reset`) short-circuit with a system message.

## Theming approach

Themes are a function of CSS custom properties, not Tailwind
classes. The rationale: a tenant can override any colour at
runtime via `WIDGET_*` config keys, and CSS custom properties
propagate through the cascade naturally. Tailwind classes can
reference custom properties (`bg-[var(--oven-widget-primary)]`),
so consumers still get the full Tailwind utility vocabulary
without sacrificing runtime theming.

`applyTheme(preset)` writes every documented custom property
(see `UI.md` for the list) in a single pass. It's idempotent —
reapplying clears the previous mount's overrides.

## Test philosophy

- **Pure derivations** (filters, state machines, formatters) are
  unit-tested aggressively. These tests catch 90% of the regressions
  that would otherwise show up in the UI.
- **Component contracts** are tested only for the shell that owns
  the wiring (`<UnifiedAIPlayground>`, `<ChatHeader>`). Leaf
  components rely on their props being typed.
- **No integration tests** against a live backend. The package is
  tested in isolation; backend contracts are enforced through TS
  types synced to `api.md`.

## What's explicitly out of scope

- **Form rendering.** Forms belong in `packages/form-editor/`.
- **Map / layout editors.** Map editor belongs in
  `packages/map-editor/`.
- **Admin-shell chrome.** Sidebar, topbar, React Admin wiring —
  that's `apps/dashboard`.
- **Agent definitions.** Agent CRUD, tool catalog, eval runner —
  that's `module-agent-core` / `module-ai` / `module-workflow-agents`.
- **Knowledge-base UI.** The KB search UI belongs to
  `module-knowledge-base`.

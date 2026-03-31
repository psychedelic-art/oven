# References: module-chat + agent-ui

> External documentation, specifications, and architectural references.

---

## 1. Vercel AI SDK

### useChat Hook

The primary client-side integration for streaming chat. Used by both the ChatWidget and AgentPlayground.

- **Documentation**: https://sdk.vercel.ai/docs/reference/ai-sdk-ui/use-chat
- **Package**: `@ai-sdk/react`
- **Key features used**:
  - `messages` array management (append, replace)
  - SSE streaming consumption with automatic message assembly
  - `status` lifecycle: `submitted` -> `streaming` -> `ready`
  - `stop()` for aborting in-progress generation
  - `experimental_throttle` for render batching during fast token streams
  - `UIMessage` type with `parts` array (text, tool-invocation, file)

### @ai-sdk/react Package

- **Documentation**: https://sdk.vercel.ai/docs/reference/ai-sdk-ui
- **Hooks available**: `useChat`, `useCompletion`, `useObject`
- **Transport**: `DefaultChatTransport` for configuring API endpoint and headers
- **Version compatibility**: module-chat uses `@ai-sdk/react ^1.0.0`

---

## 2. Server-Sent Events (SSE)

### Specification

- **W3C Spec**: https://html.spec.whatwg.org/multipage/server-sent-events.html
- **MDN Reference**: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events

### Format Used by module-chat

```
event: token
data: {"text": "Hello"}

event: toolCallStart
data: {"toolCallId": "tc_1", "toolName": "kb.search"}

event: done
data: {"messageId": 42}

```

Key protocol details:
- Lines starting with `event:` set the event type
- Lines starting with `data:` carry the JSON payload
- Empty line terminates each event
- Connection uses `Content-Type: text/event-stream`
- Client reconnection is handled by the `useChat` hook, not by the SSE retry mechanism

---

## 3. Shadow DOM

### Web Components Specification

- **MDN Guide**: https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM
- **W3C Spec**: https://dom.spec.whatwg.org/#shadow-trees

### Usage in agent-ui

The chat widget uses `attachShadow({ mode: 'closed' })` for:
- Style isolation (host page CSS does not affect widget; widget CSS does not leak)
- DOM isolation (host page scripts cannot access widget internals in closed mode)
- Self-contained rendering within a single shadow root

### Considerations

- CSS custom properties (`--oven-widget-*`) penetrate shadow DOM boundaries by design, enabling theming from the host page
- Event listeners on the shadow root use `{ composed: true }` for events that need to bubble across the boundary
- React 19 supports rendering into shadow DOM via `createRoot`

---

## 4. Chat Widget Architecture Patterns

### Prior Art: Commercial Chat Widgets

These products informed the architectural decisions for agent-ui's ChatWidget:

**Intercom Messenger**
- Embeds via `<script>` tag with a single app ID
- Renders in an iframe for full isolation
- Supports both authenticated (user hash) and anonymous visitors
- Quick-reply buttons for guided conversation starts
- Reference: https://www.intercom.com/help/en/articles/170-install-intercom-in-your-product

**Crisp Chat**
- Single `<script>` tag deployment
- Uses shadow DOM (not iframe) for lighter weight
- Theme customization via JavaScript configuration object
- Business hours and away messages
- Reference: https://docs.crisp.chat/guides/chatbox-customization/

**Drift**
- JavaScript-based widget with global configuration object
- Playbooks for automated greeting sequences
- Calendar integration for meeting booking (analogous to AppointmentButton)
- Reference: https://devdocs.drift.com/docs/widget-start

### Design Decisions Influenced by Prior Art

| Decision | Rationale | Prior Art |
|----------|-----------|-----------|
| Shadow DOM over iframe | Lighter weight, CSS custom property theming, no cross-origin complexity | Crisp |
| data-* attributes for config | Simpler than global JS config object, works with `defer` | Intercom (simplified) |
| Anonymous sessions with localStorage token | No cookies, no cross-site tracking, simple resume | All three |
| Quick-reply buttons | Reduces first-message friction, guides users to common intents | Intercom, Drift |
| Business hours awareness | Sets user expectations for response time | Crisp, Intercom |

---

## 5. React Admin Patterns

### Custom Pages

The ChatInterface and AgentPlayground are registered as custom pages in React Admin, not as standard CRUD resources.

- **Documentation**: https://marmelab.com/react-admin/CustomRoutes.html
- **Pattern used**: `customRoutes` in ModuleDefinition, rendered at `/chat` path
- **Layout integration**: Custom pages use React Admin's `<Layout>` wrapper for consistent sidebar/appbar

### Resource Views

ChatSessionList and ChatSessionShow follow standard React Admin resource patterns.

- **List documentation**: https://marmelab.com/react-admin/List.html
- **Show documentation**: https://marmelab.com/react-admin/Show.html
- **Patterns used**: `<Datagrid>`, `<ReferenceField>`, `<FunctionField>`, `<FilterList>`, `useTenantContext` for tenant filtering

---

## 6. Vite Library Build

### Configuration Reference

- **Documentation**: https://vite.dev/guide/build.html#library-mode
- **Package**: `vite ^5.0.0`

### Two Build Configurations

**Library build** (`vite.config.ts`):
- Entry: `src/index.ts`
- Formats: ESM + CJS
- Externals: `react`, `react-dom`, `@ai-sdk/react`
- Output: `dist/index.mjs`, `dist/index.cjs`, `dist/index.d.ts`

**Widget build** (`vite.config.widget.ts`):
- Entry: `src/widget/mount.tsx`
- Format: IIFE (single self-contained file)
- Externals: none (everything bundled)
- Output: `dist/chat-widget.js`
- CSS: inlined into the JS bundle (injected into shadow DOM at runtime)

---

## 7. CSS Custom Properties for Theming

### Specification

- **MDN Reference**: https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties
- **W3C Spec**: https://www.w3.org/TR/css-variables-1/

### Usage in agent-ui

CSS custom properties are the theming mechanism for the chat widget. They were chosen because:
- They penetrate shadow DOM boundaries (unlike regular CSS)
- They can be set from JavaScript (runtime theme application from tenant config)
- They cascade naturally (component-level overrides work without specificity fights)
- They are supported in all modern browsers (ES2020 target)

### Widget Custom Properties

```css
--oven-widget-primary
--oven-widget-primary-contrast
--oven-widget-surface
--oven-widget-background
--oven-widget-text
--oven-widget-text-secondary
--oven-widget-border-radius
--oven-widget-font-family
--oven-widget-bubble-user
--oven-widget-bubble-assistant
--oven-widget-max-width
--oven-widget-max-height
```

---

## 8. Accessibility Standards

### WCAG for Chat Interfaces

- **WCAG 2.1 Guidelines**: https://www.w3.org/TR/WCAG21/
- **WAI-ARIA Chat Pattern**: https://www.w3.org/WAI/ARIA/apg/patterns/

### Relevant Success Criteria

| Criterion | Level | Application |
|-----------|-------|-------------|
| 1.3.1 Info and Relationships | A | Chat messages use semantic roles (`role="log"`, `role="listitem"`) |
| 1.4.3 Contrast (Minimum) | AA | Widget theme colors must meet 4.5:1 contrast ratio |
| 2.1.1 Keyboard | A | All widget interactions accessible via keyboard |
| 2.4.3 Focus Order | A | Tab order follows conversation flow (input -> send -> messages) |
| 4.1.2 Name, Role, Value | A | Interactive elements have accessible names |
| 4.1.3 Status Messages | AA | New messages announced to screen readers via `aria-live` |

---

## 9. Markdown Rendering and Sanitization

### Libraries

- **marked**: https://marked.js.org/ -- Fast markdown parser
- **DOMPurify**: https://github.com/cure53/DOMPurify -- XSS sanitizer for HTML output
- **Alternative**: `remark` + `rehype-sanitize` for a unified plugin pipeline

### Sanitization Configuration

The widget uses allowlist-based sanitization. Only safe HTML elements and attributes are permitted. All others are stripped. JavaScript URLs and data URIs are blocked.

---

## 10. Related Internal Documentation

| Document | Path | Relevance |
|----------|------|-----------|
| Module Rules | `docs/module-rules.md` | Compliance requirements for module-chat |
| Use Cases | `docs/use-cases.md` | Platform use cases that involve chat |
| Agent UI Spec | `docs/modules/16-agent-ui.md` | Full agent-ui package specification |
| Chat Module Spec | `docs/modules/08-chat.md` | Original module-chat specification |
| Module Config | `docs/modules/20-module-config.md` | Config cascade system used by chat settings |
| Agent Core | `docs/modules/07-agent-core.md` | Agent invocation and tool wrapper |
| Module AI | `docs/modules/06-ai.md` | Streaming infrastructure and guardrails |

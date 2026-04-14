# @oven/agent-ui — Widget Cross-Browser Matrix

The standalone chat widget (`oven-chat-widget.iife.js`) is embedded
via `<script>` tag on tenant pages. Each release must pass the manual
smoke checklist below before publishing the new content-hashed bundle.

The automated gates (`pnpm --filter @oven/agent-ui check:size`) cover
size + security + mount-API regression. Cross-browser behavior is
manual because headless runners produce false positives on Shadow DOM
and storage events.

## Supported matrix

| Browser  | Minimum version | Tested |
|----------|-----------------|--------|
| Chromium | 120             | yes    |
| Firefox  | 115 ESR         | yes    |
| Safari   | 17              | yes    |

Mobile browsers inherit from the parent engine (iOS Safari = Safari,
Chrome Android = Chromium). Edge cases that only appear on mobile
(viewport units, input scroll behavior) are owned by the UX team and
tracked separately.

## Smoke checklist

For each browser, run the minimal HTML test fixture at
`packages/agent-ui/examples/widget-minimal.html` (create if missing)
and verify:

### Boot

- [ ] `<script>` loads without a console error
- [ ] `window.OvenChat.init({...})` mounts the launcher in the
      bottom-right by default
- [ ] `data-tenant`, `data-api`, `data-theme`, `data-position`
      attribute mounts work without JS call
- [ ] `data-shadow="true"` attribute mounts inside Shadow DOM

### Interaction

- [ ] Clicking the launcher opens the chat panel
- [ ] First message send produces a response (backend mocked OK)
- [ ] Streaming tokens appear incrementally (not only on final)
- [ ] Stop button aborts a streaming response mid-flight
- [ ] Session persists across page reload (localStorage 24h TTL)
- [ ] "New chat" button clears realtime messages and creates a new
      session server-side

### Style isolation

- [ ] Widget styles do not leak onto the host page — open the host
      page console and verify no `--oven-*` CSS custom properties are
      set on `document.documentElement`
- [ ] Host page styles do not bleed into the widget — set
      `body { font-family: Comic Sans; background: red; }` on the
      host and verify the widget's chat surface is unaffected (when
      Shadow DOM mount is used)
- [ ] In non-shadow mode, the widget still renders acceptably even
      when host styles conflict

### Theme

- [ ] Each of the 10 theme presets (light, dark, ocean, forest,
      sunset, corporate, minimal, neon, warm, cool) renders without
      contrast regression
- [ ] Bubble colors (`--oven-widget-bubble-user` /
      `--oven-widget-bubble-assistant`) change per preset

### Accessibility (sprint-04 scope, spot-check)

- [ ] Launcher has `aria-label` and is keyboard-reachable (Tab)
- [ ] Chat input field has a label
- [ ] Esc closes the panel when it has focus

## Known engine-specific notes

### Safari

- Shadow DOM: `adoptedStyleSheets` support requires Safari 16.4+.
  We ship a CSS string fallback so 17+ is safe.
- `CSS.registerProperty` is partial; do not rely on it for theme
  transitions.
- `localStorage` eviction is aggressive under Private Browsing; the
  session hook gracefully creates a new session on miss.

### Firefox

- Firefox handles SSE differently from Chromium when the tab is
  backgrounded — the stream may stall. Widget shows the Stop button
  so users can abort and retry.
- `window.OvenChat.destroy()` must remove event listeners
  explicitly; verify no leaks via `performance.memory` after
  destroy+init cycles.

### Chromium

- The most permissive engine; if something works only in Chromium,
  treat it as an un-portable feature and file a bug before shipping.
- Dev Tools "Coverage" tab should show &gt;60% bundle utilization on
  a typical first-open flow; lower means dead code to remove.

## Regression trigger list

A release MUST re-run the full matrix if:

1. `check:size` reports a size delta &gt; 5 kB gzipped vs. the prior release
2. Any file under `packages/agent-ui/src/entry/` changes
3. `react` or `react-dom` peer dep major version changes
4. `@ai-sdk/react` version changes
5. Any change to `ChatWidget`, `WidgetLauncher`, `SessionSidebar`,
   `ConfirmDialog`, or `ChatHeader`

## Owner

- Primary: agent-ui package owner (see git blame on widget.ts)
- Review: UX lead + security lead

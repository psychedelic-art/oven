# Agent UI — Security

`@oven/agent-ui` is a **pure UI package**, but a significant subset
of its code runs inside **untrusted host environments**: tenant
websites that embed `dist/chat-widget.js` via a `<script>` tag. That
makes the security surface larger than a typical internal dashboard
component library. This document enumerates the threats and the
mitigations.

## Threat model

### Actors

1. **Tenant site owner** — Embeds the widget on their site. Trusted
   but non-technical. May inadvertently deploy the widget on an
   XSS-vulnerable page.
2. **Tenant site visitor (end user)** — Anonymous, untrusted.
   Interacts with the widget via chat; no account.
3. **Malicious host page** — Compromised tenant site or a
   typo-squatted domain that loads a tampered `chat-widget.js`.
4. **Malicious end user** — Attempts to abuse slash commands,
   prompt injection, or file uploads.
5. **Network attacker** — On-path between the widget and the OVEN
   API.

### Assets

1. Anonymous `sessionToken` (stored in `localStorage` on the host).
2. Tenant public config (branding, schedule, contact info).
3. Chat messages (in memory only).
4. Tenant's OWN API key and provider config — **NEVER exposed**
   to the widget (owned by `module-ai`, server-side only).

---

## T1 — Host page style / script contamination

**Risk**: A malicious host page injects CSS or script that alters
the widget's behaviour, leaking input or hijacking the submit
button.

**Mitigations**:

- R9.3 — Widget styles are scoped via a CSS class prefix and an
  optional shadow DOM (`data-shadow="true"`). Host CSS cannot
  override scoped selectors without deliberate higher-specificity
  targeting.
- The standalone bundle does not expose any globals on `window`
  beyond `OvenChatWidget` (the mount API). Host scripts cannot
  reach internal state.
- Event handlers use React synthetic events, not raw DOM
  listeners, so host-level `document.addEventListener` cannot
  intercept submit clicks (unless the host is fully
  compromised, in which case the widget is not the root issue).

**Residual risk**: A fully-compromised host can, of course, log
every keystroke. We cannot mitigate this from inside a script the
host loads. The mitigation is the tenant-side CSP
(`script-src 'self' cdn.example.com`).

---

## T2 — XSS via markdown rendering

**Risk**: `<MessageBubble>` renders assistant messages as markdown
via `react-markdown`. A prompt-injection attack that makes the
assistant emit `<script>` or `<img onerror=...>` could execute
arbitrary JavaScript.

**Mitigations**:

- `react-markdown` does not render raw HTML by default. We do NOT
  enable the `rehype-raw` plugin — ever. Adding it to
  `<MessageBubble>` is a security regression.
- Code blocks are rendered via a syntax highlighter that
  text-escapes content.
- Links in assistant messages open with `rel="noreferrer noopener"
  target="_blank"` to prevent tab-napping.
- URL schemes other than `http:`, `https:`, and `mailto:` are
  stripped at render time.

**Test**: add a case in `MessageBubble.test.tsx` (or create it) that
pushes a crafted assistant message containing `<img src=x onerror=...>`
and asserts the DOM does NOT contain an executed handler.

---

## T3 — localStorage poisoning

**Risk**: A host-page script writes a forged `sessionToken` into
`localStorage`, hijacking another visitor's chat session.

**Mitigations**:

- The `sessionToken` is an opaque server-generated identifier.
  Forging one requires guessing a cryptographically random value.
- On restore, `useSessionPersistence` ALWAYS validates the token
  against the backend before using it. An invalid token is
  discarded and a fresh session created.
- Tokens are scoped per-`tenantSlug` (`oven.agent-ui.session.<slug>`),
  so a compromised tenant cannot cross-impersonate sessions from
  another tenant even if the same host runs two widgets.
- No PII or server-side rights are ever attached to the
  `sessionToken`. The anonymous session has exactly one capability:
  continue an existing chat. It cannot read other sessions, cannot
  delete sessions, and cannot escalate to a dashboard user.

---

## T4 — CSRF on backend endpoints

**Risk**: A third-party site tricks the visitor's browser into
posting messages on their behalf.

**Mitigations**:

- All mutating endpoints require the `X-Session-Token` header,
  which must be read from `localStorage` by JavaScript and
  explicitly attached to the request. CSRF attacks cannot read
  cross-origin `localStorage`, so they cannot forge the header.
- The backend enforces the same-origin check on the
  `chat-sessions` endpoint and requires the `X-Session-Token`
  header on every state-changing call.
- File uploads require the same header + a per-tenant CORS
  allowlist enforced by `module-files`.

---

## T5 — Rate limiting and abuse

**Risk**: An attacker spams messages to exhaust the tenant's
quota.

**Mitigations owned by the backend**:

- `module-chat` enforces a per-session message cap
  (`WIDGET_MAX_MESSAGES_PER_SESSION`, default 100).
- `module-subscriptions` tracks usage against the tenant's plan
  quotas and returns 402 when exceeded.
- `module-ai` has rate-limit RPM/TPM per provider.

**Mitigation owned by the widget**:

- Client-side `WIDGET_MAX_CHAR_LIMIT` (default 2000) limits
  per-message input size.
- Disabled states on `<MessageInput>` prevent spamming while a
  message is in flight.
- Optimistic UI does not retry failed sends automatically; the
  user must explicitly click retry on `<ChatErrorCard>`.

---

## T6 — Prompt injection → dangerous slash commands

**Risk**: An attacker crafts an assistant message that tricks the
user into running a destructive slash command.

**Mitigations**:

- The local six (`/clear`, `/help`, `/status`, `/model`,
  `/temperature`, `/export`) are all non-destructive. `/clear`
  only clears the client's real-time buffer — the backend history
  is untouched.
- Assistant messages do NOT interpret `<command>` tags or hidden
  instructions. Slash commands are only recognised when typed by
  the human user into `<MessageInput>`.
- In workflow mode, the locally-blocked set (`agent, tools,
  skill, mcp, pin, feedback, search, reset`) short-circuits so
  a user cannot accidentally trigger agent-mode side effects.

---

## T7 — File upload attacks

**Risk**: A malicious user uploads an executable, a polyglot, or
an over-sized file to exhaust storage or spread malware.

**Mitigations**:

- `WIDGET_ENABLE_FILE_UPLOAD` is **false by default**. Tenants
  must opt in via config.
- Client-side `accept=` restricts the file picker.
- Client-side size check before upload.
- Server-side enforcement is owned by `module-files`
  (`docs/modules/files/secure.md`). The widget trusts the server
  to reject disallowed types — it does not try to scan locally.

---

## T8 — Session fixation via query params

**Risk**: A phishing link pre-sets a known `sessionToken` via a
URL parameter, then steals the user's conversation.

**Mitigation**: The widget never reads `sessionToken` from URL
query params. It only reads from `localStorage` (via
`useSessionPersistence`) or creates fresh via
`POST /api/chat-sessions`. Any `sessionToken` in the URL is
ignored.

---

## Security invariants (enforced by review)

1. No `rehype-raw` in `<MessageBubble>`. Ever.
2. No `dangerouslySetInnerHTML` anywhere in the package.
3. No `eval`, no `new Function`, no `document.write`.
4. Every `fetch` call attaches the `X-Session-Token` header.
5. No secrets or API keys are passed through the widget —
   everything goes through `module-chat` / `module-ai`
   server-side.
6. Every `localStorage` read is TTL-checked and validated against
   the backend on restore.
7. Links in assistant messages use `rel="noreferrer noopener"`
   and `target="_blank"`.
8. URL schemes are whitelisted (`http:`, `https:`, `mailto:`).

## CSP guidance for tenant sites

Recommended CSP for a tenant embedding `chat-widget.js`:

```
script-src 'self' https://cdn.example.com;
connect-src 'self' https://api.example.com;
img-src 'self' data: https://*.example.com;
style-src 'self' 'unsafe-inline';   # scoped widget styles
frame-ancestors 'none';
```

`'unsafe-inline'` for `style-src` is required for the
runtime-applied `--oven-widget-*` CSS custom properties. The team
is tracking a proposal to move these to a `<style>` tag with a
`nonce` so `'unsafe-inline'` can be dropped.

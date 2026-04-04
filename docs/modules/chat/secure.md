# Security: module-chat + agent-ui

> Security model covering anonymous sessions, CORS, CSP, rate limiting, and content safety.

---

## 1. Anonymous Session Security

### Token Generation

Anonymous sessions are identified by a `sessionToken` -- a cryptographically random 128-character hex string generated server-side:

```typescript
import { randomBytes } from 'crypto';
const sessionToken = randomBytes(64).toString('hex'); // 128 hex chars
```

**Properties of the token**:
- Generated server-side only (never client-generated)
- 128 hex characters = 512 bits of entropy (computationally infeasible to brute force)
- Stored in the `chat_sessions.session_token` column
- Returned to the client in the session creation response body
- Client stores in `localStorage` under the key `oven-chat-{tenantSlug}`

### Token Validation

Every request from an anonymous session must include the `X-Session-Token` header. Validation is strict:

1. The header value must exactly match the `session_token` column for the requested session ID
2. If the session has `user_id != NULL`, the token header is ignored and standard auth is required
3. If the token does not match, return HTTP 403 (not 404, to prevent session ID enumeration)
4. Token comparison uses constant-time comparison (`crypto.timingSafeEqual`) to prevent timing attacks

### Session Isolation

Anonymous users are restricted to single-session access:
- They cannot list sessions (`GET /api/chat-sessions` requires auth)
- They can only access the specific session matching their token
- They cannot view other sessions even if they guess the ID (token mismatch returns 403)
- They can send messages and read messages only for their session

### Token Lifecycle

- **Created**: When an anonymous session is created
- **Active**: Valid for all requests while the session status is `active` or `escalated`
- **Expired**: When the session is closed or archived, the token becomes invalid. Requests return HTTP 410 Gone.
- **Not rotated**: The token does not rotate during a session. This simplifies the client implementation (no token refresh needed). The session timeout (`SESSION_TIMEOUT_MINUTES`) limits the exposure window.

---

## 2. Widget CORS Configuration

The chat widget makes cross-origin requests from external websites to the OVEN API. CORS must be configured to allow this while preventing unauthorized origins.

### Per-Tenant Allowed Origins

Each tenant can configure allowed origins for their widget via module-config:

```
Config key: WIDGET_ALLOWED_ORIGINS
Type: string (comma-separated)
Example: "https://clinica-xyz.com,https://www.clinica-xyz.com,https://staging.clinica-xyz.com"
Default: "" (no external origins allowed; only same-origin requests)
```

### CORS Headers

For requests from the widget (identified by the `Origin` header):

```
Access-Control-Allow-Origin: https://clinica-xyz.com  (matched from allowed list)
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-Session-Token
Access-Control-Max-Age: 86400
```

If the `Origin` header does not match any allowed origin for the tenant, the request is rejected with no CORS headers (the browser will block the response).

### Endpoint Scope

CORS headers are only set on the public chat endpoints:
- `POST /api/chat-sessions` (anonymous creation)
- `GET /api/chat-sessions/[id]` (with session token)
- `GET /api/chat-sessions/[id]/messages`
- `POST /api/chat-sessions/[id]/messages` (anonymous messaging)

Dashboard-only endpoints do not set CORS headers.

---

## 3. Shadow DOM Isolation

The widget renders inside a shadow DOM to prevent style conflicts in both directions.

### Style Containment

- **Inbound protection**: Host page CSS cannot affect widget elements. Selectors like `* { font-family: ... }` or `div { margin: ... }` do not penetrate the shadow boundary.
- **Outbound protection**: Widget CSS (Tailwind classes, custom properties) cannot leak into the host page. The widget's styles are scoped to its shadow root.

### Implementation

```typescript
const container = document.createElement('div');
container.id = 'oven-chat-widget-root';
document.body.appendChild(container);

const shadowRoot = container.attachShadow({ mode: 'closed' });
// 'closed' mode prevents host page JavaScript from accessing shadowRoot
// This protects widget internals from malicious host page scripts

const styleSheet = document.createElement('style');
styleSheet.textContent = widgetCSS; // Tailwind + custom properties
shadowRoot.appendChild(styleSheet);

const appRoot = document.createElement('div');
shadowRoot.appendChild(appRoot);
ReactDOM.createRoot(appRoot).render(<ChatWidget {...props} />);
```

### Closed vs Open Shadow DOM

The widget uses `mode: 'closed'` for security:
- Host page scripts cannot call `container.shadowRoot` (returns null)
- Prevents DOM inspection/modification by potentially malicious host page code
- The widget maintains its own internal reference to the shadow root

---

## 4. Rate Limiting

Message sending is rate-limited to prevent abuse, especially from anonymous sessions.

### Per-Session Rate Limit

| Limit | Value | Configurable |
|-------|-------|-------------|
| Messages per minute | 10 | Via module-config `RATE_LIMIT_PER_SESSION_PER_MINUTE` |
| Messages per session total | 100 | Via module-config `MAX_MESSAGES_PER_SESSION` |

When the per-minute limit is exceeded, return:
```
HTTP 429 Too Many Requests
Retry-After: 30
```

When the per-session total is exceeded, return:
```
HTTP 429 Too Many Requests
{ "code": "SESSION_MESSAGE_LIMIT", "message": "This session has reached its message limit." }
```

### Per-IP Rate Limit

For anonymous sessions, an additional IP-based rate limit prevents a single client from creating excessive sessions or sending bulk messages across sessions:

| Limit | Value |
|-------|-------|
| Session creation per hour per IP | 10 |
| Messages per hour per IP | 60 |

IP rate limiting uses the `X-Forwarded-For` header (set by the CDN/reverse proxy) or the direct connection IP.

### Implementation

Rate limit counters are stored in-memory (for single-instance deployments) or in a shared cache (Redis, when available). The counters use sliding window algorithm for accuracy.

---

## 5. Content Moderation

All messages pass through the content moderation pipeline provided by module-ai's guardrails system.

### Inbound Moderation (User Messages)

Before a user message is forwarded to the agent:
1. The message text is checked against the guardrails configuration
2. Messages flagged as harmful, abusive, or containing prohibited content are rejected
3. Rejection returns HTTP 400 with a generic message (does not reveal the specific flag)

### Outbound Moderation (Agent Responses)

Agent responses are checked before delivery to the user:
1. The streaming adapter monitors the response text
2. If the guardrails detect a problematic response mid-stream, the stream is terminated with an error event
3. The partial response is not persisted; a system message is recorded instead

### Configuration

Content moderation rules are configured at the platform level via module-ai's guardrails. Tenants can request custom moderation profiles through module-config overrides.

---

## 6. No PII in Anonymous Sessions

Anonymous sessions are designed to minimize personal data exposure:

- **No user identity**: `user_id` is NULL. No name, email, or account is linked.
- **No IP storage**: The visitor's IP address is not persisted in the session or message records. It is only used transiently for rate limiting.
- **Metadata scope**: The `metadata` field stores `userAgent` and `referrer` for analytics, but these are not PII under most jurisdictions. Tenants can disable this via config.
- **Message content**: User-entered messages may contain PII (names, phone numbers). This is the user's choice. The system does not extract, index, or expose PII from message content.
- **No cookies**: The widget uses `localStorage` for the session token, not cookies. No cross-site tracking.

### Data Retention

Anonymous session data follows the platform's data retention policy:
- Active sessions: retained indefinitely while active
- Closed sessions: retained for the configured retention period (default: 90 days)
- Archived sessions: eligible for permanent deletion after retention period

Tenants can request shorter retention periods for compliance (GDPR, HIPAA).

---

## 7. Content Security Policy (CSP) Considerations

When the widget is embedded on external sites, the host page's CSP must allow:

### Required CSP Directives

```
script-src: https://cdn.oven.app (or the widget bundle's CDN origin)
connect-src: https://api.oven.app (or the OVEN API origin)
style-src: 'unsafe-inline' (for shadow DOM injected styles)
```

### Widget Documentation

The widget embedding documentation should include CSP guidance for site administrators. The widget bundle URL and API URL are provided during setup.

### Self-Hosted Alternative

For tenants with strict CSP policies that cannot add external origins, the widget bundle can be self-hosted on the tenant's domain. The bundle still communicates with the OVEN API (requires `connect-src` allowance) but the script itself loads from a same-origin URL.

---

## 8. XSS Prevention in Message Rendering

### Markdown Sanitization

Agent responses may contain markdown formatting (bold, links, lists, code blocks). The widget renders markdown using a sanitization pipeline:

1. Raw markdown text from the agent
2. Parse with a markdown parser (e.g., `marked` or `remark`)
3. Sanitize HTML output with allowlist-based sanitizer (e.g., `DOMPurify` or `sanitize-html`)
4. Allowed tags: `p`, `strong`, `em`, `a`, `ul`, `ol`, `li`, `code`, `pre`, `br`, `h1`-`h6`
5. Allowed attributes: `href` (on `a` tags only, must be `http://` or `https://`), `target="_blank"`, `rel="noopener noreferrer"`
6. All other tags and attributes are stripped
7. JavaScript URLs (`javascript:`, `data:`, `vbscript:`) are blocked

### User Input

User messages are rendered as plain text. HTML tags in user input are escaped, not parsed. This prevents self-XSS through the chat input.

### Tool Call Display

Tool call inputs and outputs are rendered as formatted JSON with syntax highlighting. JSON values are escaped before rendering. No HTML interpretation is performed on tool call data.

---

## 9. API Authentication Summary

| Endpoint | Auth Required | Anonymous Allowed | Public |
|----------|:---:|:---:|:---:|
| `GET /api/chat-sessions` | Yes | No | No |
| `POST /api/chat-sessions` | Optional | Yes (creates token) | Yes |
| `GET /api/chat-sessions/[id]` | Optional | Yes (with token) | Yes |
| `DELETE /api/chat-sessions/[id]` | Yes | No | No |
| `GET /api/chat-sessions/[id]/messages` | Optional | Yes (with token) | Yes |
| `POST /api/chat-sessions/[id]/messages` | Optional | Yes (with token) | Yes |
| `GET /api/chat-sessions/[id]/actions` | Yes | No | No |
| `GET /api/chat-analytics` | Yes | No | No |
| `GET /api/chat-analytics/summary` | Yes | No | No |

Public endpoints are registered in `api_endpoint_permissions` with `is_public = true`. The auth middleware skips JWT validation for these routes but still processes the `X-Session-Token` header for anonymous session validation.

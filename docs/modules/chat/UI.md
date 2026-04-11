# UI Specifications: module-chat + agent-ui

> Dashboard components (MUI + sx prop) and widget/playground components (Tailwind + cn()).

---

## Part 1: Dashboard Components (MUI + sx prop)

Location: `apps/dashboard/src/components/chat/`

These components follow React Admin conventions and use MUI 7 with the `sx` prop exclusively. No `style={}`, no `className=` with custom CSS, no `styled()`.

---

### ChatSessionList

A React Admin `<List>` resource view for browsing chat sessions.

**Columns**:

| Column | Component | Description |
|--------|-----------|-------------|
| Tenant | `<ReferenceField source="tenantId" reference="tenants">` | Tenant name. Hidden when global tenant filter is active. |
| User | `<FunctionField>` | Shows username for auth sessions, "Anonymous" with a gray chip for anonymous sessions. |
| Agent | `<ReferenceField source="agentId" reference="agents">` | Backing agent name. |
| Title | `<TextField source="title">` | Session title (auto-generated or user-set). Truncated to 50 chars. |
| Channel | `<ChipField source="channel">` | Colored chip: web=blue, widget=green, portal=purple, whatsapp=teal. |
| Messages | `<NumberField source="messageCount">` | Joined from chat_analytics. |
| Status | `<FunctionField>` | Status badge with colors: active=green, escalated=orange, closed=gray, archived=red. |
| Created | `<DateField source="createdAt" showTime>` | Relative time format. |

**Filters**:

```tsx
<FilterList label="Status">
  <FilterListItem label="Active" value={{ status: 'active' }} />
  <FilterListItem label="Escalated" value={{ status: 'escalated' }} />
  <FilterListItem label="Closed" value={{ status: 'closed' }} />
</FilterList>

<FilterList label="Channel">
  <FilterListItem label="Web" value={{ channel: 'web' }} />
  <FilterListItem label="Widget" value={{ channel: 'widget' }} />
  <FilterListItem label="Portal" value={{ channel: 'portal' }} />
</FilterList>
```

**Tenant filtering**: Uses `useTenantContext()` to auto-filter by active tenant. When no tenant is selected, shows all sessions with the Tenant column visible.

**Bulk actions**: Archive selected sessions (sets status to 'archived').

---

### ChatSessionShow

Detail view for a single chat session. Renders the conversation in a chat bubble layout with metadata.

**Layout**:

```
+----------------------------------------------------------+
| Session #42 - "Question about services"                   |
| Agent: Dental Assistant | Channel: widget | Status: active|
| Duration: 15 min | Messages: 12 | Tokens: 3,450          |
+----------------------------------------------------------+
|                                                          |
|   [User bubble - right aligned, primary color]           |
|   "What services do you offer?"                          |
|   10:31 AM                                               |
|                                                          |
|   [Tool call card - centered, outlined]                  |
|   kb.searchEntries({ query: "services" }) - 45ms         |
|                                                          |
|   [Assistant bubble - left aligned, surface color]       |
|   "We offer the following dental services:..."           |
|   10:31 AM | 245 tokens | gpt-4o-mini                   |
|                                                          |
+----------------------------------------------------------+
| Context: { referencedEntities: [...] }                   |
| Metadata: { userAgent: "...", referrer: "..." }          |
+----------------------------------------------------------+
```

**MUI components used**:
- `<Card>` with `sx={{ p: 3 }}` for the session header
- `<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>` for the message list
- `<Paper>` with `sx={{ p: 2, maxWidth: '70%', alignSelf: 'flex-end' }}` for user bubbles
- `<Paper>` with `sx={{ p: 2, maxWidth: '70%', alignSelf: 'flex-start', bgcolor: 'background.paper' }}` for assistant bubbles
- `<Accordion>` for collapsible tool call cards
- `<Chip>` for status and channel badges
- `<Typography variant="caption" color="text.secondary">` for timestamps and metadata

---

### ChatInterface

Full-page custom chat experience. Registered as a custom route at `/chat`.

**Layout**:

```
+------------------+----------------------------------------+
| Session Sidebar  |  Main Conversation Area                |
|                  |                                        |
| [New Session]    |  Agent: [Dropdown selector]            |
|                  |                                        |
| > Session 1      |  +----------------------------------+ |
|   Session 2      |  | Message bubbles...               | |
|   Session 3      |  |                                  | |
|   ...            |  |                                  | |
|                  |  |                                  | |
|                  |  +----------------------------------+ |
|                  |  [Text input] [Send] [Attach]         |
+------------------+----------------------------------------+
```

**Session Sidebar** (`sx={{ width: 280, borderRight: 1, borderColor: 'divider' }}`):
- "New Session" button at the top
- Session list with title, last message preview, relative timestamp
- Active session highlighted with `bgcolor: 'action.selected'`
- Click to switch sessions
- Scroll with virtualization for long lists

**Main Area**:
- Agent selector dropdown at the top (uses `<ReferenceInput>` for agent list)
- Scrollable message area (uses `<AgentPlayground>` or `<ConversationView>` from agent-ui, wrapped in MUI layout)
- Input bar at the bottom with text field, send button, and optional file attachment

**Responsive behavior**:
- On `xs`/`sm` breakpoints, the sidebar collapses to a drawer (`sx={{ display: { xs: 'none', md: 'block' } }}`)
- A hamburger icon in the app bar toggles the drawer on mobile

---

### ChatSidebar

Collapsible chat panel that can be embedded in the dashboard layout for quick access from any page.

**Behavior**:
- Toggled via a floating action button or keyboard shortcut
- Slides in from the right as a `<Drawer>` with `sx={{ width: 400 }}`
- Contains a simplified version of ChatInterface (no session sidebar, just the active conversation)
- Persists the active session across page navigations
- Enabled/disabled via `ENABLE_CHAT_SIDEBAR` module-config

**MUI components**:
- `<Drawer anchor="right" variant="persistent">` for the slide-in panel
- `<Fab>` with chat icon for the toggle button (`sx={{ position: 'fixed', bottom: 16, right: 16 }}`)

---

### ActionCard

Reusable component for displaying a tool invocation. Used in ChatSessionShow and exported for other modules.

```
+-----------------------------------------------+
| [Icon] kb.searchEntries              45ms [v] |
+-----------------------------------------------+
| Input:                                        |
|   { "query": "services", "tenantId": 5 }     |
| Output:                                       |
|   { "entries": [{ "question": "..." }] }      |
+-----------------------------------------------+
```

- Collapsed by default (shows tool name, duration, status icon)
- Expands to show formatted JSON input/output
- Status icon: green checkmark for success, red X for error
- `sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}` for the card

---

### Menu Section

```tsx
<Divider sx={{ my: 1 }} />
<Box sx={{ px: 2, pb: 0.5 }}>
  <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>
    Chat
  </Typography>
</Box>
<Menu.Item to="/chat" primaryText="Chat" leftIcon={<ChatIcon />} />
<Menu.ResourceItem name="chat-sessions" />
```

---

## Part 2: agent-ui Components (Tailwind + cn())

Location: `packages/agent-ui/src/`

These components use Tailwind CSS with `cn()` from `@oven/oven-ui`. No MUI. No `style={}`. All class composition uses the `cn()` utility.

---

### ChatWidget

The main embeddable widget. Renders as a floating panel on external websites.

**Component tree**:

```
ChatWidget
  +-- WidgetLauncher         (floating button, toggles open/close)
  +-- WidgetPanel             (the chat container)
       +-- WidgetHeader       (tenant name, online indicator, close button)
       +-- WelcomeScreen      (shown before first message)
       |    +-- WelcomeMessage
       |    +-- QuickReplyButtons
       +-- MessageList        (scrollable message area)
       |    +-- ChatBubble[]  (individual messages)
       |    +-- TypingIndicator (shown during streaming)
       +-- EscalationBanner   (shown when session is escalated)
       +-- AppointmentButton  (optional CTA)
       +-- MessageInput       (text input + send + attach)
       +-- PoweredBy          (optional "Powered by OVEN" badge)
```

**WidgetLauncher**:
```tsx
<button
  className={cn(
    'fixed z-50 flex items-center justify-center',
    'w-14 h-14 rounded-full shadow-lg',
    'bg-[var(--oven-widget-primary)] text-[var(--oven-widget-primary-contrast)]',
    'hover:scale-110 transition-transform duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    position === 'bottom-right' && 'bottom-6 right-6',
    position === 'bottom-left' && 'bottom-6 left-6',
  )}
  aria-label={isOpen ? 'Close chat' : 'Open chat'}
>
  {isOpen ? <CloseIcon /> : <ChatIcon />}
</button>
```

**WidgetPanel** (desktop):
```tsx
<div
  className={cn(
    'fixed z-50 flex flex-col',
    'w-[var(--oven-widget-max-width)] h-[var(--oven-widget-max-height)]',
    'bg-[var(--oven-widget-background)] rounded-[var(--oven-widget-border-radius)]',
    'shadow-2xl border border-[var(--oven-widget-border)]',
    'font-[var(--oven-widget-font-family)]',
    position === 'bottom-right' && 'bottom-24 right-6',
    position === 'bottom-left' && 'bottom-24 left-6',
    // Animation
    'transition-all duration-300 ease-out',
    isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none',
  )}
  role="dialog"
  aria-label="Chat with assistant"
>
```

**WidgetPanel** (mobile, < 640px):
```tsx
<div
  className={cn(
    'fixed inset-0 z-50 flex flex-col',
    'bg-[var(--oven-widget-background)]',
  )}
>
```

**WelcomeScreen**:
- Welcome message text centered in the panel
- Business hours indicator: green dot + "Online" or gray dot + "Away"
- Quick-reply buttons in a flex-wrap layout:
  ```tsx
  <button
    className={cn(
      'px-4 py-2 rounded-full text-sm',
      'border border-[var(--oven-widget-primary)]',
      'text-[var(--oven-widget-primary)]',
      'hover:bg-[var(--oven-widget-primary)] hover:text-[var(--oven-widget-primary-contrast)]',
      'transition-colors duration-150',
    )}
  >
    {label}
  </button>
  ```

**ChatBubble**:
```tsx
const bubbleStyles: Record<string, string> = {
  user: 'ml-auto bg-[var(--oven-widget-bubble-user)] text-[var(--oven-widget-primary-contrast)] rounded-br-sm',
  assistant: 'mr-auto bg-[var(--oven-widget-bubble-assistant)] text-[var(--oven-widget-text)] rounded-bl-sm',
  system: 'mx-auto bg-transparent text-[var(--oven-widget-text-secondary)] text-center text-sm italic',
};

<div
  className={cn(
    'max-w-[80%] px-4 py-2 rounded-2xl',
    'text-sm leading-relaxed',
    bubbleStyles[role],
    className,
  )}
>
  {role === 'assistant' ? <MarkdownRenderer content={text} /> : <span>{text}</span>}
</div>
```

**TypingIndicator**:
```tsx
<div className={cn('flex items-center gap-1 px-4 py-2 mr-auto')}>
  <span className={cn('w-2 h-2 rounded-full bg-[var(--oven-widget-text-secondary)] animate-bounce')}
        style={{ animationDelay: '0ms' } as React.CSSProperties} />
  <span className={cn('w-2 h-2 rounded-full bg-[var(--oven-widget-text-secondary)] animate-bounce')}
        style={{ animationDelay: '150ms' } as React.CSSProperties} />
  <span className={cn('w-2 h-2 rounded-full bg-[var(--oven-widget-text-secondary)] animate-bounce')}
        style={{ animationDelay: '300ms' } as React.CSSProperties} />
</div>
```

Note: `animationDelay` uses `style={}` because it is a dynamic CSS custom property value -- the one permitted exception per the coding standards.

**EscalationBanner**:
```tsx
<div className={cn('p-4 bg-amber-50 border-t border-amber-200')}>
  <p className={cn('text-sm font-medium text-amber-800')}>
    A team member will follow up with you.
  </p>
  <div className={cn('mt-2 flex flex-wrap gap-2')}>
    {contact.phone && (
      <a href={`tel:${contact.phone}`}
         className={cn('inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs',
                        'bg-amber-100 text-amber-700 hover:bg-amber-200')}>
        Phone: {contact.phone}
      </a>
    )}
    {contact.email && (
      <a href={`mailto:${contact.email}`}
         className={cn('inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs',
                        'bg-amber-100 text-amber-700 hover:bg-amber-200')}>
        Email: {contact.email}
      </a>
    )}
  </div>
</div>
```

**MessageInput**:
```tsx
<form className={cn('flex items-end gap-2 p-3 border-t border-[var(--oven-widget-border)]')}>
  {showFileUpload && (
    <button type="button"
            className={cn('p-2 text-[var(--oven-widget-text-secondary)] hover:text-[var(--oven-widget-text)]')}>
      <PaperclipIcon />
    </button>
  )}
  <textarea
    className={cn(
      'flex-1 resize-none rounded-xl px-4 py-2 text-sm',
      'bg-[var(--oven-widget-surface)] text-[var(--oven-widget-text)]',
      'border border-transparent focus:border-[var(--oven-widget-primary)]',
      'focus:outline-none focus:ring-1 focus:ring-[var(--oven-widget-primary)]',
      'placeholder:text-[var(--oven-widget-text-secondary)]',
    )}
    rows={1}
    placeholder={placeholder}
  />
  <button type="submit"
          className={cn(
            'p-2 rounded-full',
            'bg-[var(--oven-widget-primary)] text-[var(--oven-widget-primary-contrast)]',
            'hover:opacity-90 disabled:opacity-50',
            'transition-opacity duration-150',
          )}
          disabled={!canSend}>
    <SendIcon />
  </button>
</form>
```

---

### AgentPlayground

Full testing interface rendered in the dashboard (inside an MUI layout, but the component itself uses Tailwind).

**Layout**:

```
+------------------------------------------------------+
| Agent: [Selector]    [New Session]    [Settings gear] |
+------------------------------------------------------+
| +------------------------------------------+ +------+|
| | Message List                             | | Params||
| |                                          | |      ||
| | [User bubble]                            | | Model||
| | [Tool call card - expandable]            | | Temp ||
| | [Assistant bubble]                       | | Max  ||
| | [Execution metadata bar]                 | |      ||
| |                                          | +------+|
| +------------------------------------------+         |
| [Text input] [Send] [Attach file]                    |
+------------------------------------------------------+
```

**ToolCallCard**:
```tsx
<details className={cn('group border rounded-lg overflow-hidden',
                        status === 'success' ? 'border-green-200' : 'border-red-200')}>
  <summary className={cn('flex items-center gap-2 px-3 py-2 cursor-pointer',
                          'bg-gray-50 hover:bg-gray-100 text-sm')}>
    <span className={cn(status === 'success' ? 'text-green-600' : 'text-red-600')}>
      {status === 'success' ? 'check-circle' : 'x-circle'}
    </span>
    <span className={cn('font-mono font-medium')}>{toolName}</span>
    <span className={cn('ml-auto text-xs text-gray-500')}>{durationMs}ms</span>
  </summary>
  <div className={cn('p-3 space-y-2 text-xs')}>
    <div>
      <span className={cn('font-medium text-gray-500')}>Input:</span>
      <pre className={cn('mt-1 p-2 bg-gray-50 rounded overflow-x-auto')}>
        {JSON.stringify(input, null, 2)}
      </pre>
    </div>
    <div>
      <span className={cn('font-medium text-gray-500')}>Output:</span>
      <pre className={cn('mt-1 p-2 bg-gray-50 rounded overflow-x-auto')}>
        {JSON.stringify(output, null, 2)}
      </pre>
    </div>
  </div>
</details>
```

**ParamsPanel** (sidebar):
```tsx
<aside className={cn('w-64 border-l p-4 space-y-4 overflow-y-auto')}>
  <h3 className={cn('text-sm font-semibold text-gray-700')}>Parameters</h3>
  {/* Model selector */}
  <label className={cn('block text-xs font-medium text-gray-500')}>Model</label>
  <select className={cn('w-full rounded-md border px-2 py-1 text-sm')}>
    {models.map(m => <option key={m} value={m}>{m}</option>)}
  </select>
  {/* Temperature slider */}
  <label className={cn('block text-xs font-medium text-gray-500')}>
    Temperature: {temperature.toFixed(1)}
  </label>
  <input type="range" min="0" max="2" step="0.1"
         className={cn('w-full accent-blue-600')} />
  {/* Max tokens */}
  <label className={cn('block text-xs font-medium text-gray-500')}>Max Tokens</label>
  <input type="number"
         className={cn('w-full rounded-md border px-2 py-1 text-sm')} />
</aside>
```

---

### ConversationView

Read-only message history for session review.

**Features**:
- Same message bubble styling as ChatWidget (role-based variants)
- Optional timestamps in `text-xs text-gray-400` below each bubble
- Tool call sections rendered as collapsible `<details>` elements
- Export button group at the top: "Copy as Text" | "Download JSON"
- No input bar (read-only mode)

---

## Part 3: Widget Theming

### CSS Custom Properties

All visual aspects of the widget are controlled via CSS custom properties. These are set by the `useTenantConfig` hook based on the tenant's branding configuration.

**Default values (light theme)**:
```css
:host {
  --oven-widget-primary: #1976D2;
  --oven-widget-primary-contrast: #FFFFFF;
  --oven-widget-surface: #F5F5F5;
  --oven-widget-background: #FFFFFF;
  --oven-widget-text: #333333;
  --oven-widget-text-secondary: #666666;
  --oven-widget-border: #E0E0E0;
  --oven-widget-border-radius: 12px;
  --oven-widget-font-family: 'Inter', system-ui, sans-serif;
  --oven-widget-bubble-user: var(--oven-widget-primary);
  --oven-widget-bubble-assistant: var(--oven-widget-surface);
  --oven-widget-max-width: 400px;
  --oven-widget-max-height: 600px;
}
```

**Dark theme**:
```css
:host([data-oven-theme="dark"]) {
  --oven-widget-background: #1A1A1A;
  --oven-widget-surface: #2D2D2D;
  --oven-widget-text: #E0E0E0;
  --oven-widget-text-secondary: #999999;
  --oven-widget-border: #404040;
}
```

**Auto theme** (follows system preference):
```css
@media (prefers-color-scheme: dark) {
  :host([data-oven-theme="auto"]) {
    --oven-widget-background: #1A1A1A;
    /* ... dark values */
  }
}
```

### Tenant Branding Override

When the tenant config includes branding colors, they override the defaults:

```typescript
// In useTenantConfig, after fetching config
const root = shadowRoot.host;
if (config.branding?.primaryColor) {
  root.style.setProperty('--oven-widget-primary', config.branding.primaryColor);
}
if (config.branding?.fontFamily) {
  root.style.setProperty('--oven-widget-font-family', config.branding.fontFamily);
}
```

This is the permitted use of `style` -- setting CSS custom properties from runtime values.

---

## Part 4: First-Time User Experience (FTUE)

### Empty State (No Sessions)

When the ChatInterface loads with no sessions, display:

```
+--------------------------------------------------+
|                                                  |
|     [Chat bubble icon - large, muted]            |
|                                                  |
|     Start a conversation                         |
|     Ask questions, perform actions, or           |
|     explore what the platform can do.            |
|                                                  |
|     [New Conversation button - primary]          |
|                                                  |
+--------------------------------------------------+
```

### Widget FTUE

When the widget opens for the first time (no session in localStorage):

1. WelcomeScreen appears with the tenant's welcome message
2. Quick-reply buttons offer guided entry points
3. After the first message, the welcome screen transitions to the conversation view
4. The launcher button shows a subtle pulse animation on first page load (once, then stops)

---

## Part 5: Microinteractions

### Typing Indicator Animation

Three dots with staggered bounce animation:
- Each dot: `w-2 h-2 rounded-full` with `animate-bounce`
- Stagger: 0ms, 150ms, 300ms delay (set via CSS custom property)
- Appears immediately when streaming status transitions to `streaming`
- Disappears when the first token arrives (replaced by StreamingText)

### Message Slide-In

New messages enter with a subtle slide animation:
- User messages: slide in from right (`translate-x-4` -> `translate-x-0`, 200ms ease-out)
- Assistant messages: slide in from left (`-translate-x-4` -> `translate-x-0`, 200ms ease-out)

### Tool Call Card Expand

ToolCallCard uses `<details>` element for native expand/collapse:
- Smooth height transition via `grid-rows` animation pattern
- Rotate chevron icon 180 degrees on open

### Streaming Text Cursor

During token streaming, a blinking cursor appears after the last token:
- Pseudo-element `after:content-['|'] after:animate-pulse`
- Removed when streaming completes

### Satisfaction Rating

After session close, the widget shows a rating prompt:
- Five star icons (outlined)
- Hover fills stars up to the hovered position
- Click submits the rating
- Stars animate with a scale-up pulse on selection

---

## Part 6: Accessibility

### ARIA Roles

```tsx
// Message list
<div role="log" aria-label="Chat messages" aria-live="polite" aria-relevant="additions">

// Individual message
<div role="listitem" aria-label={`${role} message`}>

// Input
<textarea aria-label="Type a message" aria-describedby="chat-input-hint" />

// Launcher
<button aria-label={isOpen ? 'Close chat' : 'Open chat'} aria-expanded={isOpen} />

// Widget panel
<div role="dialog" aria-label="Chat with assistant" aria-modal="false">
```

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Enter` | Send message (when input is focused) |
| `Shift+Enter` | New line in input |
| `Escape` | Close widget panel |
| `Tab` | Move focus: input -> send button -> file attach -> message list |
| `ArrowUp/Down` | Navigate messages in the list (for screen readers) |

### Screen Reader Support

- New messages are announced via `aria-live="polite"` on the message list
- Status changes ("Agent is typing...", "Message sent") are announced via a visually-hidden live region
- Tool call cards announce their status ("Tool kb.searchEntries completed successfully")
- The typing indicator has `aria-label="Agent is typing"` and `role="status"`

# Use Case Compliance: module-chat + agent-ui

> Mapping to platform use cases from `docs/use-cases.md` and dental-specific scenarios.

---

## 1. Platform Use Case Mapping

### UC-2: Onboard a New Tenant

**Chat contribution**: When a tenant is onboarded, the system auto-configures a default chat agent for the tenant. This happens via the existing onboarding workflow or seed process:

1. Tenant is created via `POST /api/tenants`
2. The `chat` module-config defaults are inherited from platform level:
   - `MAX_MESSAGES_PER_SESSION`: 100
   - `SESSION_TIMEOUT_MINUTES`: 30
   - `ANONYMOUS_SESSIONS_ENABLED`: true
   - `ESCALATION_KEYWORDS`: 'humano,persona,ayuda real'
   - `SHOW_POWERED_BY`: true
3. If the tenant has a subscription that includes chat, the widget can be immediately embedded on their website with just the `data-tenant` attribute

**No manual chat configuration is required for basic onboarding.** The tenant inherits sensible defaults from the platform config cascade.

### UC-3: Configure Tenant Settings

**Chat-specific configuration** available through Dashboard -> Module Configs:

| Config Key | Example Value | Effect |
|-----------|---------------|--------|
| `WELCOME_MESSAGE_BUSINESS_HOURS` | "Hola! Como podemos ayudarte hoy?" | Shown in widget during open hours |
| `WELCOME_MESSAGE_OUT_OF_HOURS` | "Estamos cerrados. Deja tu mensaje." | Shown in widget outside open hours |
| `ESCALATION_KEYWORDS` | "humano,persona,hablar con alguien" | Triggers escalation when detected |
| `MAX_MESSAGES_PER_SESSION` | 50 | Limits session length |
| `SESSION_TIMEOUT_MINUTES` | 15 | Faster timeout for high-traffic tenants |
| `ENABLE_FILE_UPLOAD` | true | Allows file sharing in widget |
| `SHOW_POWERED_BY` | false | Removes OVEN branding (premium feature) |

All settings use the 5-tier config cascade. Tenants override only what they need; everything else inherits from platform defaults.

### UC-9: Check Tenant Full Profile

**Chat analytics** are visible in the tenant profile view:

1. Navigate to Dashboard -> Tenants -> [tenant] -> Show
2. The tenant profile includes a "Chat Analytics" section showing:
   - Total sessions (all time and this month)
   - Average session duration
   - Average messages per session
   - Escalation rate (percentage of sessions that were escalated)
   - Average satisfaction score
3. `GET /api/chat-analytics/summary?tenantId=42` provides these aggregated metrics
4. Clicking through to the full analytics page shows per-session breakdowns

---

## 2. Dental-Specific Scenarios

### Embed Widget on Dental Office Website

**Scenario**: Clinica XYZ wants to add a chat widget to their website so patients can ask questions 24/7.

**Steps**:
1. Admin navigates to Dashboard -> Tenants -> Clinica XYZ -> Show
2. Copies the widget embed code (auto-generated from tenant slug):
   ```html
   <script src="https://cdn.oven.app/chat-widget.js"
           data-tenant="clinica-xyz"
           data-theme="light"
           data-position="bottom-right"
           data-quick-replies="Horarios,Servicios,Agendamiento,Pagos"
           defer></script>
   ```
3. The dental office's web developer pastes this into their site's HTML
4. The widget immediately works:
   - Fetches Clinica XYZ's branding (colors, logo) from tenant config
   - Shows business hours status based on the configured schedule
   - Creates anonymous sessions for website visitors
   - Routes messages to the configured dental assistant agent

**Modules involved**: agent-ui (widget rendering), module-chat (session/message API), module-tenants (config), module-agent-core (agent invocation)

### Test Agent in Playground

**Scenario**: The clinic admin wants to test the dental assistant's responses before going live.

**Steps**:
1. Navigate to Dashboard -> Chat (custom page)
2. The AgentPlayground loads with the tenant's default agent pre-selected
3. Admin sends test messages: "Cuales son los horarios?", "Quiero agendar una cita", "Cuanto cuesta una limpieza?"
4. The playground shows:
   - Streaming responses from the agent
   - Tool calls made (e.g., searching the knowledge base, checking availability)
   - Token usage and latency per response
5. Admin adjusts exposed params (temperature, model) to fine-tune responses
6. When satisfied, the admin confirms the agent is ready for widget deployment

### Monitor Patient Conversations

**Scenario**: Clinic manager reviews chat conversations to assess quality and identify common questions.

**Steps**:
1. Navigate to Dashboard -> Chat Sessions (resource list)
2. Filter by tenant (Clinica XYZ), date range, and status
3. The list shows: user/anonymous indicator, channel (widget/web), message count, status, duration
4. Click a session to view the ConversationView:
   - Full message history with role-based styling
   - Tool calls the agent made (knowledge base searches, appointment checks)
   - Session metadata (duration, tokens used, satisfaction score)
5. Export specific conversations for training data or quality review

### Identify FAQ Gaps from Escalated Sessions

**Scenario**: Clinic admin wants to find topics where the agent fails and needs knowledge base updates.

**Steps**:
1. Navigate to Dashboard -> Chat Sessions
2. Filter by status = 'escalated'
3. Review escalated conversations to identify patterns:
   - What did the user ask before escalation?
   - Did the agent attempt a knowledge base search with no results?
   - Was the escalation triggered by keywords ("quiero hablar con alguien") or agent handoff?
4. For each gap identified, create a new knowledge base entry:
   - Dashboard -> Knowledge Base -> Entries -> Create
   - Add the question, answer, and relevant category
5. The agent will discover the new entry on its next invocation (via registry + knowledge base tool)

---

## 3. New Use Cases (Chat-Specific)

### UC-CHAT-1: Widget Setup

**Goal**: Configure and deploy a chat widget on a tenant's external website.

**Actors**: Platform admin, tenant admin

**Preconditions**: Tenant exists, at least one agent is configured, tenant has an active subscription with chat access

**Steps**:
1. Admin configures tenant-specific chat settings (welcome messages, escalation keywords, schedule)
2. Admin copies the embed script tag from the tenant profile page
3. The widget embed code includes the tenant slug and desired configuration
4. The web developer adds the script tag to the website
5. The widget auto-discovers tenant branding and renders accordingly

**Postconditions**: Widget is live on the external website. Anonymous visitors can chat with the configured agent.

---

### UC-CHAT-2: Anonymous Chat

**Goal**: A website visitor chats with the tenant's agent without creating an account.

**Actors**: Anonymous website visitor

**Preconditions**: Widget is embedded on the website, `ANONYMOUS_SESSIONS_ENABLED` is true for the tenant

**Steps**:
1. Visitor sees the floating chat launcher and clicks it
2. The widget displays a welcome message and quick-reply buttons
3. Visitor clicks a quick-reply or types a message
4. The widget creates an anonymous session (sessionToken stored in localStorage)
5. The message is sent to the configured agent
6. The agent's response streams in real-time
7. The visitor continues the conversation
8. On subsequent visits, the widget resumes the existing session from localStorage

**Postconditions**: The visitor received help without logging in. The session is recorded for analytics. If the visitor clears localStorage, a new session will be created on next visit.

---

### UC-CHAT-3: Escalation Flow

**Goal**: A chat conversation is escalated to a human when the agent cannot resolve the issue.

**Actors**: Anonymous or authenticated user, human support agent

**Preconditions**: Active chat session exists, escalation keywords or agent handoff are configured

**Steps**:
1. User sends a message containing an escalation keyword (e.g., "quiero hablar con una persona")
2. The EscalationHandler detects the keyword match
3. Session status transitions from 'active' to 'escalated'
4. The `chat.session.escalated` event is emitted
5. The widget displays the EscalationBanner with tenant contact info (phone, email, WhatsApp link)
6. The user can click the contact options to reach a human
7. Optionally, a wiring/workflow triggers a notification to the tenant's support team

**Postconditions**: Session is marked escalated. Analytics record the escalation. Human contact info is displayed. The tenant's support team is optionally notified.

---

### UC-CHAT-4: Analytics Review

**Goal**: Review chat performance metrics across sessions for a tenant.

**Actors**: Platform admin, tenant admin

**Preconditions**: Tenant has at least one completed chat session

**Steps**:
1. Navigate to Dashboard -> Chat Analytics (or Chat Analytics Summary)
2. Filter by tenant, date range
3. Review summary metrics:
   - Total sessions, average duration, average messages
   - Escalation rate, average satisfaction score
   - Total tokens used, total cost
4. Drill down into individual sessions for detailed analysis
5. Identify trends: most common escalation reasons, peak usage hours, satisfaction trends

**Postconditions**: Admin has a clear picture of chat performance and can make data-driven decisions about agent configuration, knowledge base content, and staffing.

---

### UC-CHAT-5: Playground Testing

**Goal**: Test an agent's conversational abilities before deploying it to the widget or adjusting its configuration.

**Actors**: Platform admin, tenant admin, agent developer

**Preconditions**: At least one agent exists in module-agent-core

**Steps**:
1. Navigate to Dashboard -> Chat (custom page)
2. Select the agent to test from the dropdown
3. Optionally adjust exposed parameters (temperature, model, max tokens)
4. Send test messages covering expected user intents
5. Review the agent's responses, tool calls, and metadata
6. Identify issues: wrong tool selection, poor response quality, missing knowledge
7. Adjust agent configuration (system prompt, tool bindings, params) and re-test
8. When satisfied, note the agent slug for widget configuration

**Postconditions**: Agent behavior is verified. Any issues are identified before users encounter them. Configuration changes are made based on test results.

---

## 4. Cross-Module Use Case Interactions

| Use Case | Modules Involved | Chat's Role |
|----------|-----------------|-------------|
| UC-2 Onboard Tenant | tenants, config, subscriptions, **chat** | Inherit default chat config, enable widget |
| UC-3 Configure Tenant | tenants, config, **chat** | Tenant-specific welcome messages, escalation keywords |
| UC-9 Tenant Full Profile | tenants, config, subscriptions, **chat** | Chat analytics in profile view |
| UC-13 Portal Creation | ui-flows, **chat** | Chat page type embeds ChatWidget |
| UC-CHAT-1 Widget Setup | **chat**, agent-ui, tenants, agent-core | Full widget deployment flow |
| UC-CHAT-2 Anonymous Chat | **chat**, agent-ui, agent-core, ai | Anonymous session lifecycle |
| UC-CHAT-3 Escalation | **chat**, agent-ui, tenants, notifications | Escalation detection and handoff |
| UC-CHAT-4 Analytics | **chat**, subscriptions | Usage metrics and cost tracking |
| UC-CHAT-5 Playground | **chat**, agent-ui, agent-core, ai | Agent testing interface |

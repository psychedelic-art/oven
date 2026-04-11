# Module Agent Core -- Use Case Compliance

> How agent-core satisfies platform use cases and domain-specific scenarios.

---

## Platform Use Cases

### UC-1: Dental Clinic FAQ Agent

**Scenario**: A dental clinic tenant creates an FAQ agent that answers patient questions using the knowledge base.

**Agent Core involvement:**

1. **Create agent**: Admin creates a "Dental FAQ" agent via `POST /api/agents` with:
   - `systemPrompt`: "You are a helpful dental assistant for {{businessName}}. Answer in {{language}}. Use the knowledge base to find answers."
   - `toolBindings`: `["kb.searchEntries", "kb.getEntry"]`
   - `llmConfig`: `{ model: "fast", temperature: 0.3, maxTokens: 1024 }`
   - `tenantId`: clinic's tenant ID

2. **Tool discovery**: The Tool Wrapper discovers `kb.searchEntries` and `kb.getEntry` from `module-knowledge-base`'s `chat.actionSchemas`. The agent can search and retrieve FAQ entries.

3. **System prompt variables**: At invocation time, `{{businessName}}` and `{{language}}` are resolved from `module-config` (tenant-scoped keys `BUSINESS_NAME` and `LANGUAGE`).

4. **Invocation**: Patients interact through the chat widget (`module-chat`), which routes messages to the agent via `POST /api/agents/dental-faq/invoke`.

5. **Tool execution**: The LLM decides to search the knowledge base, the Tool Wrapper executes the HTTP call with the patient's permissions (public FAQ access), and the result is returned to the LLM for synthesis.

6. **Response**: The agent produces a natural-language answer in the configured language, citing the relevant FAQ entry.

**Requirements satisfied**: FR-AC-001, FR-AC-002, FR-AC-003, FR-AC-004, FR-AC-007

---

### UC-2: Onboard Tenant (Default Agent Auto-Creation)

**Scenario**: When a new tenant is created, the platform automatically provisions a default agent for that tenant.

**Agent Core involvement:**

1. **Event listener**: Agent Core listens for `tenants.tenant.created` via the EventBus.

2. **Auto-create**: The listener creates a default agent for the new tenant:
   ```typescript
   events: {
     listeners: {
       'tenants.tenant.created': async (payload) => {
         await createDefaultAgent({
           tenantId: payload.id,
           name: `${payload.name} Assistant`,
           slug: `${payload.slug}-assistant`,
           systemPrompt: defaultSystemPromptTemplate,
           llmConfig: defaultLlmConfig,
           toolBindings: ['kb.searchEntries'],
           enabled: true,
         });
       }
     }
   }
   ```

3. **Default configuration**: The default agent uses platform-default LLM settings (from `module-config` global tier), which the tenant admin can later customize.

4. **Idempotency**: If the listener runs twice (retry), the unique slug constraint prevents duplicate agents.

**Requirements satisfied**: FR-AC-001 (create), EventBus integration (module-rules Rule 9)

---

### UC-3: Configure Tenant (Per-Tenant Agent Customization)

**Scenario**: A tenant admin customizes their agent's system prompt, model, and tool bindings from the dashboard.

**Agent Core involvement:**

1. **Agent edit form**: The dashboard provides a tabbed edit form for agent definitions (Identity, LLM Config, System Prompt, Tools, Parameters, Advanced).

2. **Per-tenant model override**: The tenant admin selects a different model (e.g., "smart" instead of "fast") on the LLM Config tab. This is stored in `agents.llmConfig.model` for that specific agent.

3. **System prompt customization**: The admin edits the system prompt to include clinic-specific instructions, appointment booking procedures, and tone guidelines.

4. **Tool binding**: The admin enables additional tools (e.g., `sessions.create` for appointment booking) from the Tools tab checklist.

5. **Auto-versioning**: Each save creates a version snapshot (FR-AC-010), enabling rollback if a change degrades agent quality.

6. **Testing**: The admin opens the playground to test the changes before enabling the agent for patients.

**Requirements satisfied**: FR-AC-001 (update), FR-AC-010 (versioning), FR-AC-013 (playground)

---

### UC-12: VIP Quotas (Agent-Level Token Quotas)

**Scenario**: A premium tenant has higher token quotas for their agents, while a free-tier tenant has strict limits.

**Agent Core involvement:**

1. **Per-tenant token budget**: The premium tenant's subscription plan includes higher `agent-tokens` quota via `module-subscriptions`.

2. **Pre-flight check**: Before every invocation, the AgentInvoker calls `module-subscriptions` to verify the remaining token budget (FR-AC-011).

3. **Per-agent cap**: Individual agents can have their own `maxTokens` limit in `llmConfig`, enforced regardless of the tenant's overall budget.

4. **Config cascade**: The `DEFAULT_MAX_TOKENS` config key can be overridden per tenant:
   - Platform default: 4096 tokens
   - Premium tenant override: 8192 tokens
   - Free tenant override: 1024 tokens

5. **Usage tracking**: After execution, actual token usage is reported to `module-subscriptions` for metering against the plan quota.

6. **Quota exceeded**: If the tenant's quota is exhausted, invocations return 429 with a clear error message including the remaining quota and reset time.

**Requirements satisfied**: FR-AC-011 (quota integration), Config cascade (module-rules Rule 8)

---

## Domain-Specific Use Cases

### UC-NEW-1: Create an Agent

**Actor**: Platform admin or tenant admin
**Precondition**: User has `agents.create` permission

**Flow:**

1. Navigate to Agents list in the dashboard.
2. Click "Create" button.
3. Fill in the tabbed form:
   - **Identity**: Name, description, optional tenant assignment.
   - **LLM Config**: Select provider and model, adjust temperature and maxTokens.
   - **System Prompt**: Write instructions with variable placeholders.
   - **Tools**: Select tools from the discovered catalog (grouped by module).
   - **Parameters**: Check which params should be exposable to API callers.
   - **Advanced**: Optional workflow agent link, input modalities.
4. Click "Save".
5. System creates the agent with version 1.
6. System emits `agents.agent.created` event.
7. User is redirected to the agent show page.

**Postcondition**: Agent is available for invocation at `/api/agents/[slug]/invoke`.

---

### UC-NEW-2: Test an Agent in the Playground

**Actor**: Platform admin or tenant admin
**Precondition**: Agent exists and is enabled

**Flow:**

1. From the agent list, click the "Playground" button on a row.
2. Playground panel opens (or navigates to playground tab on show page).
3. The playground displays:
   - Agent configuration summary (model, temperature, tools).
   - Exposed parameter overrides (sliders/inputs for declared params).
   - Chat interface.
4. User types a message and sends it.
5. System creates a playground session (`isPlayground: true`).
6. System invokes the agent with streaming enabled.
7. Tokens stream into the chat interface in real-time.
8. If the agent calls a tool, a tool call card appears showing the tool name, arguments, and result.
9. Execution metadata (tokens, latency) appears below the response.
10. User continues the conversation or adjusts parameters and sends another message.

**Postcondition**: Playground session is persisted for review. Execution is logged.

---

### UC-NEW-3: Monitor Agent Executions

**Actor**: Platform admin
**Precondition**: Agents have been invoked

**Flow:**

1. Navigate to Executions list in the Agents section of the dashboard.
2. View executions with columns: Agent, Session, Status, Tokens, Latency, Tools Used, Timestamp.
3. Filter by agent, status (completed/failed), or date range.
4. Click an execution row to view detail:
   - Timeline view showing each graph node as a step.
   - Input/output JSON viewer per step.
   - Timing bar showing relative duration of each step.
   - Tool call detail cards (expandable).
   - Effective LLM config used.
   - Error message (if failed).

**Postcondition**: Admin has visibility into agent behavior, performance, and errors.

---

### UC-NEW-4: Review Agent Sessions

**Actor**: Platform admin or tenant admin
**Precondition**: Sessions exist for the user's agents

**Flow:**

1. Navigate to Sessions list in the Agents section.
2. View sessions with columns: Agent, Tenant, User, Title, Status, Message Count, Created.
3. Filter by agent, tenant, status, or playground flag.
4. Click a session to view conversation:
   - Chat bubble layout: user messages right-aligned, assistant messages left-aligned.
   - System messages centered.
   - Tool calls displayed as expandable cards between assistant messages.
   - Per-message metadata (model, tokens, timestamp).
5. Optionally archive the session.

**Postcondition**: Admin can review conversation quality and agent behavior.

---

### UC-NEW-5: Configure Tool Bindings

**Actor**: Tenant admin
**Precondition**: Agent exists, tools are discovered from registry

**Flow:**

1. Navigate to agent edit form, Tools tab.
2. View discovered tools grouped by module:
   - **Knowledge Base**: kb.searchEntries, kb.getEntry, kb.listCategories
   - **AI**: ai.generateText, ai.embed, ai.generateImage
   - **Maps**: maps.getMap, maps.getChunk
   - **Sessions**: sessions.create, sessions.getActive
3. Search for specific tools using the filter input.
4. Check/uncheck tools to bind to the agent. Selected count badge updates.
5. Save the agent.
6. System validates that all selected tool names exist in the ToolRegistry.
7. Auto-version triggers if tool bindings changed.

**Postcondition**: Agent will only have access to the selected tools during execution.

---

## Compliance Matrix

| Requirement | UC-1 | UC-2 | UC-3 | UC-12 | NEW-1 | NEW-2 | NEW-3 | NEW-4 | NEW-5 |
|-------------|------|------|------|-------|-------|-------|-------|-------|-------|
| FR-AC-001 (CRUD) | X | X | X | | X | | | | X |
| FR-AC-002 (Tool Wrapper) | X | | | | | | | | X |
| FR-AC-003 (Invocation) | X | | | X | | X | | | |
| FR-AC-004 (Streaming) | X | | | | | X | | | |
| FR-AC-005 (LangGraph) | X | | | | | X | | | |
| FR-AC-006 (Node Library) | | | | | | X | X | | |
| FR-AC-007 (Sessions) | X | | | | | X | | X | |
| FR-AC-008 (Execution Log) | | | | X | | X | X | | |
| FR-AC-009 (Multimodal) | | | | | | X | | | |
| FR-AC-010 (Versioning) | | | X | | | | | | X |
| FR-AC-011 (Quotas) | | | | X | | | | | |
| FR-AC-012 (Exposed Params) | | | X | | X | X | | | |
| FR-AC-013 (Playground) | | | X | | | X | | | |

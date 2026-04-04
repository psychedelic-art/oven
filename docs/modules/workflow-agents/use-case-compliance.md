# Use Case Compliance — Workflow Agents, MCP Server & Python Sidecar

> Mapping to `docs/use-cases.md` entries and dental-specific scenarios.

---

## Existing Use Case Mapping

### UC-3: Configure Tenant Settings

**Module involvement**: module-workflow-agents provides per-tenant agent workflow configuration through the module-config cascade system.

**How workflow-agents participates**:
- Each tenant can override workflow config keys (MAX_TOOL_ITERATIONS, EXECUTION_TIMEOUT_MS, EXECUTION_COST_CAP_CENTS, MEMORY_RETRIEVAL_TOP_K) via the module-config API
- Agent workflows with `tenantId` are scoped to a specific tenant; workflows with `tenantId = null` are platform-wide templates
- Guardrail rules (input/output content filtering) are configured per-tenant within the agentConfig JSONB
- Memory isolation is automatic: agent memory entries are scoped by agentId and optionally userId

**Steps**:
1. Navigate to Module Configs for tenant
2. Set `workflow-agents.MAX_TOOL_ITERATIONS = 5` (conservative for this tenant)
3. Set `workflow-agents.EXECUTION_COST_CAP_CENTS = 500` (lower budget)
4. Create a tenant-scoped agent workflow with custom guardrail rules

---

### UC-12: VIP Tenant Extra Quotas

**Module involvement**: `core.checkQuota` and `core.trackUsage` nodes enable workflow-level quota management integrated with module-subscriptions.

**How workflow-agents participates**:
- Agent workflows can include a `core.checkQuota` node at the beginning to verify the tenant has remaining AI token quota
- If quota is exhausted, the workflow branches to a graceful denial message instead of attempting an LLM call
- VIP tenants with quota overrides (via module-subscriptions) automatically get higher limits checked by the same node
- `core.trackUsage` nodes record per-execution usage, enabling accurate billing

**Steps**:
1. Add `core.checkQuota` node at workflow start (serviceSlug: 'llm-completion-tokens')
2. Add conditional transition: if `$.checkQuota.allowed == false`, go to "quota exceeded" response node
3. If allowed, proceed with normal agent execution
4. After execution, `core.trackUsage` records actual tokens consumed
5. VIP tenant's quota override (set via module-subscriptions) is automatically reflected in the check

**Example workflow fragment**:
```
Start -> checkQuota -> [allowed?]
                         |-- true -> agent.toolLoop -> trackUsage -> End
                         |-- false -> "Sorry, your plan's AI quota is exhausted" -> End
```

---

## New Use Cases (Workflow Agents Specific)

### UC-WA-1: Build an Agent Workflow

**Goal**: Create a graph-based agent workflow from scratch or from a template.

**Modules**: module-workflow-agents

**Steps**:

1. **Create workflow** -- Dashboard -> Agent Workflows -> Create
   - `POST /api/agent-workflows` -- set name, slug, description
   - Choose from template (FAQ Bot, RAG Pipeline, Multi-Agent) or start blank
2. **Configure agent settings** -- Set agentConfig (default LLM model, temperature, max tokens)
3. **Configure memory** -- Set memoryConfig (enabled, scope: 'agent' or 'agent+user', retrieval strategy)
4. **Open visual editor** -- Click "Open Visual Editor" on the workflow edit page
   - Route: `/#/agent-workflows/:id/editor`
5. **Build the graph** -- Drag agent nodes from the palette:
   - Add `agent.prompt` node (system prompt template)
   - Add `agent.memory.read` node (retrieve relevant context)
   - Add `agent.toolLoop` node (ReAct cycle)
   - Add `agent.memory.write` node (persist key info)
   - Connect nodes with transitions
6. **Configure each node** -- Click nodes to set parameters:
   - LLM node: model override, temperature, tools to bind
   - Tool executor: tool selection, parallel/sequential mode
   - Memory read: top-K, query template
7. **Save** -- `PUT /api/agent-workflows/:id`
   - Auto-creates version snapshot

**Result**: A fully configured agent workflow ready for testing and execution.

---

### UC-WA-2: Test Agent Workflow Execution

**Goal**: Manually trigger an agent workflow and observe the execution step by step.

**Modules**: module-workflow-agents

**Steps**:

1. **Trigger execution** -- Dashboard -> Agent Workflows -> Show -> "Execute" button
   - `POST /api/agent-workflows/:id/execute` -- with optional input parameters
2. **Monitor in real-time** -- Dashboard -> Executions -> Show
   - Execution timeline updates as each node completes
   - Node cards show: type icon, status, input/output, timing, token count, cost
3. **Review results** -- Execution completes
   - Total token usage and cost displayed
   - Final output available in the execution context
4. **Debug failures** -- If a node fails:
   - Expand the failed node card to see error details
   - Check the input that caused the failure
   - Review checkpoint data for the last successful state

**Result**: Verified that the workflow executes correctly with expected outputs and costs.

---

### UC-WA-3: Review Human-in-the-Loop Execution

**Goal**: A human reviewer approves, edits, or rejects a paused agent execution.

**Modules**: module-workflow-agents

**Steps**:

1. **Execution pauses** -- An agent workflow reaches an `agent.humanReview` node
   - Dashboard shows "Review Required" badge on the execution
   - Event `agents-workflow.execution.paused` can trigger a notification
2. **Reviewer opens execution** -- Dashboard -> Executions -> filter by status='paused'
   - The execution show page displays the proposed action and current context
3. **Make a decision**:
   - **Approve**: Click "Approve" -- execution continues from checkpoint unchanged
   - **Edit**: Modify the proposed data, click "Edit & Continue" -- merged data used for continuation
   - **Reject**: Click "Reject" with a reason -- execution transitions to fallback/error state
4. **API call**: `POST /api/agent-workflow-executions/:id/resume` with action and optional data
5. **Execution resumes** -- Continues from checkpoint with the human's input

**Result**: Human judgment is incorporated into the agent's decision flow.

---

### UC-WA-4: Configure MCP Export

**Goal**: Enable automatic MCP server generation for an agent workflow so external AI systems can invoke it.

**Modules**: module-workflow-agents, mcp-server

**Steps**:

1. **Enable MCP export** -- Dashboard -> Agent Workflows -> Edit
   - Toggle `mcpExport` to true
   - Save the workflow
2. **MCP definition generated** -- System auto-generates tool definitions
   - The workflow itself becomes a callable MCP tool
   - All bound module tools are re-exported
   - Any referenced subagents are also exposed
3. **View MCP server** -- Dashboard -> MCP Servers -> Show
   - See all generated tool definitions as expandable cards
   - JSON Schema viewer for each tool's inputSchema
4. **Connect external client** -- Copy connection instructions
   - Local: connect via stdio transport
   - Remote: connect via HTTP endpoint
5. **Regenerate** -- If workflow changes, click "Regenerate" or rely on auto-regeneration (MCP_AUTO_REGENERATE=true)

**Result**: Agent workflow is accessible to Claude Desktop, external agents, and other MCP-compatible systems.

---

### UC-WA-5: Monitor Execution Costs

**Goal**: Track and control costs across agent workflow executions.

**Modules**: module-workflow-agents, module-subscriptions

**Steps**:

1. **View execution costs** -- Dashboard -> Executions -> any execution
   - Per-node cost breakdown visible in the timeline
   - Execution-level totalCostCents displayed prominently
2. **Set cost cap** -- Dashboard -> Module Configs
   - Set `EXECUTION_COST_CAP_CENTS = 500` for tenant
   - Executions exceeding this cap are automatically aborted
3. **Monitor trends** -- Filter executions by workflow, agent, date range
   - Sort by totalCostCents to find expensive executions
   - Identify cost-heavy nodes in the timeline
4. **Optimize** -- Adjust workflow configuration:
   - Reduce MAX_TOOL_ITERATIONS to limit loop depth
   - Use cheaper LLM model for non-critical nodes
   - Add quota check nodes to prevent execution when budget is low

**Result**: Full visibility into agent execution costs with automatic safety limits.

---

### UC-WA-6: Manage Agent Memory

**Goal**: View, create, and delete long-term memory entries for agents.

**Modules**: module-workflow-agents

**Steps**:

1. **View agent memory** -- Dashboard -> Memory -> filter by agent
   - List shows: agent name, key, content (truncated), created timestamp
2. **Create manual memory** -- Dashboard -> Memory -> Create
   - Select agent, enter key (topic/category), write content
   - Memory is embedded automatically for semantic retrieval
3. **Inspect a memory entry** -- Click to view full content, metadata, source session
4. **Delete stale memory** -- Select entries, delete
   - `DELETE /api/agent-memory/:id`
5. **Test semantic retrieval** -- Execute a workflow that includes `agent.memory.read`
   - Verify relevant memories are retrieved based on conversation context

**Result**: Agent memory is transparent, manageable, and auditable.

---

## Dental-Specific Use Case

### Dental FAQ Agent Workflow

**Goal**: Build an agent workflow that answers dental clinic FAQ questions with safety checks, quota enforcement, and knowledge base search.

**Workflow graph**:

```
Start
  |
  v
[core.checkQuota]
  serviceSlug: 'llm-completion-tokens'
  estimatedAmount: 1000
  |
  +-- allowed=false --> [agent.prompt: "quota_exceeded_message"]
  |                       "Lo sentimos, su plan no permite mas consultas AI."
  |                       --> End
  |
  +-- allowed=true
       |
       v
  [agent.prompt: "system_prompt"]
    template: "Eres un asistente de la clinica dental {{$.tenantConfig.BUSINESS_NAME}}.
               Responde solo preguntas sobre odontologia.
               Horario: {{$.tenantConfig.SCHEDULE}}.
               Tono: {{$.tenantConfig.TONE}}."
       |
       v
  [agent.memory.read]
    Retrieve relevant memories for this patient/agent pair
       |
       v
  [agent.rag]
    vectorStore: tenant's KB vector store
    topK: 5
    query: current user message
       |
       v
  [agent.llm: "safety_check"]
    Evaluate if the query is safe (not medical emergency, not off-topic)
    tools: none (classification only)
       |
       +-- unsafe --> [agent.prompt: "safety_response"]
       |                "Esta pregunta requiere atencion medica inmediata.
       |                 Por favor llame a su dentista o visite urgencias."
       |                --> End
       |
       +-- safe
            |
            v
       [agent.toolLoop: "main_reasoning"]
         LLM with tools: kb.searchEntries, tenants.getSchedule
         maxIterations: 5
            |
            v
       [core.trackUsage]
         serviceSlug: 'llm-completion-tokens'
         amount: $.toolLoop.tokenUsage.total
            |
            v
       [agent.memory.write]
         Extract key facts from conversation
            |
            v
       End (return final response)
```

**Cross-module integration**:

| Module | Role in this workflow |
|--------|---------------------|
| module-subscriptions | Quota check via `core.checkQuota` and usage tracking via `core.trackUsage` |
| module-config | Tenant config resolution (BUSINESS_NAME, SCHEDULE, TONE) via `$.path` |
| module-knowledge-base | FAQ search via `agent.rag` node and `kb.searchEntries` tool |
| module-ai | LLM generation, embeddings for memory, vector store queries |
| module-agent-core | Tool Wrapper provides `kb.searchEntries` as an available tool |
| module-workflow-agents | Workflow engine, checkpointing, cost tracking, memory |

This single workflow demonstrates how workflow-agents ties together ALL previous modules in the platform into a cohesive agent experience.

---

## Cross-Module Summary

| Use Case | Modules Involved |
|----------|-----------------|
| UC-3: Configure tenant | workflow-agents (configSchema), module-config (cascade) |
| UC-12: VIP quotas | workflow-agents (quota nodes), module-subscriptions (limits) |
| UC-WA-1: Build workflow | workflow-agents (CRUD, visual editor) |
| UC-WA-2: Test execution | workflow-agents (execute, timeline) |
| UC-WA-3: Human review | workflow-agents (pause/resume, permissions) |
| UC-WA-4: MCP export | workflow-agents (generator), mcp-server (protocol) |
| UC-WA-5: Monitor costs | workflow-agents (cost tracker), module-subscriptions (usage) |
| UC-WA-6: Agent memory | workflow-agents (memory CRUD, embeddings) |
| Dental FAQ | ALL modules (workflow-agents, subscriptions, config, KB, AI, agent-core) |

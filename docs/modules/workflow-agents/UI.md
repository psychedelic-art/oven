# Dashboard UI — Workflow Agents

> React Admin 5 + MUI 7 components for agent workflow management.
> 13 component files in `apps/dashboard/src/components/agent-workflows/`.

---

## Menu Section

```
──── Agent Workflows ────
Agent Workflows
Executions
Memory
MCP Servers
```

Added to `CustomMenu.tsx`:
```tsx
<Divider sx={{ my: 1 }} />
<Box sx={{ px: 2, pb: 0.5 }}>
  <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>
    Agent Workflows
  </Typography>
</Box>
<Menu.ResourceItem name="agent-workflows" />
<Menu.ResourceItem name="agent-workflow-executions" />
<Menu.ResourceItem name="agent-memory" />
<Menu.ResourceItem name="mcp-servers" />
```

---

## Resource Registration

```typescript
resources: [
  {
    name: 'agent-workflows',
    list: WorkflowList,
    create: WorkflowCreate,
    edit: WorkflowEdit,
    show: WorkflowShow,
    icon: AccountTreeIcon,
    options: { label: 'Agent Workflows' },
  },
  {
    name: 'agent-workflow-executions',
    list: ExecutionList,
    show: ExecutionShow,
    icon: PlayCircleOutlineIcon,
    options: { label: 'Executions' },
  },
  {
    name: 'agent-memory',
    list: MemoryList,
    create: MemoryCreate,
    show: MemoryShow,
    icon: PsychologyIcon,
    options: { label: 'Memory' },
  },
  {
    name: 'mcp-servers',
    list: McpServerList,
    show: McpServerShow,
    icon: HubIcon,
    options: { label: 'MCP Servers' },
  },
]
```

---

## Component Specifications

### WorkflowList

**Purpose**: Paginated list of all agent workflow definitions with key metrics.

**Columns**:

| Column | Source | Component | Notes |
|--------|--------|-----------|-------|
| Name | `name` | `TextField` | Primary identifier |
| Slug | `slug` | `TextField` | Monospace font |
| Enabled | `enabled` | `BooleanField` | Green/gray dot |
| MCP Export | `mcpExport` | `BooleanField` | Toggle indicator |
| Nodes | derived | `FunctionField` | Count of states in definition |
| Version | `version` | `NumberField` | Current version number |
| Last Executed | derived | `DateField` | From latest execution record |
| Cost Total | derived | `FunctionField` | Sum of all execution costs, formatted as currency |

**Features**:
- Tenant filter (auto-applied from TenantSelector)
- Filter by `enabled` (boolean toggle)
- Sort by name, version, updatedAt
- Bulk actions: enable/disable

---

### WorkflowCreate

**Purpose**: Form for creating a new agent workflow.

**Fields**:

| Field | Component | Notes |
|-------|-----------|-------|
| Name | `TextInput` | Required, fullWidth |
| Slug | `TextInput` | Required, auto-generated from name, editable |
| Description | `TextInput multiline` | Optional, 3 rows |
| Agent Config | Nested panel | Collapsible section |
| -- Default Model | `SelectInput` | Choices from ai-providers/models |
| -- Temperature | `NumberInput` | Range 0-2, step 0.1 |
| -- Max Tokens | `NumberInput` | Range 1-8192 |
| Memory Config | Nested panel | Collapsible section |
| -- Enabled | `BooleanInput` | Toggle |
| -- Scope | `SelectInput` | Choices: "agent", "agent+user" |
| -- Retrieval Strategy | `SelectInput` | Choices: "semantic", "keyword", "hybrid" |
| MCP Export | `BooleanInput` | Toggle with tooltip explaining MCP |
| Enabled | `BooleanInput` | Default true |

**Auto-set**: `tenantId` from TenantSelector context.

---

### WorkflowEdit

**Purpose**: Edit form with access to visual editor and execution trigger.

**Layout**: Same fields as WorkflowCreate, plus:

**Toolbar Actions**:
- **"Open Visual Editor"** button -- navigates to `/#/agent-workflows/:id/editor`
  ```tsx
  <Button
    variant="outlined"
    startIcon={<EditNoteIcon />}
    onClick={() => navigate(`/agent-workflows/${record.id}/editor`)}
    sx={{ ml: 1 }}
  >
    Visual Editor
  </Button>
  ```
- **"Execute"** button -- triggers `POST /api/agent-workflows/:id/execute` with a confirmation dialog
  ```tsx
  <Button
    variant="contained"
    color="secondary"
    startIcon={<PlayArrowIcon />}
    onClick={() => setShowExecuteDialog(true)}
  >
    Execute
  </Button>
  ```

**Execute Dialog**: Modal with optional JSON input editor, "Run" and "Cancel" buttons.

---

### WorkflowShow

**Purpose**: Detail view with graph preview, config summary, and related data.

**Sections**:

1. **Header**: Name, slug, enabled badge, MCP export badge, version tag
2. **Graph Preview**: Mini ReactFlow canvas (read-only) showing the workflow graph with node type icons and edge connections. Zoomed to fit. Clicking opens the full visual editor.
3. **Config Summary**: Two columns:
   - Left: Agent Config (model, temperature, max tokens)
   - Right: Memory Config (enabled, scope, strategy)
4. **Execution History**: `ReferenceManyField` showing recent executions as a compact Datagrid (status badge, tokens, cost, duration, started). "View All" link to filtered execution list.
5. **Version History**: `ReferenceManyField` showing versions as a timeline list (version number, timestamp, "Restore" button on each).
6. **MCP Status**: If mcpExport=true, show MCP server name, tool count, last generated timestamp, link to MCP server detail.

---

### ExecutionList

**Purpose**: Paginated list of all workflow executions.

**Columns**:

| Column | Source | Component | Notes |
|--------|--------|-----------|-------|
| Workflow | `agentWorkflowId` | `ReferenceField` to agent-workflows | Show workflow name |
| Agent | `agentId` | `ReferenceField` to agents | Show agent name, nullable |
| Status | `status` | `FunctionField` | Chip with color coding |
| Tokens | `tokenUsage.total` | `NumberField` | Formatted with commas |
| Cost | `totalCostCents` | `FunctionField` | Formatted as $X.XX |
| Duration | derived | `FunctionField` | completedAt - startedAt, formatted |
| Started | `startedAt` | `DateField` | Relative time ("2 hours ago") |

**Status badge colors**:
- `running`: blue
- `paused`: amber/orange (attention-drawing)
- `completed`: green
- `failed`: red

**Filters**: By workflow, agent, status, tenant, date range.

---

### ExecutionShow

**Purpose**: Detailed execution view with node-by-node timeline.

**Layout**:

1. **Header Bar**: Workflow name, status badge, total tokens, total cost, duration. If paused: prominent "Resume" button.

2. **Node Timeline**: Vertical timeline of node executions. Each node rendered as an expandable card:

   ```
   +--------------------------------------------------+
   | [icon] assemblePrompt          agent.prompt       |
   | Status: completed    Duration: 15ms    Cost: --   |
   +--------------------------------------------------+
   | > Input:  { template: "You are a dental..." }     |
   | > Output: { systemPrompt: "You are a dental..." } |
   +--------------------------------------------------+

   +--------------------------------------------------+
   | [icon] toolLoop              agent.toolLoop       |
   | Status: completed   Duration: 3.2s   Cost: $0.12  |
   | Tokens: 1,680 (in: 1,250 / out: 430)              |
   +--------------------------------------------------+
   | > Tool Calls:                                      |
   |   [1] kb.searchEntries("office hours") -> 1 result |
   |   [2] tenants.getSchedule(5) -> schedule object    |
   | > Output: "Our office hours are Mon-Fri 9AM-5PM." |
   +--------------------------------------------------+
   ```

   **Node card elements**:
   - Type icon (color-coded by category: llm=purple, tool=blue, memory=teal, human=orange, data=gray)
   - Node ID and node type
   - Status badge (same colors as execution list)
   - Timing bar (proportional width relative to total execution time)
   - Token count (for LLM nodes only)
   - Cost (for nodes with costCents)
   - Expandable input/output JSON viewers (using `react-json-view` or similar)
   - Tool calls section (for toolExecutor/toolLoop nodes): each tool as a sub-row

3. **Paused Node Actions** (when status='paused'):
   The paused node card has a highlighted border and shows:
   ```
   +--------------------------------------------------+
   | [!] humanReview              agent.humanReview    |
   | Status: PAUSED (waiting for review)               |
   +--------------------------------------------------+
   | Proposed Action:                                  |
   | "I recommend scheduling a cleaning appointment."  |
   |                                                   |
   | [Approve]  [Edit & Continue]  [Reject]            |
   +--------------------------------------------------+
   ```

   - **Approve**: Calls resume with `action: "approve"`
   - **Edit & Continue**: Opens inline editor for the proposed data, then calls resume with `action: "edit"` and modified data
   - **Reject**: Opens a reason textarea, then calls resume with `action: "reject"` and reason

4. **Context Viewer**: Collapsible panel showing the accumulated context snapshot as formatted JSON.

---

### MemoryList

**Purpose**: List agent memory entries.

**Columns**:

| Column | Source | Component | Notes |
|--------|--------|-----------|-------|
| Agent | `agentId` | `ReferenceField` to agents | Agent name |
| User | `userId` | `ReferenceField` to users | Nullable, shows "Shared" if null |
| Key | `key` | `TextField` | Topic/category |
| Content | `content` | `FunctionField` | Truncated to 100 chars |
| Created | `createdAt` | `DateField` | Relative time |

**Filters**: By agent (dropdown), by key (text search).

---

### MemoryCreate

**Purpose**: Manually create a memory entry.

**Fields**:

| Field | Component | Notes |
|-------|-----------|-------|
| Agent | `ReferenceInput` with `AutocompleteInput` | Required, search agents |
| User | `ReferenceInput` with `AutocompleteInput` | Optional, search users |
| Key | `TextInput` | Required, e.g., "preferences", "medical_history" |
| Content | `TextInput multiline` | Required, 5 rows |

**Note**: Embedding is generated asynchronously after creation. A status indicator shows "Embedding..." then "Embedded" once complete.

---

### MemoryShow

**Purpose**: Full memory entry detail.

**Sections**:
1. **Header**: Agent name, user name (or "Shared"), key
2. **Content**: Full text content in a readable panel
3. **Metadata**: JSON viewer showing sourceSessionId, relevanceScore, extractedAt
4. **Embedding Status**: Indicator showing whether the embedding vector exists

---

### McpServerList

**Purpose**: List auto-generated MCP server definitions.

**Columns**:

| Column | Source | Component | Notes |
|--------|--------|-----------|-------|
| Name | `name` | `TextField` | Server display name |
| Workflow | `agentWorkflowId` | `ReferenceField` to agent-workflows | Source workflow |
| Status | `status` | `FunctionField` | Chip: active (green), disabled (gray) |
| Tools | derived | `FunctionField` | Count of toolDefinitions array |
| Last Generated | `lastGeneratedAt` | `DateField` | Relative time |

---

### McpServerShow

**Purpose**: MCP server detail with tool definitions and connection instructions.

**Sections**:

1. **Header**: Name, status badge, workflow link, last generated timestamp

2. **Tool Definitions**: Each tool rendered as an expandable card:
   ```
   +--------------------------------------------------+
   | dental-faq-agent                                  |
   | Invoke the Dental FAQ Agent workflow              |
   +--------------------------------------------------+
   | Input Schema:                                     |
   |   { "type": "object",                            |
   |     "properties": {                               |
   |       "messages": { "type": "array", ... }        |
   |     }                                             |
   |   }                                               |
   +--------------------------------------------------+
   ```
   JSON Schema displayed in a syntax-highlighted viewer.

3. **"Regenerate" Button**: Triggers `POST /api/mcp-servers/:id/regenerate`. Shows spinner during regeneration, then refreshes the tool definitions.

4. **Connection Instructions**: Code block showing how to connect:
   ```
   // Claude Desktop config (claude_desktop_config.json)
   {
     "mcpServers": {
       "dental-faq-agent": {
         "url": "https://your-app.vercel.app/api/mcp/dental-faq-agent"
       }
     }
   }
   ```

---

### GuardrailConfigEditor

**Purpose**: Visual editor for input/output guardrail rules within the workflow agent config.

**Layout**: Two sections side by side (or stacked on mobile):

**Input Rules Section**:
```
Input Guardrails
+--------------------------------------------------+
| [keyword v] [emergency|urgent|bl...] [escalate v] |
| Message: "This may require immediate attention." |
| [x Remove]                                        |
+--------------------------------------------------+
| [regex   v] [\d{3}-\d{2}-\d{4}    ] [block    v] |
| Message: "Please do not share SSN."              |
| [x Remove]                                        |
+--------------------------------------------------+
| [+ Add Rule]                                      |
+--------------------------------------------------+
```

**Output Rules Section**: Same layout for output guardrails.

**Rule row fields**:
- Type selector: `SelectInput` with choices: keyword, regex, classifier
- Pattern input: `TextInput` (keyword list or regex pattern)
- Action selector: `SelectInput` with choices: block, escalate, modify
- Message textarea: `TextInput multiline` (the message shown when rule triggers)
- Remove button: Removes the rule row

---

### AgentWorkflowEditorPage

**Purpose**: Visual graph editor for agent workflows. Extends the existing workflow-editor with agent-specific node palette.

**Route**: `/#/agent-workflows/:id/editor`

**Layout**:
```
+-------+----------------------------------+----------+
| Node  |                                  | Inspector|
| Palette|       ReactFlow Canvas          | Panel    |
|       |                                  |          |
| LLM   |    [prompt] --> [memory.read]    | Node     |
| Tool   |        |                        | Config   |
| Loop   |    [toolLoop] --> [memory.write]|          |
| Memory |        |                        |          |
| RAG    |     [end]                       |          |
| Human  |                                  |          |
| Sub    |                                  |          |
| Prompt |                                  |          |
| Image  |                                  |          |
| Embed  |                                  |          |
| Quota  |                                  |          |
| Usage  |                                  |          |
+-------+----------------------------------+----------+
|              Toolbar: Save | Undo | Redo           |
+----------------------------------------------------+
```

**Node Palette**: Categorized list of draggable node types:

| Category | Nodes | Color |
|----------|-------|-------|
| LLM | agent.llm | Purple |
| Tool | agent.toolExecutor, agent.toolLoop | Blue |
| Memory | agent.memory.read, agent.memory.write | Teal |
| Data | agent.rag, core.checkQuota, core.trackUsage | Gray |
| Human | agent.humanReview | Orange |
| Utility | agent.subagent, agent.prompt, agent.imageGen, agent.embed | Indigo |

Each node type in the palette shows an icon, label, and brief description tooltip.

**Inspector Panel**: When a node is selected, shows configuration fields specific to that node type:
- **agent.llm**: Model override, temperature, max tokens, tools multi-select
- **agent.toolExecutor**: Tool selection, execution mode (parallel/sequential)
- **agent.toolLoop**: Tools multi-select, max iterations
- **agent.memory.read**: Top-K, query template
- **agent.memory.write**: Extraction template
- **agent.rag**: Vector store selector, top-K, filter criteria
- **agent.humanReview**: Review reason template, assignee role
- **agent.subagent**: Agent slug selector
- **agent.prompt**: Template editor with `$.path` variable autocomplete
- **core.checkQuota**: Service slug selector, estimated amount
- **core.trackUsage**: Service slug selector, amount expression

**Conversation Preview Panel**: Collapsible bottom panel showing a simulated message flow through the graph. When the user clicks "Preview", the system traces through the graph and shows what the conversation would look like at each node.

**Toolbar**: Save, Undo, Redo, Zoom to Fit, Minimap toggle, Preview toggle.

---

## First-Time User Experience (FTUE)

When a user navigates to Agent Workflows with no workflows created:

1. **Empty state**: Large centered illustration with text "Create your first agent workflow"
2. **Template Selector**: Three cards:

   ```
   +----------------+ +----------------+ +----------------+
   |   FAQ Bot      | | RAG Pipeline   | | Multi-Agent    |
   |                | |                | |                |
   | Simple Q&A     | | Knowledge base | | Coordinator +  |
   | with KB search | | search with    | | specialist     |
   | and memory     | | context inject | | agents         |
   |                | |                | |                |
   | [Use Template] | | [Use Template] | | [Use Template] |
   +----------------+ +----------------+ +----------------+
   ```

3. Selecting a template creates a workflow pre-populated with the appropriate graph, then opens the visual editor.

---

## Microinteractions

| Interaction | Behavior |
|-------------|----------|
| Execution timeline progress | Animated vertical line moves down the timeline as nodes complete in real-time |
| Node status transitions | Node cards animate between states (running: pulse animation, completed: checkmark fade-in, failed: shake + red border) |
| Cost counter | Animated counter in execution header increments as each node's cost is recorded |
| MCP regeneration spinner | Button shows spinning icon during regeneration, switches to checkmark on completion |
| Memory embedding indicator | Pulsing dot while embedding is generated, solid dot when complete |
| Paused execution attention | Amber glow animation on paused execution rows in the list and on the paused node card |
| Template selection | Card scale-up on hover, brief loading animation when template graph is generated |
| Save confirmation | Brief green flash on the toolbar save button after successful save |

---

## Component File Manifest

```
apps/dashboard/src/components/agent-workflows/
  WorkflowList.tsx
  WorkflowCreate.tsx
  WorkflowEdit.tsx
  WorkflowShow.tsx
  ExecutionList.tsx
  ExecutionShow.tsx
  MemoryList.tsx
  MemoryCreate.tsx
  MemoryShow.tsx
  McpServerList.tsx
  McpServerShow.tsx
  GuardrailConfigEditor.tsx
  AgentWorkflowEditorPage.tsx
```

All components follow OVEN dashboard conventions:
- MUI `sx` prop for all styling (no inline `style={}`, no `className=` with custom CSS)
- `useTenantContext()` for tenant-aware filtering
- `parseListParams` / `listResponse` for pagination
- React Admin data provider for API communication

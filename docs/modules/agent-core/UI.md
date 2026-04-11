# Module Agent Core -- Dashboard UI

> React Admin views, playground integration, microinteractions, and FTUE for the agent management layer.

---

## Menu Structure

```
-------- Agents --------
Agents
Node Definitions
Sessions
Executions
```

Placed in `CustomMenu.tsx` with a section divider:

```tsx
<Divider sx={{ my: 1 }} />
<Box sx={{ px: 2, pb: 0.5 }}>
  <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>
    Agents
  </Typography>
</Box>
<Menu.ResourceItem name="agents" />
<Menu.ResourceItem name="agent-nodes" />
<Menu.ResourceItem name="agent-sessions" />
<Menu.ResourceItem name="agent-executions" />
```

---

## Resource Registration

```typescript
resources: [
  {
    name: 'agents',
    list: AgentList,
    create: AgentCreate,
    edit: AgentEdit,
    show: AgentShow,
    icon: SmartToyIcon,
    options: { label: 'Agents' },
  },
  {
    name: 'agent-nodes',
    list: AgentNodeList,
    create: AgentNodeCreate,
    edit: AgentNodeEdit,
    show: AgentNodeShow,
    icon: AccountTreeIcon,
    options: { label: 'Node Definitions' },
  },
  {
    name: 'agent-sessions',
    list: AgentSessionList,
    show: AgentSessionShow,
    icon: ChatIcon,
    options: { label: 'Sessions' },
  },
  {
    name: 'agent-executions',
    list: AgentExecutionList,
    show: AgentExecutionShow,
    icon: TimelineIcon,
    options: { label: 'Executions' },
  },
],
```

---

## Agents

### Agent List (`AgentList`)

A data grid showing all agent definitions with key summary columns and row-level actions.

**Columns:**

| Column | Source | Component | Notes |
|--------|--------|-----------|-------|
| Name | `name` | `<TextField>` | Primary column, links to show page |
| Slug | `slug` | `<TextField>` | Monospace font via `sx={{ fontFamily: 'monospace' }}` |
| Tenant | `tenantId` | `<ReferenceField reference="tenants">` | Hidden when tenant filter active |
| Model | `llmConfig.model` | `<FunctionField>` | Renders model alias with chip |
| Enabled | `enabled` | `<BooleanField>` | Green/grey toggle icon |
| Tools | `toolBindings` | `<FunctionField>` | Count badge (e.g., "5 tools") |
| Last Invoked | computed | `<DateField>` | From most recent execution timestamp |
| Actions | -- | custom | "Playground" button + Edit/Show |

**Filters:**

- Tenant selector (from global `TenantSelector` context)
- Enabled toggle
- Full-text search on name/description

**Row actions:**

```tsx
<Box sx={{ display: 'flex', gap: 1 }}>
  <Button
    variant="outlined"
    size="small"
    startIcon={<PlayArrowIcon />}
    onClick={() => navigate(`/agents/${record.id}/show/playground`)}
  >
    Playground
  </Button>
  <EditButton />
  <ShowButton />
</Box>
```

**Empty state (FTUE):**

When no agents exist, display a guided creation prompt:

```tsx
<Box sx={{ textAlign: 'center', py: 8 }}>
  <SmartToyIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
  <Typography variant="h6" gutterBottom>Create your first agent</Typography>
  <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
    Agents are AI assistants that can use your platform's tools to help users.
    Start by defining an agent with a system prompt and tool bindings.
  </Typography>
  <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/agents/create')}>
    Create Agent
  </Button>
</Box>
```

---

### Agent Create/Edit (`AgentCreate`, `AgentEdit`)

A tabbed form with six tabs for comprehensive agent configuration.

**Tab structure:**

```tsx
<TabbedForm>
  <TabbedForm.Tab label="Identity" icon={<BadgeIcon />}>
    {/* Identity fields */}
  </TabbedForm.Tab>
  <TabbedForm.Tab label="LLM Config" icon={<TuneIcon />}>
    {/* LLM configuration */}
  </TabbedForm.Tab>
  <TabbedForm.Tab label="System Prompt" icon={<DescriptionIcon />}>
    {/* Prompt editor */}
  </TabbedForm.Tab>
  <TabbedForm.Tab label="Tools" icon={<BuildIcon />}>
    {/* Tool binding selector */}
  </TabbedForm.Tab>
  <TabbedForm.Tab label="Parameters" icon={<SettingsIcon />}>
    {/* Exposed params config */}
  </TabbedForm.Tab>
  <TabbedForm.Tab label="Advanced" icon={<MoreHorizIcon />}>
    {/* Advanced settings */}
  </TabbedForm.Tab>
</TabbedForm>
```

#### Tab 1: Identity

| Field | Component | Props |
|-------|-----------|-------|
| Name | `<TextInput>` | `source="name"` `isRequired` `fullWidth` |
| Slug | `<TextInput>` | `source="slug"` `fullWidth` `helperText="Auto-generated from name. URL-safe."` Disabled on edit. |
| Description | `<TextInput>` | `source="description"` `multiline` `rows={3}` `fullWidth` |
| Tenant | `<ReferenceInput reference="tenants">` + `<AutocompleteInput>` | Optional. Only shown to platform admins. `helperText="Leave empty for platform-wide agent."` |

Tenant auto-assignment follows Rule 6.4:

```tsx
const { activeTenantId } = useTenantContext();
<Create transform={(data) => ({ ...data, tenantId: data.tenantId || activeTenantId })}>
```

#### Tab 2: LLM Config

| Field | Component | Props | Notes |
|-------|-----------|-------|-------|
| Provider | `<SelectInput>` | `source="llmConfig.provider"` `choices={providers}` | Dropdown: openai, anthropic, google |
| Model | `<AutocompleteInput>` | `source="llmConfig.model"` `choices={modelAliases}` | Autocomplete from module-ai alias registry. Shows alias + resolved model name. |
| Temperature | Custom `<SliderInput>` | `source="llmConfig.temperature"` `min={0}` `max={2}` `step={0.1}` | Slider with numeric input alongside. Tooltip: "Controls randomness. Lower = more deterministic, higher = more creative." |
| Max Tokens | `<NumberInput>` | `source="llmConfig.maxTokens"` | Tooltip: "Maximum tokens in the response. Higher values allow longer responses but cost more." |
| Top P | `<NumberInput>` | `source="llmConfig.topP"` `min={0}` `max={1}` `step={0.05}` | Tooltip: "Nucleus sampling. 1.0 considers all tokens, lower values restrict to most probable." |
| Frequency Penalty | `<NumberInput>` | `source="llmConfig.frequencyPenalty"` `min={-2}` `max={2}` `step={0.1}` | Tooltip: "Penalizes tokens based on frequency in the response so far. Reduces repetition." |
| Presence Penalty | `<NumberInput>` | `source="llmConfig.presencePenalty"` `min={-2}` `max={2}` `step={0.1}` | Tooltip: "Penalizes tokens that have appeared at all. Encourages topic diversity." |

**Temperature slider implementation:**

```tsx
<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
  <Slider
    value={temperature}
    onChange={(_, val) => setTemperature(val as number)}
    min={0}
    max={2}
    step={0.1}
    marks={[
      { value: 0, label: 'Precise' },
      { value: 1, label: 'Balanced' },
      { value: 2, label: 'Creative' },
    ]}
    sx={{ flex: 1 }}
  />
  <NumberInput source="llmConfig.temperature" sx={{ width: 80 }} />
  <Tooltip title="Controls randomness. 0 = deterministic, 2 = maximum creativity.">
    <HelpOutlineIcon sx={{ color: 'text.disabled' }} />
  </Tooltip>
</Box>
```

#### Tab 3: System Prompt

A large text editor with variable autocomplete and preview capabilities.

```tsx
<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
  <Typography variant="subtitle2" color="text.secondary">
    Write the instructions that define your agent's personality and behavior.
    Use {'{{variableName}}'} for dynamic values resolved from tenant config.
  </Typography>

  <TextInput
    source="systemPrompt"
    multiline
    rows={16}
    fullWidth
    sx={{
      '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: 14 },
    }}
  />

  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
    <Typography variant="caption" color="text.secondary">
      Available variables:
    </Typography>
    {variables.map((v) => (
      <Chip
        key={v}
        label={`{{${v}}}`}
        size="small"
        onClick={() => insertVariable(v)}
        sx={{ fontFamily: 'monospace', fontSize: 11 }}
      />
    ))}
  </Box>
</Box>
```

**Variable autocomplete:** When the user types `{{`, a dropdown appears with available variables sourced from `module-config` keys for the agent's tenant. Selecting a variable inserts `{{variableName}}` at the cursor position.

**Preview:** A "Preview" toggle below the editor shows the rendered prompt with variables substituted using the tenant's actual config values.

#### Tab 4: Tools

A grouped checklist of all discovered tools with search filtering.

```tsx
<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <TextInput
      source="_toolSearch"
      label="Search tools"
      helperText={false}
      sx={{ width: 300 }}
    />
    <Chip
      label={`${selectedCount} tools selected`}
      color="primary"
      variant="outlined"
    />
  </Box>

  {toolGroups.map((group) => (
    <Box key={group.moduleName}>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        {group.moduleLabel}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, pl: 2 }}>
        {group.tools.map((tool) => (
          <FormControlLabel
            key={tool.name}
            control={
              <Checkbox
                checked={toolBindings.includes(tool.name)}
                onChange={() => toggleTool(tool.name)}
              />
            }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {tool.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {tool.description}
                </Typography>
              </Box>
            }
          />
        ))}
      </Box>
    </Box>
  ))}
</Box>
```

**Grouping:** Tools are grouped by `moduleName` (e.g., "Knowledge Base", "AI", "Maps"). Each group is collapsible.

**Search filter:** The search input filters tools by name or description in real time. Matched text is highlighted.

**Tooltip per tool:** Hovering over a tool name shows its full description, parameters, and required permissions.

#### Tab 5: Parameters

A checkbox list of LLM config fields that API callers are allowed to override per-invocation.

```tsx
<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
    Select which LLM parameters API callers can override when invoking this agent.
    Non-selected parameters will always use the saved defaults.
  </Typography>

  {parameterOptions.map((param) => (
    <FormControlLabel
      key={param.key}
      control={
        <Checkbox
          checked={exposedParams.includes(param.key)}
          onChange={() => toggleParam(param.key)}
        />
      }
      label={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2">{param.label}</Typography>
          <Tooltip title={param.helpText}>
            <HelpOutlineIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
          </Tooltip>
        </Box>
      }
    />
  ))}
</Box>
```

**Parameter options with help text:**

| Key | Label | Help Text |
|-----|-------|-----------|
| `model` | Model | "Allow callers to select a different model (within the same provider)." |
| `temperature` | Temperature | "Allow callers to adjust creativity/randomness per request." |
| `maxTokens` | Max Tokens | "Allow callers to control response length per request." |
| `topP` | Top P | "Allow callers to adjust nucleus sampling." |
| `frequencyPenalty` | Frequency Penalty | "Allow callers to tune repetition avoidance." |
| `presencePenalty` | Presence Penalty | "Allow callers to tune topic diversity." |

#### Tab 6: Advanced

| Field | Component | Notes |
|-------|-----------|-------|
| Workflow Agent | `<ReferenceInput reference="workflow-agent-definitions">` + `<AutocompleteInput>` | Optional link to a workflow-agent graph for multi-step reasoning. `helperText="Link to a workflow-agent for complex multi-step execution."` |
| Input Modalities | `<CheckboxGroupInput>` | `choices={[{id:'text',name:'Text'},{id:'image',name:'Image'},{id:'audio',name:'Audio'}]}` |
| Metadata | `<JsonInput>` | JSON code editor for arbitrary key-value metadata |

---

### Agent Show (`AgentShow`)

A detail page combining configuration summary, recent activity, and playground access.

**Layout:**

```
+----------------------------------------------------------+
|  Agent: Dental FAQ Assistant              [Open Playground]|
|  dental-faq | Tenant: Dental Clinic | v3  [Edit]          |
+----------------------------------------------------------+
|                                                            |
|  +------------------+  +--------------------------------+ |
|  | Config Summary   |  | Execution Stats                | |
|  |                  |  |                                  | |
|  | Provider: openai |  | Avg Tokens: 1,285/invocation   | |
|  | Model: fast      |  | Avg Latency: 2.3s              | |
|  | Temp: 0.3        |  | Error Rate: 2.1%                | |
|  | MaxTokens: 1024  |  | Total Invocations: 1,247       | |
|  | Tools: 2 bound   |  | Total Tokens: 1,602,345        | |
|  | Params: 2 exposed|  +--------------------------------+ |
|  +------------------+                                      |
|                                                            |
|  +-------------------------------------------------------+|
|  | Recent Sessions                                        ||
|  |                                                        ||
|  | Session #42 | "Office hours inquiry" | 5 msgs | Active||
|  | Session #38 | "Insurance questions"  | 12 msgs| Active||
|  | Session #35 | "Playground test"      | 3 msgs | Active||
|  +-------------------------------------------------------+|
|                                                            |
|  +-------------------------------------------------------+|
|  | Version History                                        ||
|  |                                                        ||
|  | v3 | 2026-03-28 | "Switched to smart model"  [Restore]||
|  | v2 | 2026-03-20 | "Added kb tools"           [Restore]||
|  | v1 | 2026-03-15 | (initial)                           ||
|  +-------------------------------------------------------+|
+----------------------------------------------------------+
```

**Config summary card**: Renders key agent configuration in a compact card with MUI `<Chip>` components for tools and exposed params.

**Execution stats**: Aggregated from `agent_executions` using a custom data provider call. Displayed as `<Typography variant="h4">` values with `<Typography variant="caption">` labels.

**Recent sessions**: Last 5 sessions with message count and status. Each row links to the session show page.

**Version history**: All versions with restore buttons. The "Restore" button opens a confirmation dialog before executing `POST /api/agents/[id]/versions/[versionId]/restore`.

**Toolbar actions:**

```tsx
<Box sx={{ display: 'flex', gap: 1 }}>
  <Button
    variant="contained"
    startIcon={<PlayArrowIcon />}
    onClick={() => navigate(`/agents/${record.id}/show/playground`)}
  >
    Open Playground
  </Button>
  <EditButton />
</Box>
```

---

## Node Definitions

### Node Definition List (`AgentNodeList`)

**Columns:**

| Column | Source | Component | Notes |
|--------|--------|-----------|-------|
| Name | `name` | `<TextField>` | |
| Slug | `slug` | `<TextField>` | Monospace |
| Category | `category` | `<ChipField>` | Color-coded by category |
| System | `isSystem` | `<BooleanField>` | Lock icon for system nodes |
| Description | `description` | `<TextField>` | Truncated to 80 chars |

**Grouping:** Optionally group by category using `<Datagrid rowSx>` alternating background colors per category group.

**Category color map:**

| Category | Color |
|----------|-------|
| `llm` | `primary` (blue) |
| `tool` | `success` (green) |
| `condition` | `warning` (orange) |
| `transform` | `info` (light blue) |
| `human-in-the-loop` | `error` (red) |
| `memory` | `secondary` (purple) |

**Expandable schema viewer:** Each row expands to show the node's input/output/config schemas in a formatted JSON tree.

---

## Sessions

### Session List (`AgentSessionList`)

**Columns:**

| Column | Source | Component | Notes |
|--------|--------|-----------|-------|
| Agent | `agentId` | `<ReferenceField reference="agents">` | Shows agent name |
| Tenant | `tenantId` | `<ReferenceField reference="tenants">` | Hidden when tenant filter active |
| User | `userId` | `<ReferenceField reference="users">` | Shows user name/email |
| Title | `title` | `<TextField>` | Truncated |
| Status | `status` | `<ChipField>` | Green chip for active, grey for archived |
| Messages | computed | `<FunctionField>` | Count of messages |
| Playground | `isPlayground` | `<BooleanField>` | Flask icon for playground sessions |
| Created | `createdAt` | `<DateField>` | |

**Filters:** Agent (dropdown), tenant (from context), status, isPlayground toggle.

---

### Session Show (`AgentSessionShow`)

A conversational view displaying the full message history in a chat bubble layout.

**Layout:**

```
+----------------------------------------------------------+
| Session #42: "Office hours inquiry"                       |
| Agent: Dental FAQ | User: patient@email.com | Active      |
+----------------------------------------------------------+
|                                                            |
|       [System] You are a helpful dental assistant...       |
|                                                            |
|                        What are your office hours?  [User] |
|                                                            |
| [Assistant]                                                |
| Our office hours are Monday through Friday, 8 AM to 6 PM, |
| and Saturday 9 AM to 1 PM.                                |
|                                                            |
|   +----------------------------------------------------+  |
|   | Tool Call: kb.searchEntries                         |  |
|   | Args: { query: "office hours" }                     |  |
|   | Result: { entries: [{ question: "What are...",      |  |
|   |   answer: "Mon-Fri 8-6, Sat 9-1" }] }              |  |
|   | Latency: 120ms                                 [v]  |  |
|   +----------------------------------------------------+  |
|                                                            |
| [Metadata] gpt-4o-mini | 1,285 tokens | 2.3s              |
|                                                            |
|                            And on weekends?         [User] |
|                                                            |
| [Assistant]                                                |
| On Saturdays we're open from 9 AM to 1 PM. We are         |
| closed on Sundays.                                         |
|                                                            |
+----------------------------------------------------------+
```

**Message rendering by role:**

| Role | Alignment | Background | Avatar |
|------|-----------|------------|--------|
| `user` | Right | `primary.light` | User icon |
| `assistant` | Left | `background.paper` | Bot icon |
| `system` | Center | `action.hover` | Settings icon |
| `tool` | Left (indented) | `grey.100` | Build icon |

**Tool call cards:** Rendered as expandable `<Accordion>` components between the assistant message and its tool results. Default state: collapsed showing tool name and latency. Expanded state: shows full arguments and result JSON with syntax highlighting.

**Per-message metadata:** Displayed as a subtle caption below each assistant message showing the model used, token count, and latency.

---

## Executions

### Execution List (`AgentExecutionList`)

**Columns:**

| Column | Source | Component | Notes |
|--------|--------|-----------|-------|
| Agent | `agentId` | `<ReferenceField reference="agents">` | Agent name |
| Session | `sessionId` | `<FunctionField>` | Links to session show |
| Status | `status` | `<ChipField>` | Green (completed), red (failed), yellow (running) |
| Tokens | `tokenUsage.total` | `<NumberField>` | Formatted with commas |
| Latency | `latencyMs` | `<FunctionField>` | Formatted as "2.3s" or "120ms" |
| Tools Used | `toolsUsed` | `<FunctionField>` | Count badge, expandable to list |
| Started | `startedAt` | `<DateField>` | Relative time ("2 hours ago") |

**Status badge colors:**

| Status | Color | Icon |
|--------|-------|------|
| `running` | `warning` | Spinner |
| `completed` | `success` | Check |
| `failed` | `error` | Close |

**Filters:** Agent (dropdown), session, status, date range.

---

### Execution Show (`AgentExecutionShow`)

A timeline view showing each graph node execution as a step with detailed input/output inspection.

**Layout:**

```
+----------------------------------------------------------+
| Execution #156                                             |
| Agent: Dental FAQ | Session: #42 | Status: Completed      |
| Duration: 2.34s | Tokens: 1,285 | Started: 2 hours ago    |
+----------------------------------------------------------+
|                                                            |
| Effective LLM Config:                                      |
| provider: openai | model: gpt-4o-mini | temp: 0.1         |
| maxTokens: 1024 | topP: 1.0                               |
|                                                            |
| Timeline:                                                  |
|                                                            |
| [=] prompt         0ms  ----+                              |
|                              |  2ms                        |
| [=] llm          2ms   -----+--------------------+        |
|                              |  1850ms             |       |
|    > Tool call: kb.searchEntries                   |       |
|      Args: { query: "office hours" }               |       |
|                                                    |       |
| [=] tools       1852ms -----+----+                |       |
|                              |    | 120ms          |       |
|    > kb.searchEntries: 120ms |    |                |       |
|      Result: { entries: [...] }   |                |       |
|                                   |                |       |
| [=] llm         1972ms -----+----+--------+       |       |
|                              |             | 368ms |       |
|    > Final response generated |             |       |       |
|                               |             |       |       |
| [v] done        2340ms ------+-------------+       |       |
|                                                            |
+----------------------------------------------------------+
```

**Timeline steps:** Each node execution is rendered as a horizontal bar with:

- **Status indicator**: Green check (success), red X (failure), yellow spinner (running).
- **Node name**: The graph node ID.
- **Timing bar**: Proportional width showing relative duration. Color intensity indicates percentage of total time.
- **Start time**: Milliseconds from execution start.
- **Expandable detail**: Click to expand JSON viewers for input state and output state.

**Tool call detail:** Tool calls within a node are shown as nested items with their own timing and expandable result viewer.

**Input/output JSON viewer:** Uses a syntax-highlighted, collapsible JSON tree component. Large values (over 500 characters) are collapsed by default with a "Show full" toggle.

---

## Microinteractions

### Streaming Text in Playground

When the agent streams a response in the playground:

1. Tokens appear one by one with a subtle fade-in animation (`opacity: 0 -> 1` over 100ms).
2. A blinking cursor (vertical bar) appears at the end of the streaming text.
3. The chat container auto-scrolls to keep the latest content visible.
4. The "Send" button is replaced with a "Stop" button during streaming.

### Tool Call Card Expand Animation

Tool call cards in the session show and playground use a smooth expand/collapse animation:

```tsx
<Accordion
  TransitionProps={{ unmountOnExit: true }}
  sx={{
    '&.MuiAccordion-root': {
      transition: 'all 200ms ease-in-out',
    },
  }}
>
```

### Execution Timeline Progress Animation

In the execution show page, the timeline bars animate on initial load:

1. Each bar starts at width 0 and grows to its proportional width over 500ms.
2. Bars animate sequentially with a 100ms stagger between nodes.
3. The total duration counter counts up from 0 to the final value.

### Status Badge Transitions

Status badges transition smoothly when an execution completes:

- `running` (yellow, with pulse animation) transitions to `completed` (green, with brief scale-up) or `failed` (red, with shake animation).

### Tool Count Badge Update

On the agent edit Tools tab, the "N tools selected" chip updates with a subtle bounce animation when tools are checked/unchecked.

---

## Tooltips

All LLM configuration parameters display help tooltips on hover:

| Parameter | Tooltip |
|-----------|---------|
| Provider | "The AI service provider (OpenAI, Anthropic, Google). Determines available models." |
| Model | "The specific model to use. Can be an alias (fast, smart) or a direct model ID (gpt-4o-mini)." |
| Temperature | "Controls randomness. 0 = deterministic (always the same answer), 2 = maximum creativity. Most agents work best between 0.1 and 0.7." |
| Max Tokens | "Maximum number of tokens in the response. 1 token is roughly 4 characters. Higher values allow longer responses but increase cost and latency." |
| Top P | "Nucleus sampling parameter. 1.0 considers all tokens. Lower values (e.g., 0.9) restrict to the most probable tokens. Usually leave at 1.0 and adjust temperature instead." |
| Frequency Penalty | "Reduces repetition of frequently used words. 0 = no penalty, 2 = strong penalty. Useful for reducing verbosity." |
| Presence Penalty | "Encourages the model to discuss new topics. 0 = no penalty, 2 = strong push for novelty. Useful for brainstorming." |

Tool binding tooltips show the tool's description, parameter list, and required permissions.

---

## First-Time User Experience (FTUE)

### Agent List Empty State

When no agents exist:

1. Display the "Create your first agent" card (described above in Agent List).
2. The "Create Agent" button navigates to the create form with pre-populated defaults:
   - Model: "fast"
   - Temperature: 0.7
   - Max Tokens: 1024
   - Input modalities: ["text"]

### Post-Creation CTA

After creating the first agent, the show page displays a prominent CTA:

```tsx
<Alert severity="info" sx={{ mb: 2 }}>
  <AlertTitle>Agent created successfully</AlertTitle>
  Test your agent in the playground to see how it responds before enabling it for users.
  <Button
    variant="outlined"
    size="small"
    startIcon={<PlayArrowIcon />}
    onClick={() => navigate(`/agents/${record.id}/show/playground`)}
    sx={{ mt: 1 }}
  >
    Test in Playground
  </Button>
</Alert>
```

### Guided Tool Selection

On the first visit to the Tools tab (when no tools are bound), display a helper message:

```tsx
<Alert severity="info" sx={{ mb: 2 }}>
  Tools let your agent interact with platform data. Select the tools your agent needs --
  it will only be able to use the tools you choose here.
</Alert>
```

### System Prompt Templates

On the first visit to the System Prompt tab (when prompt is empty), offer starter templates:

```tsx
<Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
  <Chip label="FAQ Bot" onClick={() => setTemplate('faq')} />
  <Chip label="Appointment Scheduler" onClick={() => setTemplate('scheduler')} />
  <Chip label="Data Analyst" onClick={() => setTemplate('analyst')} />
  <Chip label="Custom" onClick={() => setTemplate('custom')} variant="outlined" />
</Box>
```

Each template pre-fills the system prompt textarea with a domain-appropriate starting point that includes `{{variable}}` placeholders.

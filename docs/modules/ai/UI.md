# Module AI -- Dashboard UI

> React Admin resources, playground, usage dashboard, and FTUE design.
> All components use MUI 7 with the `sx` prop for styling (per CLAUDE.md rules).

---

## Menu Structure

```
---- AI Services ----
Providers
Model Aliases
Vector Stores
Tool Catalog
Playground
Usage & Budgets
Extensions
```

Menu section added in `CustomMenu.tsx`:

```tsx
<Divider sx={{ my: 1 }} />
<Box sx={{ px: 2, pb: 0.5 }}>
  <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>
    AI Services
  </Typography>
</Box>
<Menu.ResourceItem name="ai-providers" />
<Menu.ResourceItem name="ai-aliases" />
<Menu.ResourceItem name="ai-vector-stores" />
<Menu.ResourceItem name="ai-tools" />
<Menu.Item to="/ai/playground" primaryText="Playground" leftIcon={<ScienceIcon />} />
<Menu.Item to="/ai/usage" primaryText="Usage & Budgets" leftIcon={<BarChartIcon />} />
<Menu.Item to="/ai/extensions" primaryText="Extensions" leftIcon={<ExtensionIcon />} />
```

---

## 1. Provider Management

### Provider List (`AiProviderList`)

A Datagrid with status indicators and quick actions.

**Status Indicators**:
| Status | Visual | Meaning |
|--------|--------|---------|
| Connected + Enabled | Green dot | Provider is active and last connection test passed |
| Error | Red dot | Last connection test failed (shows error on hover) |
| Disabled | Gray dot | Provider is disabled (enabled=false) |
| Untested | Yellow dot | Provider has never been tested |

**Columns**:

| Column | Component | Notes |
|--------|-----------|-------|
| Status | Custom `StatusIndicator` | Color dot based on test status |
| Name | `TextField` | Provider display name |
| Type | `ChipField` | Provider type with icon (OpenAI logo, Anthropic logo, etc.) |
| Slug | `TextField` | Machine identifier |
| Default Model | `TextField` | Default model ID |
| Rate Limits | Custom | "500 RPM / 200K TPM" format |
| Enabled | `BooleanField` | Toggle switch |
| Actions | `EditButton`, `TestButton` | Standard + custom test action |

**Tenant Filtering**: When `activeTenantId` is set, show platform-wide (tenantId=null) + tenant-scoped providers. Without tenant filter, show all.

### Provider Create/Edit (`AiProviderForm`)

Tabbed form with four sections:

**Tab 1: Identity**
- Name (`TextInput`, required)
- Slug (`TextInput`, required, auto-generated from name)
- Type (`SelectInput`: openai, anthropic, google, custom)
- Enabled (`BooleanInput`, default true)
- Tenant (`ReferenceInput` to tenants, optional -- null for platform-wide)

**Tab 2: Credentials**
- API Key (`PasswordInput`, shows dots, only sent when changed)
  - Helper text: "Leave empty to keep existing key"
- Base URL (`TextInput`, optional)
  - Helper text: "Custom endpoint for self-hosted models or proxies"

**Tab 3: Rate Limits**
- Requests per Minute (`NumberInput`, optional)
  - Tooltip: "Maximum requests per minute to this provider. Leave empty for no limit."
- Tokens per Minute (`NumberInput`, optional)
  - Tooltip: "Maximum tokens per minute across all models. Leave empty for no limit."

**Tab 4: Default Model**
- Default Model (`TextInput`)
  - Tooltip: "Fallback model ID when a caller doesn't specify one"
- Metadata (`JsonInput` with code editor)
  - Tooltip: "Provider-specific config (organization, project, pricing)"

### Test Connection Button

Located on the provider Show and Edit pages. Triggers `POST /api/ai-providers/[id]/test`.

**States**:
| State | Visual |
|-------|--------|
| Idle | Outlined button "Test Connection" |
| Testing | Button disabled, CircularProgress spinner, "Testing..." |
| Success | Green checkmark, "Connected (245ms latency)" |
| Failed | Red X icon, error message in Alert component |

The test calls the provider with a minimal request (list models or send a trivial prompt) and measures round-trip latency.

---

## 2. Model Alias Management

### Alias List (`AiAliasList`)

Compact Datagrid with inline quick-edit support.

**Columns**:

| Column | Component | Notes |
|--------|-----------|-------|
| Alias | `TextField` | Bold, monospace font |
| Provider | `ReferenceField` to ai-providers | Shows provider name |
| Model ID | `TextField` | Monospace |
| Type | `ChipField` | Color-coded: text=blue, embedding=green, image=purple, object=orange |
| Enabled | `BooleanField` | Toggle |
| Actions | `EditButton`, `DeleteButton` | Standard |

**Quick-Edit**: Clicking the alias row opens an inline edit row (React Admin `<EditableDatagrid>` pattern) for fast alias updates without navigating away.

### Alias Create/Edit (`AiAliasForm`)

Single-panel `SimpleForm`:

- Alias (`TextInput`, required, unique)
  - Tooltip: "Friendly name used in API calls (e.g., 'fast', 'smart', 'cheap')"
- Provider (`ReferenceInput` to ai-providers, required)
- Model ID (`TextInput`, required)
  - Tooltip: "Provider-specific model identifier (e.g., 'gpt-4o-mini', 'claude-sonnet-4-20250514')"
- Type (`SelectInput`: text, embedding, image, object)
- Default Settings (`JsonInput`)
  - Tooltip: "Default parameters applied when this alias is used. Example: { \"temperature\": 0.3, \"maxTokens\": 1024 }"
- Enabled (`BooleanInput`)

---

## 3. Vector Store Management

### Vector Store List (`AiVectorStoreList`)

**Adapter Icons**:
| Adapter | Icon | Visual |
|---------|------|--------|
| pgvector | Elephant icon (PostgreSQL) | Blue chip |
| Pinecone | Pine cone icon | Green chip |

**Columns**:

| Column | Component | Notes |
|--------|-----------|-------|
| Name | `TextField` | |
| Slug | `TextField` | Monospace |
| Adapter | Custom `AdapterChip` | Icon + label |
| Dimensions | `NumberField` | |
| Distance Metric | `ChipField` | |
| Document Count | `NumberField` | Formatted with commas |
| Tenant | `ReferenceField` to tenants | |
| Enabled | `BooleanField` | |

### Vector Store Create/Edit (`AiVectorStoreForm`)

**Dynamic Fields**: The form fields change based on the selected adapter.

**Common fields** (always shown):
- Name (`TextInput`, required)
- Slug (`TextInput`, required)
- Tenant (`ReferenceInput` to tenants, required)
- Adapter (`SelectInput`: pgvector, pinecone)
- Embedding Provider (`ReferenceInput` to ai-providers)
- Embedding Model (`TextInput`)
- Dimensions (`NumberInput`, required)
  - Tooltip: "Must match the embedding model's output dimensions (e.g., 1536 for text-embedding-3-small)"
- Distance Metric (`SelectInput`: cosine, euclidean, dotProduct)
  - Tooltip: "Cosine is recommended for most use cases. Euclidean for spatial data. Dot product for normalized vectors."
- Enabled (`BooleanInput`)

**pgvector-specific fields** (shown when adapter=pgvector):
- Table Name (`TextInput`, default: auto-generated)
- Index Type (`SelectInput`: hnsw, ivfflat)
  - Tooltip: "HNSW is faster for queries, IVFFlat is faster to build. HNSW recommended for most cases."

**Pinecone-specific fields** (shown when adapter=pinecone):
- API Key (`PasswordInput`)
- Environment (`TextInput`, e.g., "us-east-1")
- Index Name (`TextInput`)
- Namespace (`TextInput`)
  - Tooltip: "Namespace for tenant isolation within the index"

---

## 4. AI Playground

Custom page at `/ai/playground` with a tabbed interface for testing AI capabilities.

### Layout

```
+---------------------------------------------------------------+
|  AI Playground                                                 |
+---------------------------------------------------------------+
|  [Text Generation] [Embeddings] [Image Gen] [Structured]      |
+---------------------------------------------------------------+
|                                                                |
|  (Tab content varies by selection)                             |
|                                                                |
+---------------------------------------------------------------+
```

### Text Generation Tab

```
+---------------------------------------------------------------+
| Model: [ fast          v ]  Temperature: [====|====] 0.7      |
| Stream: [x]                 Max Tokens:  [ 1024     ]         |
+---------------------------------------------------------------+
| System Prompt:                                                 |
| +-----------------------------------------------------------+ |
| | You are a helpful assistant.                               | |
| +-----------------------------------------------------------+ |
|                                                                |
| User Message:                                                  |
| +-----------------------------------------------------------+ |
| | Explain quantum computing in simple terms.                 | |
| |                                                            | |
| +-----------------------------------------------------------+ |
|                                                                |
|                                    [ Generate ]                |
|                                                                |
+---------------------------------------------------------------+
| Response:                                                      |
| +-----------------------------------------------------------+ |
| | Quantum computing uses quantum mechanical phenomena...     | |
| | [streaming text appears character by character]            | |
| +-----------------------------------------------------------+ |
|                                                                |
| Tokens: 45 in / 230 out | Cost: $0.002 | Latency: 1.2s       |
+---------------------------------------------------------------+
```

**Model Selector**: Dropdown populated from `GET /api/ai-aliases` + `GET /api/ai-providers` (shows aliases first, then `provider:model` entries).

**Temperature Slider**: MUI Slider from 0.0 to 2.0, step 0.1. Tooltip: "Controls randomness. Lower = more deterministic, higher = more creative."

**Stream Toggle**: Checkbox. When enabled, response appears token-by-token via SSE. When disabled, response appears all at once.

**Streaming Animation**: Response text area has a blinking cursor during streaming. Tokens appear with a subtle fade-in. The tokens/cost counter increments in real-time as tokens arrive.

### Embeddings Tab

```
+---------------------------------------------------------------+
| Model: [ text-embedding-3-small v ]                            |
+---------------------------------------------------------------+
| Input Text:                                                    |
| +-----------------------------------------------------------+ |
| | The billing policy for overdue accounts states that...     | |
| +-----------------------------------------------------------+ |
|                                                                |
|                                    [ Embed ]                   |
|                                                                |
+---------------------------------------------------------------+
| Embedding Result:                              Dimensions: 1536|
| +-----------------------------------------------------------+ |
| | [0.0023, -0.0145, 0.0367, -0.0089, 0.0156, ...]          | |
| +-----------------------------------------------------------+ |
|                                                                |
| Vector Preview (first 50 dimensions):                          |
| +-----------------------------------------------------------+ |
| | [mini bar chart visualization of vector values]            | |
| +-----------------------------------------------------------+ |
|                                                                |
| Tokens: 12 | Latency: 85ms                                    |
+---------------------------------------------------------------+
```

**Vector Preview**: A small bar chart (Recharts) showing the first 50 dimensions as vertical bars. Positive values blue, negative values red. Gives a visual fingerprint of the embedding.

### Image Generation Tab

```
+---------------------------------------------------------------+
| Model: [ dall-e-3      v ]                                     |
| Size:  [ 1024x1024     v ]  Quality: [ hd       v ]           |
| Style: [ natural       v ]                                     |
+---------------------------------------------------------------+
| Prompt:                                                        |
| +-----------------------------------------------------------+ |
| | A serene mountain landscape at sunset with a calm lake     | |
| +-----------------------------------------------------------+ |
|                                                                |
|                                    [ Generate ]                |
|                                                                |
+---------------------------------------------------------------+
| Generated Image:                                               |
| +-----------------------------------------------------------+ |
| |                                                            | |
| |            [Generated image preview]                       | |
| |                                                            | |
| +-----------------------------------------------------------+ |
|                                                                |
| Cost: $0.08 | Latency: 12.3s                                  |
+---------------------------------------------------------------+
```

**Image Preview**: Rendered in a MUI Card with maxWidth constraint. Click to expand in a Dialog with full resolution. Download button available.

### Structured Output Tab

```
+---------------------------------------------------------------+
| Model: [ smart         v ]                                     |
+---------------------------------------------------------------+
| JSON Schema:                                                   |
| +-----------------------------------------------------------+ |
| | {                                                          | |
| |   "type": "object",                                       | |
| |   "properties": {                                          | |
| |     "name": { "type": "string" },                         | |
| |     "email": { "type": "string", "format": "email" }     | |
| |   },                                                       | |
| |   "required": ["name", "email"]                            | |
| | }                                                          | |
| +-----------------------------------------------------------+ |
|                                                                |
| Prompt:                                                        |
| +-----------------------------------------------------------+ |
| | Extract contact info: John Smith, john@acme.com            | |
| +-----------------------------------------------------------+ |
|                                                                |
|                                    [ Generate ]                |
|                                                                |
+---------------------------------------------------------------+
| Generated Object:                                              |
| +-----------------------------------------------------------+ |
| | {                                                          | |
| |   "name": "John Smith",                                   | |
| |   "email": "john@acme.com"                                | |
| | }                                                          | |
| +-----------------------------------------------------------+ |
|                                                                |
| Tokens: 85 in / 45 out | Cost: $0.001 | Valid: Yes            |
+---------------------------------------------------------------+
```

**Schema Editor**: Monaco editor (or CodeMirror) with JSON syntax highlighting. Validates JSON on blur.

**Validation Indicator**: Green checkmark "Valid" if the generated object passes schema validation. Red X with error path if it fails.

---

## 5. Usage Dashboard

Custom page at `/ai/usage` with Recharts visualizations.

### Layout

```
+---------------------------------------------------------------+
| Usage Dashboard                                                |
| Period: [ Last 30 days v ]  Tenant: [ All tenants v ]         |
+---------------------------------------------------------------+
|                                                                |
| +---------------------------+ +-----------------------------+  |
| | Tokens per Day            | | Cost per Provider           |  |
| | [Line chart]              | | [Bar chart]                 |  |
| |                           | |                             |  |
| | --- Input tokens          | | [OpenAI  |||||||||| $340 ]  |  |
| | --- Output tokens         | | [Anthro  |||||     $116 ]  |  |
| +---------------------------+ +-----------------------------+  |
|                                                                |
| +---------------------------+ +-----------------------------+  |
| | Usage by Model (pie)     | | Budget Utilization          |  |
| |                           | |                             |  |
| |    [gpt-4o-mini 45%]     | | Global:  [=========|  ] 82% |  |
| |    [claude-3.5  30%]     | | Tenant5: [======|     ] 63% |  |
| |    [gemini-2.0  15%]     | | OpenAI:  [==========| ] 91% |  |
| |    [other       10%]     | |                             |  |
| +---------------------------+ +-----------------------------+  |
|                                                                |
+---------------------------------------------------------------+
```

### Charts

**Tokens per Day** (Recharts `LineChart`):
- X-axis: date
- Y-axis: token count
- Two lines: input tokens (blue), output tokens (green)
- Tooltip on hover shows exact values

**Cost per Provider** (Recharts `BarChart`):
- X-axis: provider name
- Y-axis: cost in dollars
- Color-coded by provider
- Click a bar to filter the dashboard to that provider

**Usage by Model** (Recharts `PieChart`):
- Segments sized by token count
- Legend with model name and percentage
- Click a segment to filter

**Budget Utilization** (Custom component with MUI `LinearProgress`):
- Progress bar for each active budget
- Color transitions: green (0-70%), yellow (70-90%), red (90-100%)
- Alert threshold marker shown as a vertical line on the bar
- Label: "scope: current / limit (percentage%)"
- Click to navigate to budget edit page

---

## 6. Budget Management

### Budget List (`AiBudgetList`)

**Columns**:

| Column | Component | Notes |
|--------|-----------|-------|
| Scope | `ChipField` | Color: global=purple, tenant=blue, agent=green, provider=orange |
| Scope Entity | `ReferenceField` | Conditional reference based on scope |
| Period | `ChipField` | daily/weekly/monthly |
| Token Limit | `NumberField` | Formatted with commas |
| Cost Limit | Custom | "$100.00" format (cents to dollars) |
| Utilization | Custom `UtilizationBar` | Progress bar with percentage |
| Enabled | `BooleanField` | Toggle |
| Alerts | Custom `AlertBadge` | Red badge with count of unacknowledged alerts |

### Budget Create/Edit (`AiBudgetForm`)

- Scope (`SelectInput`: global, tenant, agent, provider)
- Scope Entity (conditional `ReferenceInput` -- shows tenant/agent/provider picker based on scope)
- Period Type (`SelectInput`: daily, weekly, monthly)
- Token Limit (`NumberInput`, optional)
  - Tooltip: "Maximum tokens allowed per period. Leave empty for cost-only limits."
- Cost Limit (`NumberInput`, display as dollars, store as cents)
  - Tooltip: "Maximum spending per period in dollars. Leave empty for token-only limits."
- Alert Threshold (`SliderInput`, 0-100%, default 80%)
  - Tooltip: "Percentage at which a warning alert is generated."
- Enabled (`BooleanInput`)

---

## 7. Tool Catalog

### Tool List (`AiToolList`)

Expandable card layout (not a standard Datagrid).

**Card Layout**:

```
+---------------------------------------------------------------+
| [Language Icon] ai.generateText                        [Test]  |
| Generate text using a language model                           |
|                                                                |
| Category: language  |  System: Yes  |  Enabled: Yes           |
|                                                                |
| [v Expand to see schemas]                                      |
+---------------------------------------------------------------+
```

**Expanded View**:

```
+---------------------------------------------------------------+
| [Language Icon] ai.generateText                        [Test]  |
| Generate text using a language model                           |
|                                                                |
| Input Schema:                                                  |
| +-----------------------------------------------------------+ |
| | {                                                          | |
| |   "type": "object",                                       | |
| |   "properties": {                                          | |
| |     "model": { "type": "string" },                        | |
| |     "prompt": { "type": "string" },                       | |
| |     ...                                                    | |
| |   }                                                        | |
| | }                                                          | |
| +-----------------------------------------------------------+ |
|                                                                |
| Output Schema:                                                 |
| +-----------------------------------------------------------+ |
| | { "type": "object", "properties": { "text": ... } }       | |
| +-----------------------------------------------------------+ |
+---------------------------------------------------------------+
```

**Test Button**: Opens a dialog pre-populated with the tool's input schema as a JSON form. User fills in values, clicks "Invoke", sees the result.

---

## 8. Extensions Page

Custom page at `/ai/extensions`.

```
+---------------------------------------------------------------+
| Extensions                                                     |
+---------------------------------------------------------------+
| +-----------------------------------------------------------+ |
| | pgvector                                                   | |
| | PostgreSQL vector similarity search extension              | |
| |                                                            | |
| | Status: [Green] Installed  Version: 0.7.4                 | |
| |                                                            | |
| | Required for: pgvector-backed vector stores                | |
| |                                                            | |
| |                           [ Reinstall ]  (disabled if ok)  | |
| +-----------------------------------------------------------+ |
|                                                                |
+---------------------------------------------------------------+
```

**Status States**:
| State | Visual | Action Button |
|-------|--------|--------------|
| Installed | Green chip "Installed" + version | "Reinstall" (disabled) |
| Not Installed | Red chip "Not Installed" | "Install" (enabled, primary color) |
| Error | Orange chip "Error" + error message | "Retry Install" (enabled) |

---

## 9. FTUE (First-Time User Experience)

A setup wizard shown when a user first visits the AI Services section and no providers are configured.

### Wizard Steps

**Step 1 of 4: Add Your First Provider**

```
+---------------------------------------------------------------+
| Welcome to AI Services                              Step 1/4  |
+---------------------------------------------------------------+
|                                                                |
| To get started, add your first AI provider.                    |
|                                                                |
| Choose a provider:                                             |
| [OpenAI (Recommended)]  [Anthropic]  [Google]                  |
|                                                                |
| API Key:                                                       |
| [ *************************************** ]                    |
|                                                                |
| Where to find your API key:                                    |
| > OpenAI: platform.openai.com/api-keys                        |
|                                                                |
|                                    [ Next --> ]                |
+---------------------------------------------------------------+
```

**Step 2 of 4: Test Connection**

```
+---------------------------------------------------------------+
| Testing Connection                                  Step 2/4  |
+---------------------------------------------------------------+
|                                                                |
|                  [Spinner]                                      |
|              Testing OpenAI...                                  |
|                                                                |
|              [Green Checkmark]                                  |
|           Connected! Latency: 245ms                             |
|                                                                |
|                                    [ Next --> ]                |
+---------------------------------------------------------------+
```

Auto-executes the connection test. On failure, shows error and "Back" button to re-enter key.

**Step 3 of 4: Create Default Alias**

```
+---------------------------------------------------------------+
| Set Up Your Default Model                           Step 3/4  |
+---------------------------------------------------------------+
|                                                                |
| We'll create a "default" alias so all AI features work         |
| out of the box.                                                |
|                                                                |
| Default Model: [ gpt-4o     v ]                                |
|                                                                |
| (You can add more aliases later in Model Aliases)              |
|                                                                |
|                                    [ Next --> ]                |
+---------------------------------------------------------------+
```

Model dropdown populated from the provider's available models.

**Step 4 of 4: Try the Playground**

```
+---------------------------------------------------------------+
| Try It Out!                                         Step 4/4  |
+---------------------------------------------------------------+
|                                                                |
| Send your first AI request:                                    |
|                                                                |
| [ What is the capital of France?                    ]          |
|                                                                |
|                                    [ Generate ]                |
|                                                                |
| "The capital of France is Paris."                              |
|                                                                |
| It works! You're ready to use AI Services.                     |
|                                                                |
|                                [ Go to Dashboard --> ]         |
+---------------------------------------------------------------+
```

### FTUE Detection

The wizard is shown when:
1. User navigates to any AI Services page
2. `GET /api/ai-providers` returns 0 results
3. No `AI_FTUE_COMPLETED` key in localStorage

After completion, `AI_FTUE_COMPLETED=true` is set in localStorage.

---

## 10. Tooltips and Microinteractions

### Tooltips on Technical Fields

Every technical field in module-ai forms has an explanatory tooltip:

| Field | Tooltip Text |
|-------|-------------|
| Temperature | "Controls randomness. Lower values (0.0-0.3) produce more deterministic output. Higher values (0.7-2.0) produce more creative output." |
| Max Tokens | "Maximum number of tokens to generate. One token is roughly 4 characters of English text." |
| Dimensions | "Number of dimensions in the embedding vector. Must match the model's native dimension (e.g., 1536 for text-embedding-3-small)." |
| Distance Metric | "How similarity is calculated. Cosine: angle between vectors (most common). Euclidean: straight-line distance. Dot Product: magnitude-aware similarity." |
| Rate Limit RPM | "Maximum requests per minute to this provider. Prevents exceeding the provider's rate limits and incurring errors." |
| Alert Threshold | "Percentage of budget at which a warning notification is generated. Set to 80 to be alerted at 80% utilization." |
| API Key | "Your provider's API key. Encrypted at rest. Never displayed after saving." |
| Base URL | "Custom API endpoint. Leave empty for the provider's default. Used for self-hosted models, Azure OpenAI, or proxy endpoints." |

### Microinteractions

| Interaction | Animation | Component |
|------------|-----------|-----------|
| Streaming response | Characters appear one-by-one with a blinking cursor | Playground text tab |
| Cost counter | Numbers increment with easing animation as tokens arrive | Playground footer |
| Budget gauge fill | Progress bar animates from 0 to current value on page load | Usage dashboard |
| Test connection | Button morphs to spinner, then to checkmark/X | Provider form |
| Provider status dot | Subtle pulse animation on green dots | Provider list |
| Expand tool card | Smooth height transition with ease-in-out | Tool catalog |
| Tab switch | Content fades in with 150ms transition | Playground |

### Streaming Response Animation Details

The playground text generation tab shows streaming responses with visual feedback:

1. **Cursor**: A blinking vertical bar (`|`) at the end of the text during streaming.
2. **Token appearance**: Each token fades in with `opacity: 0 -> 1` over 100ms.
3. **Footer counters**: Input tokens shown immediately. Output tokens increment in real-time. Cost updates as `outputTokens * modelPrice` changes.
4. **Status indicator**: Shows "Generating..." during streaming, "Complete" when done, "Error" on failure.
5. **Abort button**: A stop icon appears during streaming that sends an abort signal to cancel the SSE connection.

---

## 11. Resource Configuration

```typescript
resources: [
  {
    name: 'ai-providers',
    list: AiProviderList,
    create: AiProviderCreate,
    edit: AiProviderEdit,
    show: AiProviderShow,
    icon: SmartToyIcon,
    options: { label: 'Providers' },
  },
  {
    name: 'ai-aliases',
    list: AiAliasList,
    create: AiAliasCreate,
    edit: AiAliasEdit,
    icon: LabelIcon,
    options: { label: 'Model Aliases' },
  },
  {
    name: 'ai-vector-stores',
    list: AiVectorStoreList,
    create: AiVectorStoreCreate,
    edit: AiVectorStoreEdit,
    show: AiVectorStoreShow,
    icon: StorageIcon,
    options: { label: 'Vector Stores' },
  },
  {
    name: 'ai-tools',
    list: AiToolList,
    show: AiToolShow,
    icon: BuildIcon,
    options: { label: 'Tool Catalog' },
  },
  {
    name: 'ai-budgets',
    list: AiBudgetList,
    create: AiBudgetCreate,
    edit: AiBudgetEdit,
    icon: AccountBalanceIcon,
    options: { label: 'Budgets' },
  },
  {
    name: 'ai-usage-logs',
    list: AiUsageLogList,
    icon: TimelineIcon,
    options: { label: 'Usage Logs' },
  },
],

customRoutes: [
  { path: '/ai/playground', component: AiPlayground },
  { path: '/ai/usage', component: AiUsageDashboard },
  { path: '/ai/extensions', component: AiExtensions },
],
```

# Module AI -- API Reference

> All endpoints with request/response schemas, HTTP methods, and authentication requirements.
> All endpoints require authentication unless marked `(public)`.
> All list endpoints return `Content-Range` header for React Admin pagination.

---

## Provider Management

### GET /api/ai-providers

List configured AI providers. Supports tenant filtering.

**Query Parameters** (React Admin standard):

| Param | Type | Description |
|-------|------|-------------|
| `sort` | string | `["field","ASC\|DESC"]` |
| `range` | string | `[start, end]` |
| `filter` | string | JSON: `{ enabled, providerType, tenantId }` |

**Response** `200 OK`:

```json
[
  {
    "id": 1,
    "tenantId": null,
    "name": "OpenAI Production",
    "slug": "openai",
    "type": "openai",
    "apiKeyEncrypted": "sk-...3kF9",
    "baseUrl": null,
    "defaultModel": "gpt-4o",
    "rateLimitRpm": 500,
    "rateLimitTpm": 200000,
    "enabled": true,
    "metadata": {},
    "createdAt": "2026-03-01T00:00:00Z",
    "updatedAt": "2026-03-01T00:00:00Z"
  }
]
```

**Headers**: `Content-Range: ai-providers 0-24/3`

**Permission**: `ai-providers.read`

---

### POST /api/ai-providers

Create a new AI provider.

**Request Body**:

```json
{
  "name": "Anthropic Production",
  "slug": "anthropic",
  "type": "anthropic",
  "apiKeyEncrypted": "sk-ant-...",
  "baseUrl": null,
  "defaultModel": "claude-sonnet-4-20250514",
  "rateLimitRpm": 300,
  "rateLimitTpm": 100000,
  "enabled": true,
  "tenantId": null,
  "metadata": {}
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable name |
| `slug` | string | Yes | Unique identifier (kebab-case) |
| `type` | string | Yes | AI SDK provider type: `openai`, `anthropic`, `google`, `custom` |
| `apiKeyEncrypted` | string | Yes | API key (encrypted before storage) |
| `baseUrl` | string | No | Custom API endpoint URL |
| `defaultModel` | string | No | Default model ID for this provider |
| `rateLimitRpm` | integer | No | Requests per minute limit |
| `rateLimitTpm` | integer | No | Tokens per minute limit |
| `enabled` | boolean | No | Default: true |
| `tenantId` | integer | No | Null for platform-wide, set for tenant-scoped |
| `metadata` | object | No | Additional provider-specific config |

**Response** `201 Created`: Created provider (API key masked).

**Errors**:
- `409 Conflict`: Slug already exists
- `422 Unprocessable Entity`: Invalid provider type

**Permission**: `ai-providers.create`

**Event Emitted**: `ai.provider.created`

---

### GET /api/ai-providers/[id]

Get a single provider. API key is masked.

**Response** `200 OK`: Provider object with `apiKeyEncrypted: "sk-...xxxx"`.

**Errors**: `404 Not Found`

**Permission**: `ai-providers.read`

---

### PUT /api/ai-providers/[id]

Update a provider. Send `apiKeyEncrypted: null` to keep existing key.

**Request Body**: Same fields as POST (all optional).

**Response** `200 OK`: Updated provider.

**Permission**: `ai-providers.update`

**Event Emitted**: `ai.provider.updated`

---

### DELETE /api/ai-providers/[id]

Delete a provider. Fails if model aliases reference it.

**Response** `204 No Content`

**Errors**:
- `404 Not Found`
- `409 Conflict`: Aliases reference this provider

**Permission**: `ai-providers.delete`

**Event Emitted**: `ai.provider.deleted`

---

## Model Alias Management

### GET /api/ai-aliases

List model aliases.

**Query Parameters**: Standard React Admin (sort, range, filter).

**Filter Fields**: `{ type, providerId, enabled }`

**Response** `200 OK`:

```json
[
  {
    "id": 1,
    "alias": "fast",
    "providerId": 1,
    "modelId": "gpt-4o-mini",
    "type": "text",
    "defaultSettings": { "temperature": 0.3, "maxTokens": 1024 },
    "enabled": true,
    "createdAt": "2026-03-01T00:00:00Z",
    "updatedAt": "2026-03-01T00:00:00Z"
  }
]
```

**Permission**: `ai-aliases.read`

---

### POST /api/ai-aliases

Create a model alias.

**Request Body**:

```json
{
  "alias": "smart",
  "providerId": 2,
  "modelId": "claude-sonnet-4-20250514",
  "type": "text",
  "defaultSettings": { "temperature": 0.7 },
  "enabled": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `alias` | string | Yes | Unique alias name |
| `providerId` | integer | Yes | FK to ai_providers |
| `modelId` | string | Yes | Provider-specific model identifier |
| `type` | string | Yes | `text`, `embedding`, `image`, `object` |
| `defaultSettings` | object | No | Default parameters (temperature, maxTokens, etc.) |
| `enabled` | boolean | No | Default: true |

**Response** `201 Created`

**Errors**: `409 Conflict` (duplicate alias), `422` (invalid type)

**Permission**: `ai-aliases.create`

**Event Emitted**: `ai.alias.created`

---

### PUT /api/ai-aliases/[id]

Update an alias. All fields optional.

**Permission**: `ai-aliases.update`

---

### DELETE /api/ai-aliases/[id]

Delete an alias.

**Response** `204 No Content`

**Permission**: `ai-aliases.delete`

**Event Emitted**: `ai.alias.deleted`

---

## Vector Store Management

### GET /api/ai-vector-stores

List vector store configurations.

**Filter Fields**: `{ tenantId, adapter, enabled }`

**Response** `200 OK`:

```json
[
  {
    "id": 1,
    "tenantId": 5,
    "name": "Knowledge Base",
    "slug": "knowledge-base",
    "adapter": "pgvector",
    "connectionConfig": "••••••••",
    "embeddingProviderId": 1,
    "embeddingModel": "text-embedding-3-small",
    "dimensions": 1536,
    "distanceMetric": "cosine",
    "documentCount": 4523,
    "enabled": true,
    "metadata": {},
    "createdAt": "2026-03-01T00:00:00Z",
    "updatedAt": "2026-03-01T00:00:00Z"
  }
]
```

**Permission**: `ai-vector-stores.read`

---

### POST /api/ai-vector-stores

Create a vector store.

**Request Body**:

```json
{
  "tenantId": 5,
  "name": "Product Catalog",
  "slug": "product-catalog",
  "adapter": "pinecone",
  "connectionConfig": {
    "apiKey": "pc-...",
    "environment": "us-east-1",
    "indexName": "products"
  },
  "embeddingProviderId": 1,
  "embeddingModel": "text-embedding-3-small",
  "dimensions": 1536,
  "distanceMetric": "cosine",
  "metadata": {}
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tenantId` | integer | Yes | Owning tenant |
| `name` | string | Yes | Human-readable name |
| `slug` | string | Yes | Unique identifier |
| `adapter` | string | Yes | `pgvector` or `pinecone` |
| `connectionConfig` | object | Yes | Adapter-specific config (encrypted) |
| `embeddingProviderId` | integer | No | Provider for auto-embedding |
| `embeddingModel` | string | No | Embedding model ID |
| `dimensions` | integer | Yes | Vector dimensionality |
| `distanceMetric` | string | No | `cosine` (default), `euclidean`, `dotProduct` |
| `metadata` | object | No | Additional metadata |

**Response** `201 Created`

**Permission**: `ai-vector-stores.create`

**Event Emitted**: `ai.vectorStore.created`

---

### GET /api/ai-vector-stores/[id]

Get vector store details. Connection config is masked.

**Permission**: `ai-vector-stores.read`

---

### PUT /api/ai-vector-stores/[id]

Update vector store config. Send `connectionConfig: null` to keep existing.

**Permission**: `ai-vector-stores.update`

**Event Emitted**: `ai.vectorStore.updated`

---

### DELETE /api/ai-vector-stores/[id]

Delete a vector store configuration. Does not delete the underlying data in the backend.

**Permission**: `ai-vector-stores.delete`

**Event Emitted**: `ai.vectorStore.deleted`

---

## Budget Management

### GET /api/ai-budgets

List budgets.

**Filter Fields**: `{ scope, scopeId, periodType, enabled }`

**Response** `200 OK`:

```json
[
  {
    "id": 1,
    "scope": "tenant",
    "scopeId": 5,
    "periodType": "monthly",
    "tokenLimit": 500000,
    "costLimitCents": 10000,
    "currentTokens": 123456,
    "currentCostCents": 2345,
    "alertThresholdPct": 80,
    "enabled": true,
    "createdAt": "2026-03-01T00:00:00Z",
    "updatedAt": "2026-03-15T12:00:00Z"
  }
]
```

**Permission**: `ai-budgets.read`

---

### POST /api/ai-budgets

Create a budget.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scope` | string | Yes | `global`, `tenant`, `agent`, `provider` |
| `scopeId` | integer | Conditional | Required unless scope=global |
| `periodType` | string | Yes | `daily`, `weekly`, `monthly` |
| `tokenLimit` | integer | No | Max tokens per period (null = no token limit) |
| `costLimitCents` | integer | No | Max cost in cents per period (null = no cost limit) |
| `alertThresholdPct` | integer | No | Alert at this % of limit (default: 80) |
| `enabled` | boolean | No | Default: true |

**Response** `201 Created`

**Permission**: `ai-budgets.create`

---

### PUT /api/ai-budgets/[id]

Update a budget.

**Permission**: `ai-budgets.update`

---

### DELETE /api/ai-budgets/[id]

Delete a budget.

**Permission**: `ai-budgets.delete`

---

## Usage Logs

### GET /api/ai-usage-logs

List usage logs. Filterable, paginated.

**Filter Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `tenantId` | integer | Filter by tenant |
| `providerId` | integer | Filter by provider |
| `modelId` | string | Filter by model |
| `toolName` | string | Filter by tool |
| `status` | string | `success`, `error`, `rate_limited` |
| `createdAt_gte` | ISO date | Start of date range |
| `createdAt_lte` | ISO date | End of date range |

**Response** `200 OK`:

```json
[
  {
    "id": 1,
    "tenantId": 5,
    "providerId": 1,
    "modelId": "gpt-4o-mini",
    "toolName": "ai.generateText",
    "inputTokens": 150,
    "outputTokens": 320,
    "totalTokens": 470,
    "costCents": 2,
    "latencyMs": 1250,
    "status": "success",
    "requestMetadata": { "userId": 12, "agentId": null },
    "createdAt": "2026-03-15T14:30:00Z"
  }
]
```

**Permission**: `ai-usage-logs.read`

---

### GET /api/ai/usage/summary

Aggregated usage statistics.

**Query Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `tenantId` | integer | Filter by tenant (optional) |
| `periodType` | string | `day`, `week`, `month` |
| `startDate` | ISO date | Start of period |
| `endDate` | ISO date | End of period |
| `groupBy` | string | `provider`, `model`, `tool`, `tenant` |

**Response** `200 OK`:

```json
{
  "period": { "start": "2026-03-01", "end": "2026-03-31" },
  "totals": {
    "totalTokens": 2450000,
    "totalCostCents": 45600,
    "totalRequests": 12500,
    "avgLatencyMs": 890
  },
  "breakdown": [
    {
      "groupKey": "openai",
      "totalTokens": 1800000,
      "totalCostCents": 34000,
      "totalRequests": 9500,
      "avgLatencyMs": 750
    },
    {
      "groupKey": "anthropic",
      "totalTokens": 650000,
      "totalCostCents": 11600,
      "totalRequests": 3000,
      "avgLatencyMs": 1200
    }
  ]
}
```

**Permission**: `ai-usage-logs.read`

---

## AI Execution Endpoints

### POST /api/ai/generate

Non-streaming text generation.

**Request Body**:

```json
{
  "model": "fast",
  "prompt": "Explain quantum computing in simple terms.",
  "system": "You are a helpful science teacher.",
  "temperature": 0.7,
  "maxTokens": 500
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | string | No | Alias, `provider:model`, or null (use default) |
| `prompt` | string | Yes | User prompt |
| `system` | string | No | System message |
| `temperature` | number | No | 0.0-2.0, controls randomness |
| `maxTokens` | integer | No | Maximum output tokens |

**Response** `200 OK`:

```json
{
  "text": "Quantum computing uses...",
  "usage": {
    "inputTokens": 45,
    "outputTokens": 230,
    "totalTokens": 275
  },
  "finishReason": "stop",
  "model": "gpt-4o-mini",
  "provider": "openai"
}
```

**Errors**:
- `422`: Invalid model, guardrail violation
- `429`: Rate limited or budget exceeded
- `502`: Upstream provider error

**Permission**: `ai-tools.invoke`

---

### POST /api/ai/stream

Streaming text generation via Server-Sent Events. Compatible with `@ai-sdk/react` `useChat` hook.

**Request Body**: Same as `/api/ai/generate`.

**Response** `200 OK` (SSE stream):

```
data: {"type":"text-delta","textDelta":"Quantum "}
data: {"type":"text-delta","textDelta":"computing "}
data: {"type":"text-delta","textDelta":"uses..."}
data: {"type":"finish","finishReason":"stop","usage":{"inputTokens":45,"outputTokens":230}}
```

**Content-Type**: `text/event-stream`

**Permission**: `ai-tools.invoke`

---

### POST /api/ai/generate-image

Generate an image from a text prompt.

**Request Body**:

```json
{
  "model": "openai:dall-e-3",
  "prompt": "A serene mountain landscape at sunset",
  "size": "1024x1024",
  "quality": "hd",
  "style": "natural",
  "n": 1
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | string | No | Image model alias or `provider:model` |
| `prompt` | string | Yes | Image description |
| `size` | string | No | `256x256`, `512x512`, `1024x1024`, `1024x1792`, `1792x1024` |
| `quality` | string | No | `standard`, `hd` |
| `style` | string | No | `natural`, `vivid` |
| `n` | integer | No | Number of images (default: 1) |

**Response** `200 OK`:

```json
{
  "images": [
    {
      "url": "https://...",
      "base64": null,
      "revisedPrompt": "A serene mountain landscape..."
    }
  ],
  "usage": { "images": 1 },
  "model": "dall-e-3",
  "provider": "openai"
}
```

**Permission**: `ai-tools.invoke`

---

### POST /api/ai/generate-object

Generate a structured object conforming to a JSON Schema.

**Request Body**:

```json
{
  "model": "smart",
  "prompt": "Extract the contact information from this text: John Smith, CEO at Acme Corp, john@acme.com, (555) 123-4567",
  "schema": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "title": { "type": "string" },
      "company": { "type": "string" },
      "email": { "type": "string", "format": "email" },
      "phone": { "type": "string" }
    },
    "required": ["name", "email"]
  }
}
```

**Response** `200 OK`:

```json
{
  "object": {
    "name": "John Smith",
    "title": "CEO",
    "company": "Acme Corp",
    "email": "john@acme.com",
    "phone": "(555) 123-4567"
  },
  "usage": {
    "inputTokens": 85,
    "outputTokens": 45,
    "totalTokens": 130
  }
}
```

**Permission**: `ai-tools.invoke`

---

### POST /api/ai/embed

Embed a single text value.

**Request Body**:

```json
{
  "model": "text-embedding-3-small",
  "value": "The billing policy for overdue accounts..."
}
```

**Response** `200 OK`:

```json
{
  "embedding": [0.0023, -0.0145, 0.0367, ...],
  "dimensions": 1536,
  "usage": { "tokens": 12 },
  "model": "text-embedding-3-small",
  "provider": "openai"
}
```

**Permission**: `ai-tools.invoke`

---

### POST /api/ai/embed-many

Batch embed multiple text values.

**Request Body**:

```json
{
  "model": "text-embedding-3-small",
  "values": [
    "First document text...",
    "Second document text...",
    "Third document text..."
  ]
}
```

**Response** `200 OK`:

```json
{
  "embeddings": [
    [0.0023, -0.0145, ...],
    [0.0156, 0.0089, ...],
    [-0.0034, 0.0234, ...]
  ],
  "dimensions": 1536,
  "usage": { "tokens": 36 },
  "model": "text-embedding-3-small",
  "provider": "openai"
}
```

**Permission**: `ai-tools.invoke`

---

## Tool Catalog

### GET /api/ai/tools

List all registered AI tools with their schemas.

**Query Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Filter by category: `language`, `embedding`, `image`, `vector`, `document` |
| `enabled` | boolean | Filter by enabled status |

**Response** `200 OK`:

```json
[
  {
    "id": 1,
    "name": "ai.generateText",
    "slug": "ai-generate-text",
    "category": "language",
    "description": "Generate text using a language model",
    "inputSchema": { "type": "object", "properties": { "model": {}, "prompt": {}, "system": {} } },
    "outputSchema": { "type": "object", "properties": { "text": {}, "usage": {} } },
    "handler": "generate",
    "isSystem": true,
    "enabled": true,
    "createdAt": "2026-03-01T00:00:00Z",
    "updatedAt": "2026-03-01T00:00:00Z"
  }
]
```

**Permission**: `ai-tools.read`

---

## Extensions

### GET /api/ai/extensions/status

Check pgvector extension status.

**Response** `200 OK`:

```json
{
  "pgvector": {
    "installed": true,
    "version": "0.7.4",
    "availableVersion": "0.7.4"
  }
}
```

**Permission**: `ai-providers.read`

---

### POST /api/ai/extensions/install

Install the pgvector extension.

**Response** `200 OK`:

```json
{
  "pgvector": {
    "installed": true,
    "version": "0.7.4",
    "action": "created"
  }
}
```

**Errors**:
- `500`: Extension not available on database host

**Permission**: `ai-providers.create`

---

## MCP Tool Definitions

Module AI registers the following action schemas in its `chat` block for agent discovery via the Module Registry:

| Action Name | Method | Path | Description |
|------------|--------|------|-------------|
| `ai.generate` | POST | `ai/generate` | Generate text |
| `ai.stream` | POST | `ai/stream` | Stream text generation |
| `ai.generateObject` | POST | `ai/generate-object` | Generate structured output |
| `ai.generateImage` | POST | `ai/generate-image` | Generate image |
| `ai.embed` | POST | `ai/embed` | Embed text |
| `ai.embedMany` | POST | `ai/embed-many` | Batch embed |
| `ai.vectorStore.upsert` | POST | `ai-vector-stores/{slug}/upsert` | Upsert vectors |
| `ai.vectorStore.query` | POST | `ai-vector-stores/{slug}/query` | Semantic search |
| `ai.vectorStore.delete` | POST | `ai-vector-stores/{slug}/delete` | Delete vectors |

All MCP actions require the `ai-tools.invoke` permission.

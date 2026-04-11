# Knowledge Base -- API Reference

> All REST endpoints and MCP tool definitions for `module-knowledge-base`.

---

## Endpoint Summary

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/kb-categories` | Required | List categories |
| POST | `/api/kb-categories` | Required | Create category |
| GET | `/api/kb-categories/[id]` | Required | Get category |
| PUT | `/api/kb-categories/[id]` | Required | Update category |
| DELETE | `/api/kb-categories/[id]` | Required | Delete category |
| GET | `/api/kb-entries` | Required | List entries |
| POST | `/api/kb-entries` | Required | Create entry (auto-embeds) |
| GET | `/api/kb-entries/[id]` | Required | Get entry |
| PUT | `/api/kb-entries/[id]` | Required | Update entry (re-embeds if content changed) |
| DELETE | `/api/kb-entries/[id]` | Required | Delete entry |
| GET | `/api/kb-entries/[id]/versions` | Required | List entry versions |
| POST | `/api/kb-entries/[id]/versions/[versionId]/restore` | Required | Restore entry to version |
| POST | `/api/knowledge-base/[tenantSlug]/search` | **Public** | Semantic + keyword search |
| POST | `/api/knowledge-base/[tenantSlug]/ingest` | Required | Bulk re-embed entries |
| GET | `/api/knowledge-base/[tenantSlug]/stats` | Required | Tenant KB statistics |

---

## 1. Category Endpoints

### GET /api/kb-categories

List categories with pagination, sorting, and filtering.

**Query Parameters** (parsed by `parseListParams`):

| Param | Type | Description |
|---|---|---|
| `sort` | `string` | JSON array: `["order","ASC"]` |
| `range` | `string` | JSON array: `[0,24]` |
| `filter` | `string` | JSON object: `{"tenantId":5,"enabled":true}` |

**Response** (200):
```json
[
  {
    "id": 1,
    "tenantId": 5,
    "name": "Agendamiento",
    "slug": "agendamiento",
    "description": "Como agendar, cancelar, reagendar citas",
    "icon": "EventNote",
    "order": 1,
    "enabled": true,
    "entryCount": 8,
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-15T10:00:00.000Z"
  }
]
```

**Headers**: `Content-Range: kb-categories 0-24/10`

**Permission**: `kb-categories.read`

---

### POST /api/kb-categories

Create a new category.

**Request Body**:
```json
{
  "name": "Agendamiento",
  "slug": "agendamiento",
  "description": "Como agendar, cancelar, reagendar citas",
  "icon": "EventNote",
  "order": 1,
  "enabled": true
}
```

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `name` | string | Yes | - | Category display name |
| `slug` | string | No | Auto from name | URL-safe identifier, unique per tenant |
| `description` | string | No | null | Optional description |
| `icon` | string | No | null | MUI icon name |
| `order` | number | No | 0 | Display order (lower first) |
| `enabled` | boolean | No | true | Whether entries are searchable |

**Response** (201):
```json
{
  "id": 1,
  "tenantId": 5,
  "name": "Agendamiento",
  "slug": "agendamiento",
  "description": "Como agendar, cancelar, reagendar citas",
  "icon": "EventNote",
  "order": 1,
  "enabled": true,
  "createdAt": "2026-01-15T10:00:00.000Z",
  "updatedAt": "2026-01-15T10:00:00.000Z"
}
```

**Event emitted**: `kb.category.created` with `{ id, tenantId, name, slug }`

**Permission**: `kb-categories.create`

**Errors**:
- 400: Missing required `name`
- 409: Slug already exists for this tenant

---

### GET /api/kb-categories/[id]

Get a single category by ID.

**Response** (200):
```json
{
  "id": 1,
  "tenantId": 5,
  "name": "Agendamiento",
  "slug": "agendamiento",
  "description": "Como agendar, cancelar, reagendar citas",
  "icon": "EventNote",
  "order": 1,
  "enabled": true,
  "entryCount": 8,
  "createdAt": "2026-01-15T10:00:00.000Z",
  "updatedAt": "2026-01-15T10:00:00.000Z"
}
```

**Permission**: `kb-categories.read`

**Errors**: 404 if not found or not in tenant scope.

---

### PUT /api/kb-categories/[id]

Update a category.

**Request Body** (partial update):
```json
{
  "name": "Agendamiento de Citas",
  "order": 2,
  "enabled": false
}
```

**Response** (200): Updated category object.

**Event emitted**: `kb.category.updated` with `{ id, tenantId, name }`

**Permission**: `kb-categories.update`

---

### DELETE /api/kb-categories/[id]

Delete a category. Fails if entries exist under this category.

**Response** (200): `{ id: 1 }`

**Event emitted**: `kb.category.deleted` with `{ id, tenantId, slug }`

**Permission**: `kb-categories.delete`

**Errors**: 409 if category has entries (must move or delete entries first).

---

## 2. Entry Endpoints

### GET /api/kb-entries

List entries with filters.

**Query Parameters** (parsed by `parseListParams`):

| Param | Type | Description |
|---|---|---|
| `sort` | `string` | JSON array: `["priority","DESC"]` |
| `range` | `string` | JSON array: `[0,24]` |
| `filter` | `string` | JSON object with optional keys below |

**Filter keys**:

| Key | Type | Description |
|---|---|---|
| `tenantId` | number | Filter by tenant |
| `categoryId` | number | Filter by category |
| `enabled` | boolean | Filter by enabled state |
| `language` | string | Filter by language code |
| `q` | string | Full-text search on question field (ILIKE) |

**Response** (200):
```json
[
  {
    "id": 42,
    "tenantId": 5,
    "categoryId": 1,
    "question": "Como puedo agendar una cita?",
    "answer": "Puede agendar su cita llamando al...",
    "keywords": ["agendar", "cita", "reservar"],
    "priority": 8,
    "language": "es",
    "enabled": true,
    "version": 3,
    "metadata": {
      "embeddingStatus": "embedded",
      "embeddedAt": "2026-01-15T10:05:00.000Z",
      "embeddingModel": "text-embedding-3-small"
    },
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-20T14:30:00.000Z"
  }
]
```

**Headers**: `Content-Range: kb-entries 0-24/42`

**Note**: The `embedding` vector column is never included in list responses (too large). It is only used internally for search.

**Permission**: `kb-entries.read`

---

### POST /api/kb-entries

Create a new entry. Triggers auto-embedding.

**Request Body**:
```json
{
  "categoryId": 1,
  "question": "Como puedo agendar una cita?",
  "answer": "Puede agendar su cita llamando al (555) 123-4567...",
  "keywords": ["agendar", "cita", "reservar", "turno"],
  "priority": 8,
  "language": "es",
  "enabled": true
}
```

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `categoryId` | number | Yes | - | FK to `kb_categories` |
| `question` | string | Yes | - | The FAQ question |
| `answer` | string | Yes | - | The FAQ answer |
| `keywords` | string[] | No | [] | Keyword tags for fallback search |
| `priority` | number | No | 0 | 0-10, higher wins ties |
| `language` | string | No | `'es'` | ISO language code |
| `enabled` | boolean | No | true | Whether searchable |

**Response** (201): Created entry object with `metadata.embeddingStatus: 'pending'`.

**Side Effects**:
1. Embedding pipeline triggered asynchronously.
2. Event emitted: `kb.entry.created` with `{ id, tenantId, categoryId, question, language }`.
3. Usage tracked: 1 unit of `ai-embeddings` service (when embedding completes).

**Permission**: `kb-entries.create`

**Errors**:
- 400: Missing `question`, `answer`, or `categoryId`
- 404: `categoryId` not found in tenant scope

---

### GET /api/kb-entries/[id]

Get a single entry with full detail.

**Response** (200):
```json
{
  "id": 42,
  "tenantId": 5,
  "categoryId": 1,
  "question": "Como puedo agendar una cita?",
  "answer": "Puede agendar su cita llamando al...",
  "keywords": ["agendar", "cita", "reservar"],
  "priority": 8,
  "language": "es",
  "enabled": true,
  "version": 3,
  "metadata": {
    "embeddingStatus": "embedded",
    "embeddedAt": "2026-01-15T10:05:00.000Z",
    "embeddingModel": "text-embedding-3-small"
  },
  "category": {
    "id": 1,
    "name": "Agendamiento",
    "slug": "agendamiento"
  },
  "createdAt": "2026-01-15T10:00:00.000Z",
  "updatedAt": "2026-01-20T14:30:00.000Z"
}
```

**Permission**: `kb-entries.read`

---

### PUT /api/kb-entries/[id]

Update an entry. Re-embeds if `question` or `answer` changed. Auto-creates version snapshot.

**Request Body** (partial update):
```json
{
  "question": "Como puedo agendar una cita dental?",
  "answer": "Updated answer with new phone number...",
  "versionDescription": "Updated phone number"
}
```

| Field | Type | Notes |
|---|---|---|
| `question` | string | Triggers re-embed if changed |
| `answer` | string | Triggers re-embed if changed |
| `keywords` | string[] | No re-embed |
| `categoryId` | number | No re-embed |
| `priority` | number | No re-embed |
| `language` | string | No re-embed |
| `enabled` | boolean | No re-embed |
| `versionDescription` | string | Stored on the version snapshot as changelog note |

**Response** (200): Updated entry object.

**Side Effects** (when content changes):
1. Version snapshot created in `kb_entry_versions`.
2. Entry `version` incremented.
3. Embedding pipeline triggered (status set to `pending`).
4. Event emitted: `kb.entry.updated` with `{ id, tenantId, question, version }`.

**Permission**: `kb-entries.update`

---

### DELETE /api/kb-entries/[id]

Delete an entry and all its versions.

**Response** (200): `{ id: 42 }`

**Side Effects**:
1. All rows in `kb_entry_versions` for this entry deleted.
2. Event emitted: `kb.entry.deleted` with `{ id, tenantId, question }`.

**Permission**: `kb-entries.delete`

---

### GET /api/kb-entries/[id]/versions

List all version snapshots for an entry.

**Response** (200):
```json
[
  {
    "id": 15,
    "entryId": 42,
    "version": 2,
    "question": "Como puedo agendar una cita?",
    "answer": "Old answer text...",
    "keywords": ["agendar", "cita"],
    "description": "Initial version",
    "createdAt": "2026-01-15T10:00:00.000Z"
  },
  {
    "id": 10,
    "entryId": 42,
    "version": 1,
    "question": "Como agendo una cita?",
    "answer": "Original answer...",
    "keywords": ["agendar"],
    "description": null,
    "createdAt": "2026-01-10T08:00:00.000Z"
  }
]
```

Ordered by `version DESC` (most recent first).

**Permission**: `kb-entries.read`

---

### POST /api/kb-entries/[id]/versions/[versionId]/restore

Restore an entry to a previous version. This creates a new version (append-only), not a rollback.

**Request Body**: None (or optional `{ description: "Restored from v2" }`).

**Response** (200):
```json
{
  "id": 42,
  "version": 4,
  "question": "Como puedo agendar una cita?",
  "answer": "Old answer text...",
  "metadata": {
    "embeddingStatus": "pending",
    "restoredFrom": 2
  }
}
```

**Side Effects**:
1. Current content snapshot created as version N.
2. Restored content written to main entry as version N+1.
3. Embedding pipeline triggered (content changed).
4. Event emitted: `kb.entry.updated`.

**Permission**: `kb-entries.update`

**Errors**: 404 if version not found.

---

## 3. Public Search Endpoint

### POST /api/knowledge-base/[tenantSlug]/search

Semantic + keyword hybrid search. **Public** -- no authentication required.

**URL Parameters**:

| Param | Type | Description |
|---|---|---|
| `tenantSlug` | string | Tenant's URL slug (e.g., `clinica-norte`) |

**Request Body**:
```json
{
  "query": "Cual es el horario de atencion?",
  "language": "es",
  "categorySlug": "horarios",
  "maxResults": 5
}
```

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `query` | string | Yes | - | Search query text |
| `language` | string | No | null | Filter results by language |
| `categorySlug` | string | No | null | Filter results by category |
| `maxResults` | number | No | Config value | Override max results (capped by config) |

**Response** (200):
```json
{
  "results": [
    {
      "id": 42,
      "question": "Cual es el horario de atencion?",
      "answer": "Nuestro horario es de lunes a viernes de 8:00 AM a 6:00 PM...",
      "category": "Horarios",
      "categorySlug": "horarios",
      "score": 0.94,
      "matchType": "semantic",
      "language": "es"
    },
    {
      "id": 15,
      "question": "Atienden los sabados?",
      "answer": "Si, los sabados atendemos de 9:00 AM a 1:00 PM.",
      "category": "Horarios",
      "categorySlug": "horarios",
      "score": 0.87,
      "matchType": "semantic",
      "language": "es"
    }
  ],
  "totalResults": 2,
  "confidenceThreshold": 0.8,
  "topResultConfident": true
}
```

**Response fields**:

| Field | Type | Description |
|---|---|---|
| `results` | array | Ranked search results |
| `results[].id` | number | Entry ID |
| `results[].question` | string | FAQ question |
| `results[].answer` | string | FAQ answer |
| `results[].category` | string | Category display name |
| `results[].categorySlug` | string | Category slug |
| `results[].score` | number | Relevance score (0-1) |
| `results[].matchType` | string | `'semantic'`, `'keyword'`, or `'hybrid'` |
| `results[].language` | string | Entry language |
| `totalResults` | number | Total results returned |
| `confidenceThreshold` | number | Threshold used for this query |
| `topResultConfident` | boolean | Whether top result met threshold |

**Note**: Response does not include `tenantId`, `metadata`, `embedding`, `priority`, or `keywords`. These internal fields are stripped for the public endpoint.

**Rate Limiting**: Configurable per tenant via `SEARCH_RATE_LIMIT` (default 60/minute). Returns 429 with `Retry-After` header when exceeded.

**Errors**:
- 400: Missing or empty `query`
- 404: Tenant slug not found or tenant disabled
- 429: Rate limit exceeded

**Event emitted**: `kb.search.executed` with `{ tenantId, query, resultCount, topScore, confident }`

---

## 4. Bulk Operations

### POST /api/knowledge-base/[tenantSlug]/ingest

Start a bulk re-embedding job.

**Request Body**:
```json
{
  "filter": {
    "categoryId": 5
  },
  "force": true
}
```

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `filter` | object | No | null | Filter entries to re-embed |
| `filter.categoryId` | number | No | - | Only entries in this category |
| `filter.status` | string | No | - | Only entries with this embedding status |
| `force` | boolean | No | false | Re-embed even if already embedded |

**Response** (202):
```json
{
  "jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "total": 150,
  "estimatedTimeSeconds": 75,
  "status": "processing"
}
```

**Permission**: `kb-entries.ingest`

**Errors**:
- 402: Insufficient embedding quota
- 409: Bulk job already running for this tenant

---

### GET /api/knowledge-base/[tenantSlug]/stats

Get tenant KB statistics and optionally poll bulk job progress.

**Query Parameters**:

| Param | Type | Description |
|---|---|---|
| `jobId` | string | Optional: include bulk job progress |

**Response** (200):
```json
{
  "totalEntries": 150,
  "enabledEntries": 142,
  "disabledEntries": 8,
  "embeddingCoverage": {
    "embedded": 138,
    "pending": 2,
    "processing": 1,
    "failed": 1,
    "percentage": 92.0
  },
  "categoryBreakdown": [
    { "categoryId": 1, "name": "Agendamiento", "entryCount": 12 },
    { "categoryId": 2, "name": "Horarios", "entryCount": 8 }
  ],
  "languageDistribution": [
    { "language": "es", "count": 140 },
    { "language": "en", "count": 10 }
  ],
  "failedEntries": [42],
  "bulkJob": {
    "jobId": "a1b2c3d4-...",
    "total": 150,
    "done": 67,
    "failed": 2,
    "status": "processing"
  }
}
```

**Permission**: `kb-entries.read`

---

## 5. MCP Tool Definitions

These tools are discoverable by agents via the `chat.actionSchemas` block.

### kb.search

```json
{
  "name": "kb.search",
  "description": "Search the knowledge base for FAQ entries matching a query",
  "parameters": {
    "tenantSlug": {
      "type": "string",
      "description": "Tenant slug",
      "required": true
    },
    "query": {
      "type": "string",
      "description": "Search query",
      "required": true
    }
  },
  "returns": {
    "results": { "type": "array" },
    "totalResults": { "type": "number" },
    "topResultConfident": { "type": "boolean" }
  },
  "requiredPermissions": [],
  "endpoint": {
    "method": "POST",
    "path": "knowledge-base/[tenantSlug]/search"
  }
}
```

### kb.listEntries

```json
{
  "name": "kb.listEntries",
  "description": "List FAQ entries with filtering by category and tenant",
  "parameters": {
    "tenantId": { "type": "number" },
    "categoryId": { "type": "number" },
    "enabled": { "type": "boolean" }
  },
  "returns": {
    "data": { "type": "array" },
    "total": { "type": "number" }
  },
  "requiredPermissions": ["kb-entries.read"],
  "endpoint": {
    "method": "GET",
    "path": "kb-entries"
  }
}
```

### kb.getEntry

```json
{
  "name": "kb.getEntry",
  "description": "Get a single FAQ entry by ID",
  "parameters": {
    "id": {
      "type": "number",
      "description": "Entry ID",
      "required": true
    }
  },
  "returns": {
    "question": { "type": "string" },
    "answer": { "type": "string" },
    "category": { "type": "string" }
  },
  "requiredPermissions": ["kb-entries.read"],
  "endpoint": {
    "method": "GET",
    "path": "kb-entries/[id]"
  }
}
```

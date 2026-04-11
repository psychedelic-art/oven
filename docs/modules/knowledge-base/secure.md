# Knowledge Base -- Security

> Authentication, authorization, tenant isolation, input validation, and data protection for `module-knowledge-base`.

---

## 1. Permission Model

### Permission Slugs

The module seeds the following permissions via `seedKnowledgeBase()`:

| Slug | Resource | Action | Description |
|---|---|---|---|
| `kb-categories.read` | kb-categories | read | View KB categories |
| `kb-categories.create` | kb-categories | create | Create KB categories |
| `kb-categories.update` | kb-categories | update | Edit KB categories |
| `kb-categories.delete` | kb-categories | delete | Delete KB categories |
| `kb-entries.read` | kb-entries | read | View KB entries |
| `kb-entries.create` | kb-entries | create | Create KB entries |
| `kb-entries.update` | kb-entries | update | Edit KB entries |
| `kb-entries.delete` | kb-entries | delete | Delete KB entries |
| `kb-entries.ingest` | kb-entries | ingest | Bulk re-embed entries |

### Permission Assignment

Permissions are assigned to roles via `module-roles`. Typical role mapping:

| Role | Categories | Entries | Ingest |
|---|---|---|---|
| Super Admin | Full CRUD | Full CRUD | Yes |
| Tenant Admin | Full CRUD | Full CRUD | Yes |
| Tenant Editor | Read | Full CRUD | No |
| Tenant Viewer | Read | Read | No |
| Agent (system) | - | Read (via API) | - |

### Endpoint-Permission Mapping

All authenticated endpoints are protected via `api_endpoint_permissions`. The auth middleware checks:

1. Is the endpoint marked `isPublic`? If yes, allow without auth.
2. Does the user's role include the required permission? If yes, allow.
3. Otherwise, return 403.

---

## 2. Public Endpoint Security

### POST /api/knowledge-base/[tenantSlug]/search

This is the only public (unauthenticated) endpoint in the module. It is explicitly marked in `api_endpoint_permissions`:

```sql
INSERT INTO api_endpoint_permissions (module, route, method, is_public)
VALUES ('knowledge-base', 'knowledge-base/[tenantSlug]/search', 'POST', true);
```

### Rate Limiting

The public search endpoint is rate-limited to prevent abuse:

| Parameter | Default | Configurable |
|---|---|---|
| Rate limit | 60 requests/minute | Yes, via `SEARCH_RATE_LIMIT` per tenant |
| Rate limit window | 60 seconds | Fixed |
| Rate limit key | Tenant slug + client IP | - |

When the limit is exceeded, the endpoint returns:

```
HTTP 429 Too Many Requests
Retry-After: 45
```

### Response Sanitization

The public search response strips all internal fields:

| Field | Included | Reason |
|---|---|---|
| `id` | Yes | Allows client to reference the entry |
| `question` | Yes | Display to user |
| `answer` | Yes | Display to user |
| `category` | Yes | Display grouping |
| `categorySlug` | Yes | URL-safe reference |
| `score` | Yes | Confidence indicator |
| `matchType` | Yes | Search transparency |
| `language` | Yes | Multi-language support |
| `tenantId` | **No** | Internal identifier |
| `metadata` | **No** | Contains embedding details |
| `embedding` | **No** | Raw vector (1536 floats) |
| `priority` | **No** | Internal ranking signal |
| `keywords` | **No** | Internal search data |
| `version` | **No** | Internal version tracking |

### Tenant Slug Validation

The tenant slug in the URL path is validated:

1. Must match a row in `tenants` where `enabled = true`.
2. If the slug does not exist or the tenant is disabled, return 404 with a generic message (no information leakage about disabled tenants).
3. The response never reveals whether the slug was invalid or the tenant was disabled.

---

## 3. Tenant Isolation

### Query-Level Isolation

Every query in every handler filters by `tenantId`:

```typescript
// Category list -- always scoped
const rows = await db
  .select()
  .from(kbCategories)
  .where(eq(kbCategories.tenantId, tenantId));

// Entry search -- always scoped
const results = await db
  .select()
  .from(kbEntries)
  .where(
    and(
      eq(kbEntries.tenantId, tenantId),
      eq(kbEntries.enabled, true)
    )
  );
```

### Cross-Tenant Prevention

1. **Create operations**: `tenantId` is set from the authenticated user's context (via `useTenantContext()`). Users cannot specify a different tenant.
2. **Read/Update/Delete operations**: The handler first fetches the record and verifies `record.tenantId === authContext.tenantId`. Mismatches return 404 (not 403, to avoid revealing that the record exists in another tenant).
3. **Search endpoint**: Tenant resolved from URL slug, not from request body. The query only returns entries for that tenant.

### RLS Eligibility

The `kb_categories` and `kb_entries` tables are eligible for Row-Level Security policies via the OVEN RLS visual builder. Policies can restrict access based on:

- **Role**: Only users with specific roles can see/edit entries.
- **Hierarchy node**: Only users in the same organizational branch can access entries (if `hierarchyNodeId` column is added in the future).
- **Context variables**: `current_setting('app.current_user_id')`, `current_setting('app.current_role')`.

Currently, application-level filtering (in handlers) provides tenant isolation. RLS can be layered on top for defense-in-depth.

---

## 4. Input Validation and Sanitization

### Search Query Sanitization

Before embedding, search queries are sanitized:

1. **Trim whitespace**: Remove leading/trailing whitespace.
2. **Collapse internal whitespace**: Replace multiple spaces/newlines with single space.
3. **Length limit**: Truncate to 500 characters (configurable). Longer queries are truncated, not rejected.
4. **No HTML/script injection**: Queries are passed to the embedding API as plain text. They are never rendered as HTML or interpolated into SQL.

### Entry Content Validation

| Field | Validation |
|---|---|
| `question` | Required, non-empty, max 2000 characters |
| `answer` | Required, non-empty, max 10000 characters |
| `keywords` | Array of strings, each max 100 chars, max 20 keywords |
| `categoryId` | Must reference existing category in same tenant |
| `priority` | Integer 0-10 |
| `language` | ISO 639-1 code, max 10 chars |
| `slug` (category) | URL-safe: `[a-z0-9-]`, max 128 chars |

### SQL Injection Prevention

All database queries use Drizzle's parameterized query builder. Vector operations use parameterized values:

```typescript
// Safe: parameterized vector query
const results = await db.execute(sql`
  SELECT *, 1 - (embedding <=> ${queryVector}::vector) AS score
  FROM kb_entries
  WHERE tenant_id = ${tenantId} AND enabled = true
  ORDER BY embedding <=> ${queryVector}::vector
  LIMIT ${maxResults}
`);
```

The `queryVector` is a float array from the embedding API, cast to `::vector` type. It is never interpolated as a string.

---

## 5. Embedding Data Security

### Are Vectors Sensitive?

Embedding vectors are numerical representations of text. While they do not directly contain the original text, recent research has shown that it is theoretically possible to reconstruct approximate text from embeddings. Therefore:

1. **Vectors are treated as derived data** with the same sensitivity as the source text.
2. **Vectors are never exposed in public API responses** (stripped in search endpoint).
3. **Vectors are never included in list endpoint responses** (too large and not needed for display).
4. **Vectors are not included in event payloads** (only metadata about the embedding is emitted).

### Embedding API Communication

Calls to the embedding API (via `module-ai`) use:

- HTTPS transport (enforced by the AI provider SDK).
- API keys stored in `provider_credentials` (encrypted at rest via `module-subscriptions`).
- No logging of full request/response bodies (only token counts and status codes).

---

## 6. Bulk Operation Security

### Ingest Permission

The bulk re-embed endpoint requires the `kb-entries.ingest` permission, which is separate from standard CRUD permissions. This allows restricting bulk operations to administrators while editors can manage individual entries.

### Quota Enforcement

Before starting a bulk job:

1. Check embedding quota via `module-subscriptions`.
2. If quota insufficient, reject with 402 (not 403 -- this is a billing issue, not a permission issue).
3. If quota runs out mid-job, remaining entries are skipped (not charged).

### Concurrency Control

Only one bulk job can run per tenant at a time. A second request while a job is active returns 409 Conflict. This prevents:

- Double-charging embedding costs.
- Race conditions on the embedding status.
- Excessive load on the embedding API.

---

## 7. Data Lifecycle

### Deletion Behavior

| Entity | Deletion Type | Cascade |
|---|---|---|
| Category | Hard delete | Blocked if entries exist (409) |
| Entry | Hard delete | Cascades to `kb_entry_versions` |
| Entry version | Hard delete (via cascade) | No further cascade |
| Embedding vector | Overwritten on re-embed | N/A |

### Data Retention

Version history is retained indefinitely. There is no automatic pruning. A future `MAX_VERSIONS_PER_ENTRY` config could limit version count.

### Tenant Deletion

When a tenant is deleted (via `module-tenants`), all KB data for that tenant should be cleaned up. This is handled by a wiring on `tenants.tenant.deleted`:

```
Event: tenants.tenant.deleted
Action: DELETE FROM kb_entries WHERE tenant_id = $tenantId
Action: DELETE FROM kb_categories WHERE tenant_id = $tenantId
```

This ensures no orphaned data remains after tenant removal.

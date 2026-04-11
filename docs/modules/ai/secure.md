# Module AI -- Security

> Encryption, permissions, guardrails, tenant isolation, and threat mitigations.

---

## 1. API Key Encryption at Rest

All provider API keys and vector store connection secrets are encrypted before storage using AES-256-GCM.

### Implementation

```
  Plaintext API Key                      Stored in Database
  "sk-abc123..."                         "iv:tag:ciphertext" (base64)
       |                                        ^
       v                                        |
  encrypt(plaintext, key)              decrypt(ciphertext, key)
       |                                        ^
       v                                        |
  AES-256-GCM                          AES-256-GCM
  Key: AI_ENCRYPTION_KEY env var       Key: AI_ENCRYPTION_KEY env var
  IV: random 12 bytes per encryption   IV: extracted from stored value
  Tag: 16 bytes authentication tag     Tag: extracted for verification
```

### Key Management

| Aspect | Implementation |
|--------|---------------|
| **Encryption algorithm** | AES-256-GCM (authenticated encryption) |
| **Key source** | `AI_ENCRYPTION_KEY` environment variable (32 bytes, base64-encoded) |
| **IV generation** | Cryptographically random 12 bytes per encryption operation |
| **Storage format** | `{iv_base64}:{auth_tag_base64}:{ciphertext_base64}` |
| **Key rotation** | Update env var + re-encrypt all rows via migration script |

### What Is Encrypted

| Table | Column | Contains |
|-------|--------|----------|
| `ai_providers` | `apiKeyEncrypted` | Provider API keys (OpenAI, Anthropic, Google, etc.) |
| `ai_vector_stores` | `connectionConfig` | Vector store connection strings, API keys, credentials |

### What Is NOT Encrypted (and why)

| Data | Reason |
|------|--------|
| Model IDs, aliases, tool schemas | Not sensitive -- no credentials |
| Usage logs | Aggregated metrics, not PII |
| Budget counters | Operational data, not credentials |
| Guardrail patterns | Content rules, not secrets |

---

## 2. API Key Masking in Responses

API keys are **never** returned in GET responses. All read endpoints mask credentials.

### Masking Rules

| Original | Masked | Format |
|----------|--------|--------|
| `sk-abc123def456ghi789` | `sk-...i789` | First prefix + "..." + last 4 characters |
| `pc-abcdefghijklmnop` | `pc-...mnop` | Same pattern |
| Short keys (<8 chars) | `••••••••` | Full mask |

### Enforcement

- The masking function runs in the API handler **after** database read, **before** JSON serialization.
- The `PUT` endpoint accepts `apiKeyEncrypted: null` to signal "keep existing key" -- this prevents the need to round-trip the key through the frontend.
- React Admin forms use a password input field that shows `••••••••` and only sends a value when the user explicitly types a new key.

---

## 3. Rate Limiting

Rate limits are enforced at three levels to prevent abuse and control costs.

### Rate Limit Levels

```
  Level 1: Per-Provider
  +----------------------------------+
  | ai_providers.rateLimitRpm = 500  |  Max 500 requests/min to OpenAI
  | ai_providers.rateLimitTpm = 200K |  Max 200K tokens/min to OpenAI
  +----------------------------------+

  Level 2: Per-Tenant (via Budgets)
  +----------------------------------+
  | ai_budgets WHERE scope='tenant'  |  Tenant 42: 100K tokens/day
  | AND scopeId=42                   |
  +----------------------------------+

  Level 3: Global (via Config)
  +----------------------------------+
  | GLOBAL_RATE_LIMIT_RPM = 100      |  Platform-wide: 100 RPM
  | (from module-config)             |
  +----------------------------------+
```

### Enforcement

- Rate limit state is stored in-memory (per-process) with a sliding window counter.
- When a limit is hit, the API returns `429 Too Many Requests` with:
  - `Retry-After` header (seconds until the window resets)
  - Response body with `{ error: "rate_limited", retryAfter, limit, remaining }`
- Rate-limited calls are logged in `ai_usage_logs` with `status: "rate_limited"` for monitoring.

---

## 4. Guardrail Engine

The guardrail engine provides input/output content filtering to prevent misuse and enforce content policies.

### Guardrail Evaluation Flow

```
  Input Text (prompt)
       |
       v
  Load active rules WHERE scope IN ('input', 'both')
  AND (tenantId IS NULL OR tenantId = currentTenant)
  ORDER BY priority ASC
       |
       v
  For each rule:
       |
       +-- keyword: case-insensitive substring match
       |   against comma-separated word list
       |
       +-- regex: pattern match against compiled regex
       |
       +-- classifier: (future) call AI classifier model
       |
       v
  Match found?
       |
       +-- action='block': STOP, return 422
       |   { error: "guardrail_violation", rule: name, message }
       |
       +-- action='warn': LOG warning, continue
       |   metadata.guardrailWarnings += rule.name
       |
       +-- action='modify': REDACT matched text, continue
       |   Replace matched substring with [REDACTED]
       |
       v
  No match: proceed to AI provider
```

### Guardrail Scope

| Scope | When Evaluated | Use Case |
|-------|---------------|----------|
| `input` | Before sending prompt to provider | Block PII, prevent prompt injection |
| `output` | After receiving response from provider | Filter profanity, redact sensitive data |
| `both` | Both before and after | Full content policy enforcement |

### Prompt Injection Defense

Module AI includes built-in guardrail patterns for common prompt injection techniques:

| Pattern | Type | Scope | Action |
|---------|------|-------|--------|
| Ignore previous instructions | keyword | input | block |
| System prompt override attempts | regex | input | block |
| Role-play evasion patterns | regex | input | warn |
| Data exfiltration patterns | regex | output | block |

These are seeded as system guardrails (cannot be deleted, can be disabled per tenant).

---

## 5. Tenant Isolation

All tenant-scoped data is isolated through query-level filtering and RLS compatibility.

### Query-Level Isolation

Every API handler that reads tenant-scoped data includes a `tenantId` filter:

```typescript
// In vector store list handler
const stores = await db
  .select()
  .from(aiVectorStores)
  .where(eq(aiVectorStores.tenantId, tenantId));
```

### Vector Store Isolation

For vector stores, tenant isolation extends into the vector backend:

| Adapter | Isolation Mechanism |
|---------|-------------------|
| **pgvector** | `WHERE tenant_id = ?` in SQL queries (metadata column) |
| **Pinecone** | Namespace per tenant (`namespace: "tenant-{id}"`) |

### Cross-Tenant Access Rules

| Data | Cross-Tenant Allowed? | How |
|------|-----------------------|-----|
| Providers (tenantId=null) | Yes -- shared by all tenants | Query includes `OR tenantId IS NULL` |
| Providers (tenantId set) | No -- only owning tenant | Query filters by exact tenantId |
| Vector stores | No -- always tenant-scoped | Query filters by tenantId |
| Usage logs | No -- always tenant-scoped | Query filters by tenantId |
| Budgets (scope=global) | Read by all, managed by admin | Admin permission required |
| Budgets (scope=tenant) | Only owning tenant | Tenant context enforced |
| Model aliases | Yes -- global resource | No tenant column |
| Guardrails (tenantId=null) | Applied to all tenants | Merged with tenant rules |
| Guardrails (tenantId set) | Only owning tenant | Query filters by tenantId |

---

## 6. Permission Model

Module AI registers 17 permission slugs that map to API operations.

### Permission Slugs

| Slug | Resource | Action | Endpoints |
|------|----------|--------|-----------|
| `ai-providers.read` | ai-providers | read | GET /api/ai-providers, GET /api/ai-providers/[id] |
| `ai-providers.create` | ai-providers | create | POST /api/ai-providers |
| `ai-providers.update` | ai-providers | update | PUT /api/ai-providers/[id] |
| `ai-providers.delete` | ai-providers | delete | DELETE /api/ai-providers/[id] |
| `ai-providers.test` | ai-providers | test | POST /api/ai-providers/[id]/test |
| `ai-aliases.read` | ai-aliases | read | GET /api/ai-aliases |
| `ai-aliases.create` | ai-aliases | create | POST /api/ai-aliases |
| `ai-aliases.update` | ai-aliases | update | PUT /api/ai-aliases/[id] |
| `ai-aliases.delete` | ai-aliases | delete | DELETE /api/ai-aliases/[id] |
| `ai-vector-stores.read` | ai-vector-stores | read | GET /api/ai-vector-stores |
| `ai-vector-stores.create` | ai-vector-stores | create | POST /api/ai-vector-stores |
| `ai-vector-stores.update` | ai-vector-stores | update | PUT /api/ai-vector-stores/[id] |
| `ai-vector-stores.delete` | ai-vector-stores | delete | DELETE /api/ai-vector-stores/[id] |
| `ai-usage-logs.read` | ai-usage | read | GET /api/ai-usage-logs, GET /api/ai/usage/summary |
| `ai-budgets.read` | ai-budgets | read | GET /api/ai-budgets |
| `ai-budgets.create` | ai-budgets | create | POST /api/ai-budgets |
| `ai-budgets.update` | ai-budgets | update | PUT /api/ai-budgets/[id] |
| `ai-tools.read` | ai-tools | read | GET /api/ai/tools |
| `ai-tools.invoke` | ai-tools | invoke | POST /api/ai/generate, /stream, /embed, etc. |

### Role Mapping Recommendations

| Role | Permissions |
|------|------------|
| **Super Admin** | All 17 permissions |
| **Tenant Admin** | All read + ai-tools.invoke |
| **Agent Developer** | ai-tools.read, ai-tools.invoke, ai-aliases.read, ai-vector-stores.read |
| **Viewer** | ai-usage-logs.read, ai-tools.read |

---

## 7. Budget Enforcement

Budgets have two enforcement modes:

### Hard Limit (Default)

When a budget's counter reaches or exceeds the limit, further AI calls are **blocked**:

```
  Budget: tokenLimit=500,000, currentTokens=499,800
  Incoming call estimates ~300 tokens
       |
       v
  499,800 + 300 > 500,000? YES
       |
       v
  Return 429: "AI token budget exceeded for this period.
  Budget: tenant/42, Period: monthly, Used: 499,800/500,000 tokens.
  Resets at: 2026-04-01T00:00:00Z"
```

### Soft Limit (warn + continue)

When `alertThresholdPct` is reached, a warning event fires but calls continue:

```
  Budget: tokenLimit=500,000, alertThresholdPct=80
  currentTokens reaches 400,000
       |
       v
  400,000 / 500,000 = 80% >= alertThresholdPct
       |
       v
  Emit 'ai.usage.budgetWarning' event
  INSERT INTO ai_budget_alerts { type: 'warning', message: "..." }
  Call continues normally
```

---

## 8. RLS Policy Compatibility

Module AI tables are compatible with the platform's Row-Level Security system:

- All tenant-scoped tables have `tenantId` columns indexed for fast filtering.
- The RLS visual builder can create policies on any module-ai table.
- Context variables (`current_setting('app.current_tenant_id')`) work with ai_providers, ai_vector_stores, ai_usage_logs, and ai_guardrails.

### Example RLS Policy

```sql
CREATE POLICY tenant_isolation ON ai_vector_stores
  FOR ALL
  USING (
    tenant_id::text = current_setting('app.current_tenant_id', true)
  );
```

---

## 9. Credential Rotation

Provider API keys can be rotated without downtime:

### Rotation Process

1. Admin navigates to provider edit page.
2. Enters new API key in the password field.
3. PUT /api/ai-providers/[id] encrypts the new key and stores it.
4. ProviderRegistry cache is invalidated for this provider.
5. Next AI call reconstructs the provider instance with the new key.

### Zero-Downtime Guarantee

- The cache invalidation is synchronous with the PUT response.
- Between cache invalidation and next call, there is no stale key usage because:
  - The registry uses a read-through cache: on cache miss, it reads from DB.
  - The DB is always the source of truth.
- If the new key is invalid, the AI call fails and is logged. The admin can immediately update again.

---

## 10. Data Sensitivity Controls

### Audit Logging Levels

The `AUDIT_LOG_LEVEL` config key controls what is logged:

| Level | Prompt Content | Response Content | Metadata |
|-------|---------------|-----------------|----------|
| `minimal` | No | No | Yes (tokens, cost, latency) |
| `standard` | First 100 chars | No | Yes |
| `full` | Complete | Complete | Yes |

Default is `standard`. Healthcare and financial tenants should use `minimal` to avoid storing PHI/PII in usage logs.

### What Is Never Logged

- API keys (encrypted, masked, never in logs)
- Vector store connection strings
- Raw embedding vectors (too large, no diagnostic value)

---

## 11. Threat Model

| Threat | Mitigation |
|--------|-----------|
| API key theft via database access | AES-256-GCM encryption at rest. Key in env var, not DB. |
| API key exposure via API response | Masking in all GET endpoints. Never in logs. |
| Prompt injection in user input | Guardrail engine with keyword/regex/classifier rules |
| Budget bypass via rapid parallel requests | Atomic counter updates with `UPDATE ... SET current += N` |
| Cross-tenant data access via vector queries | Tenant ID filter in adapter query layer + namespace isolation |
| Denial of service via expensive AI calls | Rate limiting (RPM, TPM) + budget limits |
| Unauthorized tool invocation | Permission check (`ai-tools.invoke`) on all execution endpoints |
| Stale provider credentials in cache | Event-driven cache invalidation on provider update |
| Guardrail evasion via encoding/obfuscation | Normalize input (decode entities, collapse whitespace) before rule evaluation |
| Cost explosion from uncapped streaming | `maxTokens` parameter enforced. Streaming middleware tracks token count and aborts if budget exceeded mid-stream |

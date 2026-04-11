# Module Config -- Prompts

> LLM / agent prompts and worked examples that use `module-config` as the
> source of truth. Also the place where "how do I ask an agent to do X"
> examples live for operators.

---

## Agent Tool Surface

The module exposes three `actionSchemas` via its `chat` block, which become
agent tools automatically via `module-agent-core`'s Tool Wrapper:

### `config.resolve`

```json
{
  "name": "config.resolve",
  "description": "Resolve a config value using the 5-tier cascade",
  "parameters": {
    "moduleName": { "type": "string", "description": "Module name", "required": true },
    "key":        { "type": "string", "description": "Config key",  "required": true },
    "tenantId":   { "type": "number", "description": "Tenant ID for tenant-scoped resolution" },
    "scopeId":    { "type": "string", "description": "Instance ID for instance-scoped resolution" }
  },
  "returns": { "value": { "type": "any" }, "source": { "type": "string" } },
  "requiredPermissions": ["module-configs.read"],
  "endpoint": { "method": "GET", "path": "module-configs/resolve" }
}
```

### `config.resolveBatch`

```json
{
  "name": "config.resolveBatch",
  "description": "Resolve multiple config values in one call",
  "parameters": {
    "moduleName": { "type": "string", "description": "Module name", "required": true },
    "keys":       { "type": "string", "description": "Comma-separated config keys", "required": true },
    "tenantId":   { "type": "number", "description": "Tenant ID for tenant-scoped resolution" }
  },
  "returns": { "results": { "type": "object" } },
  "requiredPermissions": ["module-configs.read"],
  "endpoint": { "method": "GET", "path": "module-configs/resolve-batch" }
}
```

### `config.list`

```json
{
  "name": "config.list",
  "description": "List config entries with filtering",
  "parameters": {
    "moduleName": { "type": "string", "description": "Filter by module" },
    "scope":      { "type": "string", "description": "Filter by scope" },
    "tenantId":   { "type": "number", "description": "Filter by tenant" }
  },
  "returns": { "data": { "type": "array" }, "total": { "type": "number" } },
  "requiredPermissions": ["module-configs.read"],
  "endpoint": { "method": "GET", "path": "module-configs" }
}
```

---

## Worked Examples

### 1. "What is tenant 42's send limit?"

The Tool Wrapper maps the intent onto `config.resolve`:

```json
{
  "tool": "config.resolve",
  "args": {
    "moduleName": "notifications",
    "key": "DAILY_SEND_LIMIT",
    "tenantId": 42
  }
}
```

Expected response:

```json
{ "value": 500, "source": "tenant-module" }
```

Agent follow-up: "Tenant 42's daily send limit is 500 (override of the
platform default)."

### 2. "Show me every tenant override for `SCHEDULE`"

Maps onto `config.list`:

```json
{
  "tool": "config.list",
  "args": { "moduleName": "tenants", "key": "SCHEDULE" }
}
```

The caller filters the returned `data` array client-side by `tenantId IS
NOT NULL` to exclude the platform default.

### 3. Public tenant config bootstrap

The portal's public tenant config endpoint calls `config.resolveBatch`
with a 14-key payload in a single round trip:

```json
{
  "tool": "config.resolveBatch",
  "args": {
    "moduleName": "tenants",
    "keys": "SCHEDULE,TIMEZONE,BUSINESS_NAME,TONE,PRIMARY_COLOR,SECONDARY_COLOR,LOGO_URL,SUPPORT_EMAIL,SUPPORT_PHONE,LOCALE,CURRENCY,DEFAULT_GREETING,FALLBACK_MESSAGE,ESCALATION_NUMBER",
    "tenantId": 42
  }
}
```

The response is passed through to the portal widget which renders the
effective tenant configuration without re-querying.

---

## Operator Prompts

When an operator needs to debug "why is tenant A getting the wrong value?":

1. Call `config.resolve` with the tenant and key. Inspect the `source`
   field.
2. If `source === 'platform-module'`, the tenant has no override. Add one
   via the dashboard.
3. If `source === 'tenant-module'` but the value is stale, check
   `updatedAt` on the row and look for a recent `config.entry.updated`
   event in the EventBus log.
4. If `source === 'schema'`, no row exists; the fallback is kicking in.
   Add a persisted row if the operator wants to lock in a value.
5. If `source === 'default'`, neither a row nor a `configSchema` entry
   exists. Either the `key` is typo'd or the consuming module forgot to
   declare it in `configSchema`.

---

## Future Prompt Patterns

These are out of scope today but planned for later sprints:

- Natural-language "diff between platform default and tenant 42's overrides"
  -- needs a diff endpoint, not just list.
- "Show me every config entry that has no `description`" -- trivial via
  `config.list` + client-side filter, but would benefit from a filter
  param.
- "Change the send limit for tenants in the Bogota region to 800" -- needs
  geo grouping, which is scoped to a different module.

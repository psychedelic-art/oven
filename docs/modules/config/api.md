# Module Config -- API

> HTTP surface for the platform-wide configuration store.
> Authoritative spec: [`20-module-config.md`](../20-module-config.md) section 4.

All endpoints mount at `/api/module-configs/*` and return JSON.

---

## Endpoint Summary

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| GET | `/api/module-configs` | List config entries | Authenticated |
| POST | `/api/module-configs` | Upsert a config entry | `module-configs.create` or `.update` |
| GET | `/api/module-configs/[id]` | Fetch a single entry | `module-configs.read` |
| PUT | `/api/module-configs/[id]` | Update a single entry | `module-configs.update` |
| DELETE | `/api/module-configs/[id]` | Delete a single entry | `module-configs.delete` |
| GET | `/api/module-configs/resolve` | Cascade-resolve a single key | `module-configs.read` |
| GET | `/api/module-configs/resolve-batch` | Cascade-resolve multiple keys | `module-configs.read` |

---

## `GET /api/module-configs` -- List

Standard `ra-data-simple-rest` list endpoint.

### Query parameters

| Param | Meaning |
|-------|---------|
| `filter[moduleName]` | Filter by module slug. |
| `filter[scope]` | Filter by `module` or `instance`. |
| `filter[key]` | Exact key match. |
| `filter[tenantId]` | Filter by tenant (admin only; regular users auto-filtered by RLS). |
| `filter[q]` | `ILIKE` search on the `key` column. |
| `sort`, `range` | Standard RA pagination. |

### Response

```json
[
  {
    "id": 17,
    "tenantId": 42,
    "moduleName": "notifications",
    "scope": "module",
    "scopeId": null,
    "key": "DAILY_SEND_LIMIT",
    "value": 500,
    "description": "Tenant 42 override for daily send limit",
    "createdAt": "2026-04-10T12:14:00Z",
    "updatedAt": "2026-04-10T12:14:00Z"
  }
]
```

Headers: `Content-Range: module-configs 0-24/317`.

---

## `POST /api/module-configs` -- Upsert

Upserts on the tuple `(tenantId, moduleName, scope, scopeId, key)`.

### Request

```json
{
  "tenantId": 42,
  "moduleName": "notifications",
  "scope": "module",
  "scopeId": null,
  "key": "DAILY_SEND_LIMIT",
  "value": 500,
  "description": "Optional description"
}
```

- Omit `tenantId` or pass `null` for a platform-global entry.
- `scope` defaults to `'module'` when absent.
- `scopeId` is required when `scope === 'instance'`.

### Response

- `200 OK` with the updated row if the tuple already existed.
- `201 Created` with the new row otherwise.

### Side effects

- Emits `config.entry.created` on create, `config.entry.updated` on update.
- Event payload includes `tenantId`, `moduleName`, `key`, and (for updates)
  both `oldValue` and `newValue`.

---

## `GET /api/module-configs/[id]` / `PUT` / `DELETE`

Standard RA single-record operations. `PUT` emits `config.entry.updated`.
`DELETE` emits `config.entry.deleted`.

---

## `GET /api/module-configs/resolve` -- Single-Key Cascade

### Query parameters

| Param | Required | Notes |
|-------|:--------:|-------|
| `moduleName` | yes | The registered module slug. |
| `key` | yes | The config key. |
| `tenantId` | no | Omit for platform-only resolution. |
| `scopeId` | no | Instance identifier (e.g. `channel:sede-norte`). |

### Response shape

```json
{
  "key": "DAILY_SEND_LIMIT",
  "value": 500,
  "source": "tenant-module",
  "tenantId": 42,
  "scopeId": null
}
```

### `source` values

| Source | Meaning |
|--------|---------|
| `tenant-instance` | Tier 1 -- tenant + scopeId specific row. |
| `tenant-module` | Tier 2 -- tenant-wide row. |
| `platform-instance` | Tier 3 -- platform + scopeId specific row. |
| `platform-module` | Tier 4 -- platform-wide row. |
| `schema` | Tier 5 -- default from the module's `configSchema` array. |
| `default` | No tier matched. `value` is `null`. |

### Errors

- `400 Bad Request` -- `moduleName` or `key` missing.

---

## `GET /api/module-configs/resolve-batch` -- Multi-Key Cascade

### Query parameters

| Param | Required | Notes |
|-------|:--------:|-------|
| `moduleName` | yes | Single module per batch call. |
| `keys` | yes | Comma-separated list. Whitespace trimmed, empty items dropped. |
| `tenantId` | no | Omit for platform-only resolution. |

### Response shape

```json
{
  "results": {
    "DAILY_SEND_LIMIT": { "value": 500, "source": "tenant-module" },
    "TIMEZONE":          { "value": "America/Mexico_City", "source": "tenant-module" },
    "FALLBACK_KEY":      { "value": null, "source": "default" }
  }
}
```

### Caveats

- The batch resolver does not support instance overrides (tiers 1 or 3)
  because there is no `scopeId` param. Call the single-key endpoint per key
  when you need instance-level resolution.
- Order of the `results` object mirrors the order of the `keys` param but
  is not guaranteed by JSON semantics -- treat it as a map, not a list.

### Errors

- `400 Bad Request` -- `moduleName` or `keys` missing, or `keys` resolves
  to an empty list after trimming.

---

## Example: Tenant Onboarding Batch

The public tenant config endpoint calls `/api/module-configs/resolve-batch`
with a 14-key payload on every first-load of the portal. Sample request:

```
GET /api/module-configs/resolve-batch
    ?moduleName=tenants
    &keys=SCHEDULE,TIMEZONE,BUSINESS_NAME,TONE,PRIMARY_COLOR,SECONDARY_COLOR,LOGO_URL,SUPPORT_EMAIL,SUPPORT_PHONE,LOCALE,CURRENCY,DEFAULT_GREETING,FALLBACK_MESSAGE,ESCALATION_NUMBER
    &tenantId=42
```

Response returns 14 `{ value, source }` pairs. The portal renders the
effective tenant configuration without a second round trip.

---

## Error Format

All errors use the shared `badRequest` / `notFound` helpers from
`@oven/module-registry/api-utils`:

```json
{ "error": "moduleName and key are required" }
```

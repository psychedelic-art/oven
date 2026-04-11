# Module Tenants — API

All routes are registered in `packages/module-tenants/src/index.ts`
`apiHandlers` and routed by the `[...route]` catch-all in the dashboard
Next.js app. Handlers use `parseListParams` / `listResponse` from
`@oven/module-registry/api-utils` for Content-Range pagination.

## Routes

| Method | Route | Handler | Auth | Purpose |
|---|---|---|---|---|
| GET    | `/api/tenants` | `tenants.handler.GET` | `tenants.read` | List with filter/sort/paginate |
| POST   | `/api/tenants` | `tenants.handler.POST` | `tenants.create` | Create new tenant |
| GET    | `/api/tenants/[id]` | `tenants-by-id.handler.GET` | `tenants.read` | Fetch by numeric id |
| PUT    | `/api/tenants/[id]` | `tenants-by-id.handler.PUT` | `tenants.update` | Update identity fields |
| DELETE | `/api/tenants/[id]` | `tenants-by-id.handler.DELETE` | `tenants.delete` | Soft delete (sets `enabled=false`) |
| GET    | `/api/tenants/by-slug/[slug]` | `tenants-by-slug.handler.GET` | `tenants.read` | Authenticated slug lookup |
| GET    | `/api/tenants/[slug]/public` | `tenants-public.handler.GET` | **public** | Composition endpoint: tenant + config + isBusinessHours |
| GET    | `/api/tenant-members` | `tenant-members.handler.GET` | `tenant-members.read` | List members (filterable by tenant_id, user_id) |
| POST   | `/api/tenant-members` | `tenant-members.handler.POST` | `tenant-members.create` | Add a member |
| GET    | `/api/tenant-members/[id]` | `tenant-members-by-id.handler.GET` | `tenant-members.read` | Fetch single membership |
| DELETE | `/api/tenant-members/[id]` | `tenant-members-by-id.handler.DELETE` | `tenant-members.delete` | Remove a member |
| GET    | `/api/tenants/[id]/business-hours` | `tenants-business-hours.handler.GET` | `tenants.read` | Open/closed check |

## Request / response shapes

### `GET /api/tenants` (list)

Query params consumed by `parseListParams`:

- `_start`, `_end` — pagination (`limit = _end - _start`)
- `_sort`, `_order` — sort column + direction (column allowlisted per
  F-05-01 pattern: `id`, `name`, `slug`, `enabled`, `createdAt`,
  `updatedAt`)
- `filter.enabled` — boolean
- `filter.slug` — substring match (`ILIKE`)
- `filter.q` — cross-field search on `name` or `slug`

Response: `listResponse` → `{ data, total }` + `Content-Range: tenants 0-24/137` header.

### `GET /api/tenants/[slug]/public`

**The only public endpoint.** Implemented as a composition pipeline:

1. `SELECT * FROM tenants WHERE slug = $1 AND enabled = true` → one row or 404.
2. `GET /api/module-configs/resolve-batch?moduleName=tenants&tenantId=<id>&keys=<14-key-list>`
3. Compute `isBusinessHours` from resolved `SCHEDULE` + `TIMEZONE` via `computeBusinessHours(...)`.
4. Assemble backward-compatible response:

```json
{
  "id": 1,
  "name": "Acme Dental",
  "slug": "acme-dental",
  "businessName": "Acme Dental Colombia SAS",
  "logo": "https://cdn.oven.app/tenants/acme-dental/logo.png",
  "timezone": "America/Bogota",
  "locale": "es",
  "schedule": {
    "monday":    { "open": "08:00", "close": "18:00" },
    "tuesday":   { "open": "08:00", "close": "18:00" },
    "wednesday": { "open": "08:00", "close": "18:00" },
    "thursday":  { "open": "08:00", "close": "18:00" },
    "friday":    { "open": "08:00", "close": "16:00" },
    "saturday":  { "open": "09:00", "close": "13:00" }
  },
  "authorizedServices": ["limpieza", "ortodoncia"],
  "paymentMethods": ["efectivo", "tarjeta"],
  "tone": "friendly",
  "schedulingUrl": "https://acmedental.booking.com",
  "welcomeMessageBusinessHours": "Hola! Bienvenido a Acme Dental. ¿En qué podemos ayudarte?",
  "welcomeMessageOutOfHours": "Gracias por contactarnos. Estamos cerrados. Te responderemos en horario hábil.",
  "isBusinessHours": true
}
```

The response shape is intentionally identical to the legacy `tenants`
table row — portal and chat-widget consumers never see the migration.

### `GET /api/tenants/[id]/business-hours`

Small JSON: `{ isBusinessHours: boolean, timezone: string, now: string }`.
Used by `module-chat` and `module-agent-core` gating logic.

## Error shapes

All handlers return JSON errors via `@oven/module-registry/api-utils`:

| Code | Shape | When |
|---|---|---|
| 400 | `{ error: string, details?: unknown }` | Invalid body (name missing, slug out of shape, role unknown) |
| 401 | `{ error: 'Unauthorized' }` | No auth token (except public endpoint) |
| 403 | `{ error: 'Forbidden' }` | Missing permission |
| 404 | `{ error: 'Not found' }` | Unknown id / slug / disabled tenant on public route |
| 409 | `{ error: 'Conflict', field: 'slug' }` | Duplicate slug |
| 500 | `{ error: 'Internal error' }` | Unexpected |

## Content-Range

All list endpoints emit the React Admin-compatible `Content-Range` header
for pagination. Example: `Content-Range: tenants 0-24/137`.

## Rate limiting

Not enforced at the handler level — routed through the platform-wide
rate limiter in `apps/dashboard/src/middleware.ts`. The public composition
endpoint has a tighter limit (`30 req/min/ip`) because it is the only
unauthenticated surface. Limits are declared in `module-config` under
`tenants.RATE_LIMIT_PUBLIC_PER_MIN` (default `30`) and
`tenants.RATE_LIMIT_PUBLIC_BURST` (default `10`).

## Events emitted

See [`module-design.md`](./module-design.md#events) for payload shapes.
Each write handler emits on the registry event bus at the end of a
successful transaction:

- `tenants.tenant.created` — from POST `/api/tenants`
- `tenants.tenant.updated` — from PUT `/api/tenants/[id]`
- `tenants.tenant.deleted` — from DELETE `/api/tenants/[id]`
- `tenants.member.added`   — from POST `/api/tenant-members`
- `tenants.member.removed` — from DELETE `/api/tenant-members/[id]`

## Chat action schemas

Exposed via the `chat` block for MCP / chat-agent discovery:

- `tenants.list` — GET `/api/tenants`
- `tenants.getPublic` — GET `/api/tenants/[slug]/public`
- `tenants.checkBusinessHours` — GET `/api/tenants/[id]/business-hours`

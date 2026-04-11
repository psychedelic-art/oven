# UI Flows -- API Reference

Every endpoint is implemented in `packages/module-ui-flows/src/api/*.handler.ts` and exposed through `apps/dashboard/src/app/api/...` route wrappers. The module's `apiHandlers` field in `index.ts` is the authoritative route map.

## Route summary

| Method | Path                                             | Handler file                           | Auth   |
|--------|--------------------------------------------------|----------------------------------------|--------|
| GET    | `/api/ui-flows`                                  | `ui-flows.handler.ts`                  | authed |
| POST   | `/api/ui-flows`                                  | `ui-flows.handler.ts`                  | authed |
| GET    | `/api/ui-flows/[id]`                             | `ui-flows-by-id.handler.ts`            | authed |
| PUT    | `/api/ui-flows/[id]`                             | `ui-flows-by-id.handler.ts`            | authed |
| DELETE | `/api/ui-flows/[id]`                             | `ui-flows-by-id.handler.ts`            | authed |
| POST   | `/api/ui-flows/[id]/publish`                     | `ui-flows-publish.handler.ts`          | authed |
| GET    | `/api/ui-flows/[id]/versions`                    | `ui-flows-versions.handler.ts`         | authed |
| POST   | `/api/ui-flows/[id]/versions/[versionId]/restore`| `ui-flows-versions-restore.handler.ts` | authed |
| GET    | `/api/ui-flow-pages`                             | `ui-flow-pages.handler.ts`             | authed |
| GET    | `/api/ui-flow-analytics`                         | `ui-flow-analytics.handler.ts`         | authed |
| GET    | `/api/portal/[tenantSlug]`                       | `portal-resolve.handler.ts`            | public |
| GET    | `/api/portal/[tenantSlug]/pages/[pageSlug]`      | `portal-page.handler.ts`               | public |
| GET    | `/api/portal/[tenantSlug]/theme`                 | `portal-theme.handler.ts`              | public |
| POST   | `/api/portal/[tenantSlug]/analytics`             | `portal-analytics.handler.ts`          | public |

Authentication: "authed" means the request must carry a valid session cookie and the caller must hold the relevant `ui-flows.*` or `ui-flow-analytics.*` permission. "public" means the route is declared in `api_endpoint_permissions` with `is_public=true` and requires no session.

## Authenticated endpoints

### `GET /api/ui-flows` -- list UI flows

Query parameters: React Admin `_start`, `_end`, `_sort`, `_order`, plus optional `tenantId` filter. Parsed via `parseListParams` from `@oven/module-registry/api-utils`.

Response:
```json
{
  "data": [
    {
      "id": 1,
      "tenantId": 5,
      "name": "Clinica Dental XYZ",
      "slug": "clinica-xyz",
      "status": "published",
      "version": 3,
      "enabled": true,
      "createdAt": "2026-04-01T12:00:00.000Z",
      "updatedAt": "2026-04-10T08:30:00.000Z"
    }
  ],
  "total": 1
}
```

Tenant isolation: if the caller has a scoped `x-tenant-id` header, the query filters on `uiFlows.tenantId`.

### `POST /api/ui-flows` -- create UI flow

Request body:
```json
{
  "name": "Clinica Dental XYZ",
  "slug": "clinica-xyz",
  "tenantId": 5,
  "description": "Main patient portal"
}
```

The handler inserts a new row with `status='draft'`, `version=1`, and an empty `definition` (`{ "pages": [], "navigation": { "items": [] }, "routing": { "defaultPage": "inicio" }, "footer": { "enabled": false, "links": [] } }`). Emits `ui-flows.flow.created`.

Permission required: `ui-flows.create`.

### `GET /api/ui-flows/[id]` -- read one UI flow

Returns the full row including `definition`, `themeConfig`, `domainConfig`. 404 if not found or if the caller's tenant does not match. Permission: `ui-flows.read`.

### `PUT /api/ui-flows/[id]` -- update UI flow

Request body is a partial row update. On success, the handler rebuilds `ui_flow_pages` from the new `definition.pages[]` array inside a transaction. Emits `ui-flows.flow.updated`. Permission: `ui-flows.update`.

### `DELETE /api/ui-flows/[id]` -- archive UI flow

Sets `status='archived'` and `enabled=false`. Does not hard-delete rows so that version history remains intact. Emits `ui-flows.flow.archived`. Permission: `ui-flows.delete`.

### `POST /api/ui-flows/[id]/publish` -- publish version

No request body. The handler:
1. Loads the current row.
2. Inserts a new row into `ui_flow_versions` with `version = current.version + 1`.
3. Updates `ui_flows` with `status='published'`, `version=new`, `updatedAt=now()`.
4. Emits `ui-flows.flow.published` with payload `{ id, tenantId, slug, version, domain }`.
5. Revalidates the Next.js ISR tag `flow:{id}:{version}`.

Permission: `ui-flows.publish`.

### `GET /api/ui-flows/[id]/versions` -- version history

Returns a list of `ui_flow_versions` rows ordered by `version DESC`. No paging; UI flows rarely exceed 30 versions. Permission: `ui-flows.read`.

### `POST /api/ui-flows/[id]/versions/[versionId]/restore` -- restore a version

Copies `definition` and `theme_config` from the target `ui_flow_versions` row back into `ui_flows`, bumps `version`, and inserts a new `ui_flow_versions` row with a description like `Restored from version N`. Does not change `status`. Emits `ui-flows.flow.updated`. Permission: `ui-flows.update`.

### `GET /api/ui-flow-pages` -- list pages

Returns rows from `ui_flow_pages`. Supports `_filter.ui_flow_id`. Used by the dashboard's inline page datagrid and by the analytics list for the page type filter. Permission: `ui-flows.read`.

### `GET /api/ui-flow-analytics` -- list analytics events

React Admin list with filters: `dateFrom`, `dateTo`, `pageSlug`, `eventType`, `uiFlowId`, `tenantId`. Results are paged. Permission: `ui-flow-analytics.read`.

## Public endpoints

### `GET /api/portal/[tenantSlug]` -- resolve portal definition

Returns the published flow definition for a tenant. Used by the portal app on every page load (cached via ISR).

Response:
```json
{
  "definition": { "pages": [...], "navigation": {...}, "routing": {...}, "footer": {...} },
  "theme": { "primaryColor": "#1976D2", ... },
  "domain": { "subdomain": "clinica-xyz", ... },
  "tenantName": "Clinica Dental XYZ",
  "version": 3
}
```

404 if tenant does not exist or has no `published` UI flow. No auth required; marked public in the seed's `api_endpoint_permissions`.

### `GET /api/portal/[tenantSlug]/pages/[pageSlug]` -- resolve one page

Returns only the page object plus the full theme, skipping the rest of the definition. Used when a tenant wants to embed a single portal page as an iframe in a third-party site.

Response:
```json
{
  "page": {
    "slug": "agendar",
    "title": "Agendar Cita",
    "type": "form",
    "formRef": "appointment-form",
    "config": {}
  },
  "theme": { "primaryColor": "#1976D2", ... }
}
```

### `GET /api/portal/[tenantSlug]/theme` -- resolve theme only

Used by cache preloads and by custom domains that want to pull just the theme for splash screens. Response is the `themeConfig` object alone.

### `POST /api/portal/[tenantSlug]/analytics` -- record analytics event

Request body:
```json
{
  "uiFlowId": 1,
  "pageSlug": "agendar",
  "eventType": "page_view",
  "visitorId": "v_abc123",
  "metadata": { "userAgent": "...", "referrer": "...", "duration": 12 }
}
```

The handler writes a row to `ui_flow_analytics`, emits `ui-flows.page.visited` or `ui-flows.form.submitted` depending on `eventType`, and returns `{ ok: true }`. Rate limited to 60 req/min per `visitorId`.

## Chat action schemas (MCP)

From `uiFlowsModule.chat.actionSchemas` in `packages/module-ui-flows/src/index.ts`:

| Name                | Endpoint                                     | Permissions              |
|---------------------|----------------------------------------------|--------------------------|
| `uiFlows.create`    | `POST ui-flows`                              | `ui-flows.create`        |
| `uiFlows.list`      | `GET ui-flows`                               | `ui-flows.read`          |
| `uiFlows.getPortal` | `GET portal/[tenantSlug]`                    | (public)                 |
| `uiFlows.publish`   | `POST ui-flows/[id]/publish`                 | `ui-flows.publish`       |
| `uiFlows.analytics` | `GET ui-flow-analytics`                      | `ui-flow-analytics.read` |

These are auto-discovered by `packages/module-registry` and surface as MCP tools via the agent toolchain documented in `docs/modules/workflow-agents/api.md`.

## Error shapes

All handlers return Next.js `Response.json` with standard shapes:

- `400` -- validation error: `{ error: "...", fields: { ... } }`
- `401` -- missing session (authed routes only)
- `403` -- missing permission: `{ error: "Forbidden", required: "ui-flows.update" }`
- `404` -- row not found or tenant mismatch
- `409` -- slug conflict on create
- `429` -- rate limit exceeded on analytics

Handlers never leak database internals or stack traces in the response body; full errors are logged via the shared logger.

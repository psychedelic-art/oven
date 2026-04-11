# UI Flows -- Architecture

The UI Flows system is a layered pipeline that takes a tenant's published `definition` JSONB and renders it as a branded multi-page portal. This document describes each layer and the data flow between them.

## Layered view

```
                            ┌────────────────────────────────────────────┐
    Tenant admin (browser)  │  @oven/ui-flows-editor (ReactFlow canvas) │
                            │    -- Drag pages, configure theme         │
                            │    -- Preview iframe                       │
                            │    -- Publish / Version diff / Restore     │
                            └────────────────────────────────────────────┘
                                     │  HTTP (authenticated)
                                     ▼
                            ┌────────────────────────────────────────────┐
    Dashboard API           │  apps/dashboard/src/app/api/ui-flows/**   │
                            │    -- Delegates to module-ui-flows         │
                            │       via Next.js route wrappers           │
                            └────────────────────────────────────────────┘
                                     │
                                     ▼
                            ┌────────────────────────────────────────────┐
    Module handlers         │  packages/module-ui-flows/src/api/*.handler│
                            │    -- List / CRUD / Publish / Versions     │
                            │    -- Portal resolve (public)              │
                            │    -- Analytics record (public)            │
                            └────────────────────────────────────────────┘
                                     │
                                     ▼
                            ┌────────────────────────────────────────────┐
    Drizzle + Postgres      │  ui_flows, ui_flow_versions,               │
                            │  ui_flow_pages, ui_flow_analytics          │
                            └────────────────────────────────────────────┘

                            ┌────────────────────────────────────────────┐
    Patient (browser)       │  apps/portal (Next.js 15 -- sprint-02)    │
                            │    -- src/middleware.ts                    │
                            │         subdomain -> tenantSlug            │
                            │    -- src/app/[[...slug]]/page.tsx         │
                            │         fetch /api/portal/[slug]           │
                            │         render page via type-specific      │
                            │         renderer (landing/form/faq/chat)   │
                            └────────────────────────────────────────────┘
                                     │  HTTP (public endpoints only)
                                     ▼
                            Same dashboard API as above
```

## Components

### 1. Data layer (`schema.ts`)

Four tables, all with plain integer FKs per `module-rules.md` Rule 4.3:

- `ui_flows` -- portal definition per tenant (multiple rows allowed for A/B testing or drafts).
- `ui_flow_versions` -- immutable snapshots captured on every publish, indexed by `(uiFlowId, version)`.
- `ui_flow_pages` -- denormalized page metadata synced from the `definition` JSONB on every save. Used by the inline dashboard datagrid and by analytics joins.
- `ui_flow_analytics` -- event stream (`page_view`, `form_submit`, `chat_start`, `cta_click`) with `visitor_id`, metadata JSONB, and a `created_at` index for time-range queries.

The `definition` JSONB is the single source of truth. `ui_flow_pages` is purely a read-model and gets fully rebuilt on every `PUT /api/ui-flows/[id]`.

### 2. Handler layer (`api/*.handler.ts`)

Eleven handlers grouped into three categories:

- **Authenticated CRUD** (`ui-flows`, `ui-flows-by-id`, `ui-flows-publish`, `ui-flows-versions`, `ui-flows-versions-restore`, `ui-flow-analytics`, `ui-flow-pages`) -- require the appropriate `ui-flows.*` permission and enforce tenant isolation via `x-tenant-id`.
- **Public portal resolvers** (`portal-resolve`, `portal-page`, `portal-theme`) -- no auth required; the tenant slug comes from the URL path and is verified against `tenants.slug`.
- **Public analytics recorder** (`portal-analytics`) -- no auth; takes a signed visitor cookie and writes to `ui_flow_analytics`. Rate-limited at the middleware layer.

Each handler delegates DB access to Drizzle; no raw SQL. Tenant filtering is applied via `eq(uiFlows.tenantId, Number(tenantId))`.

### 3. Module registration (`index.ts`)

`uiFlowsModule` is a `ModuleDefinition` that declares:

- `resources` -- React Admin resources for `ui-flows`, `ui-flow-analytics`, `ui-flow-pages`, `ui-flow-versions`.
- `apiHandlers` -- maps each route path to the handler exports. The dashboard's `app/api/ui-flows/**/route.ts` wrappers forward into this map.
- `configSchema` -- 5 config keys: `MAX_PAGES_PER_FLOW`, `ENABLE_CUSTOM_CSS`, `ANALYTICS_RETENTION_DAYS`, `DEFAULT_THEME`, `ENABLE_CUSTOM_DOMAINS`.
- `events.emits` -- the 6 events documented in `Readme.md`.
- `events.schemas` -- typed schemas per Rule 2.3.
- `chat.actionSchemas` -- 5 MCP action schemas for agent-initiated portal management (`uiFlows.create`, `uiFlows.list`, `uiFlows.getPortal`, `uiFlows.publish`, `uiFlows.analytics`).

### 4. Editor layer (`packages/ui-flows-editor`)

A ReactFlow v12 canvas. Five node types (`PageNode`, `NavigationNode`, `ThemeNode`, `FooterNode`, `RedirectNode`) render the definition structure. Five panels (`PagePalette`, `PageInspector`, `ThemePanel`, `NavigationPanel`, `PreviewPanel`) manipulate it. A toolbar (`PublishButton`, `VersionHistoryButton`, `PreviewButton`) drives the CRUD side effects. State lives in a zustand store created via a factory function and injected through a React context per the root `CLAUDE.md` rule.

Round-trip conversion between `UiFlowDefinition` and ReactFlow `nodes/edges` lives in `utils/definition-converter.ts`. Validation lives in `utils/validation.ts` and is invoked before `PublishButton` dispatches.

### 5. Portal runtime (sprint-02)

A dedicated `apps/portal` Next.js 15 app. Responsibilities:

1. **Subdomain extraction** (`middleware.ts`) -- split `host` on `.`, take the leftmost label unless it matches `www` or the root domain, rewrite the request to include `?tenantSlug=<slug>`.
2. **Tenant resolution** (`lib/resolve-tenant.ts`) -- fetch `/api/portal/[tenantSlug]` on the server side, cache with ISR tied to the flow version.
3. **Page rendering** (`app/[[...slug]]/page.tsx`) -- pick the renderer by `pageType` and pass the page `config` plus the resolved theme.
4. **Theme injection** (`app/layout.tsx`) -- emit a `<style>` tag with CSS custom properties derived from `themeConfig`. This is the sole acceptable use of inline `style=` per `CLAUDE.md` (dynamic CSS custom properties from runtime values).
5. **Analytics beacon** (`lib/analytics-client.ts`) -- on mount, POST a `page_view` event; attach an event listener for `form_submit` and `chat_start`.

Until sprint-02 ships, this runtime is temporarily hosted inside the dashboard at `apps/dashboard/src/app/portal/[tenantSlug]/[[...slug]]/page.tsx`. That file is marked for deletion in `sprint-02-portal-app.md`.

## Data flow: publish

```
Editor "Publish" button
  ├── validation.ts checks the in-memory definition
  ├── POST /api/ui-flows/[id] (PUT) with current definition
  │     └── handler writes to ui_flows, rebuilds ui_flow_pages rows
  └── POST /api/ui-flows/[id]/publish
        ├── handler reads current ui_flows row
        ├── INSERT into ui_flow_versions with version = prior + 1
        ├── UPDATE ui_flows set status='published', version=new
        └── emit 'ui-flows.flow.published' event
```

## Data flow: patient page view

```
Patient visits clinica-xyz.portal.myapp.com/agendar
  ├── apps/portal middleware rewrites to /agendar?tenantSlug=clinica-xyz
  ├── [[...slug]]/page.tsx calls resolveTenant(slug)
  │     └── GET /api/portal/clinica-xyz
  │            -> returns { definition, theme, domain, tenantName }
  ├── page.tsx picks pages.find(p => p.slug === 'agendar')
  ├── FormRenderer fetches /api/forms/[formRef]/render
  ├── Theme CSS variables injected in layout.tsx
  └── After hydration, analytics-client.ts posts
          POST /api/portal/clinica-xyz/analytics
                type=page_view, pageSlug=agendar
                                 -> ui_flow_analytics insert
                                 -> emit 'ui-flows.page.visited'
```

## Caching strategy

- **Dashboard API reads** -- no cache; admin wants fresh state.
- **Portal resolve (`GET /api/portal/[tenantSlug]`)** -- Next.js ISR with `revalidate=60`, keyed by `(tenantSlug, version)` so a publish busts the cache instantly via `revalidateTag('flow:{id}:{version}')`.
- **Theme assets** -- logo, favicon, hero images served from `module-files` with the files module's own CDN headers.

## Observability

Every handler emits structured logs via the shared logger in `@oven/module-registry`. `sub_usage_records` is NOT consulted for UI flows directly -- analytics volume is recorded in `ui_flow_analytics`. If per-tenant quota becomes necessary, a future enhancement will record `ui-flows.analytics` rows in `sub_usage_records` with a service slug of `portal-analytics-events`.

## Extension points

- **New page types** -- add a renderer under `apps/portal/src/components/renderers/` and add the type string to `UiFlowPage['type']` in `types.ts`. The editor's `PagePalette` auto-discovers new types via a registry object in `ui-flows-editor`.
- **New theme properties** -- extend `ThemeConfig` in `types.ts`, add a field in `ThemePanel`, emit the CSS custom property in `layout.tsx`.
- **New events** -- add to `events.emits` + `events.schemas` in `index.ts`, no other change required.

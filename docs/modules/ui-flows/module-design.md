# UI Flows -- Module Design

This document captures the `ModuleDefinition` wiring for `module-ui-flows` and how it integrates into the OVEN module registry. For the layered runtime architecture see `architecture.md`.

## ModuleDefinition (authoritative)

The following is extracted from `packages/module-ui-flows/src/index.ts` and is the single source of truth. The editor package is a separate `@oven/ui-flows-editor` package that the dashboard app consumes directly.

```typescript
export const uiFlowsModule: ModuleDefinition = {
  name: 'ui-flows',
  dependencies: ['forms', 'tenants'],
  description: 'Dynamic tenant-facing page portals with routing, theming, and analytics',
  capabilities: [
    'create tenant portal',
    'publish portal to subdomain',
    'manage portal pages',
    'configure portal theme',
    'track portal analytics',
  ],
  schema: uiFlowsSchema,
  seed: seedUiFlows,
  resources: [
    { name: 'ui-flows', options: { label: 'UI Flows' } },
    { name: 'ui-flow-analytics', options: { label: 'Portal Analytics' } },
    { name: 'ui-flow-pages', options: { label: 'Flow Pages' } },
    { name: 'ui-flow-versions', options: { label: 'Flow Versions' } },
  ],
  menuItems: [
    { label: 'UI Flows', to: '/ui-flows' },
    { label: 'Portal Analytics', to: '/ui-flow-analytics' },
  ],
  apiHandlers: {
    'ui-flows': { GET: uiFlowsHandler.GET, POST: uiFlowsHandler.POST },
    'ui-flows/[id]': { GET, PUT, DELETE }, // ui-flows-by-id.handler
    'ui-flows/[id]/publish': { POST: uiFlowsPublishHandler.POST },
    'ui-flows/[id]/versions': { GET: uiFlowsVersionsHandler.GET },
    'ui-flows/[id]/versions/[versionId]/restore': { POST: uiFlowsVersionsRestoreHandler.POST },
    'portal/[tenantSlug]': { GET: portalResolveHandler.GET },
    'portal/[tenantSlug]/pages/[pageSlug]': { GET: portalPageHandler.GET },
    'portal/[tenantSlug]/theme': { GET: portalThemeHandler.GET },
    'portal/[tenantSlug]/analytics': { POST: portalAnalyticsHandler.POST },
    'ui-flow-analytics': { GET: uiFlowAnalyticsHandler.GET },
    'ui-flow-pages': { GET: uiFlowPagesHandler.GET },
  },
  configSchema: [...],  // see configSchema section
  events: {
    emits: [
      'ui-flows.flow.created',
      'ui-flows.flow.updated',
      'ui-flows.flow.published',
      'ui-flows.flow.archived',
      'ui-flows.page.visited',
      'ui-flows.form.submitted',
    ],
    schemas: eventSchemas,  // see eventSchemas section
  },
  chat: {
    description: '...',
    capabilities: [...],
    actionSchemas: [...],  // see chat.actionSchemas section
  },
};
```

## Resources

React Admin resources declared in `resources[]`. The dashboard-side components live in `apps/dashboard/src/components/`:

| Resource            | List component            | Create/Edit/Show              | Custom route                         |
|---------------------|---------------------------|-------------------------------|--------------------------------------|
| `ui-flows`          | `UiFlowList`              | `UiFlowCreate`, `UiFlowEdit`, `UiFlowShow` | `UiFlowEditorPage` at `/ui-flows/:id/editor` |
| `ui-flow-analytics` | `UiFlowAnalyticsList`     | read-only                     | -                                    |
| `ui-flow-pages`     | inline within `UiFlowEdit`| -                             | -                                    |
| `ui-flow-versions`  | modal within `UiFlowEdit` | -                             | -                                    |

## Menu items

The module registers two menu items (`UI Flows`, `Portal Analytics`). `CustomMenu.tsx` groups them under a **Portals** section using `sx` styling:

```tsx
<Divider sx={{ my: 1 }} />
<Box sx={{ px: 2, pb: 0.5 }}>
  <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>
    Portals
  </Typography>
</Box>
<Menu.ResourceItem name="ui-flows" />
<Menu.ResourceItem name="ui-flow-analytics" />
```

No inline `style={}`. Per root `CLAUDE.md`.

## configSchema

Five keys, documented in `docs/modules/20-module-config.md` terminology:

| Key                       | Type    | Default                                    | Instance scoped | Description                                           |
|---------------------------|---------|--------------------------------------------|:---------------:|-------------------------------------------------------|
| `MAX_PAGES_PER_FLOW`      | number  | `20`                                       | yes             | Hard cap on pages per UI flow; enforced by editor validation + server on PUT. |
| `ENABLE_CUSTOM_CSS`       | boolean | `false`                                    | yes             | Allow tenants to inject `themeConfig.customCss` into the portal `<style>` tag. |
| `ANALYTICS_RETENTION_DAYS`| number  | `90`                                       | yes             | Retention window for `ui_flow_analytics` rows. Cron job prunes older. |
| `DEFAULT_THEME`           | json    | `{"primaryColor":"#1976D2","fontFamily":"Inter"}` | no | Global default used by the create flow when `themeConfig` is unset.    |
| `ENABLE_CUSTOM_DOMAINS`   | boolean | `true`                                     | no              | Platform kill switch for the Vercel custom domain registration flow. |

## events.schemas (typed)

From `packages/module-ui-flows/src/index.ts`:

```typescript
const eventSchemas: EventSchemaMap = {
  'ui-flows.flow.created': {
    id: { type: 'number', description: 'UI Flow DB ID', required: true },
    tenantId: { type: 'number', description: 'Owning tenant ID', required: true },
    name: { type: 'string', description: 'Flow display name' },
    slug: { type: 'string', description: 'URL-safe slug' },
  },
  'ui-flows.flow.updated': {
    id: { type: 'number', description: 'UI Flow DB ID', required: true },
    tenantId: { type: 'number', description: 'Owning tenant ID', required: true },
    name: { type: 'string', description: 'Flow display name' },
    version: { type: 'number', description: 'Current version number' },
  },
  'ui-flows.flow.published': {
    id: { type: 'number', description: 'UI Flow DB ID', required: true },
    tenantId: { type: 'number', description: 'Owning tenant ID', required: true },
    slug: { type: 'string', description: 'URL-safe slug' },
    version: { type: 'number', description: 'Published version number' },
    domain: { type: 'string', description: 'Portal domain (subdomain or custom)' },
  },
  'ui-flows.flow.archived': {
    id: { type: 'number', description: 'UI Flow DB ID', required: true },
    tenantId: { type: 'number', description: 'Owning tenant ID', required: true },
    slug: { type: 'string', description: 'URL-safe slug' },
  },
  'ui-flows.page.visited': {
    uiFlowId: { type: 'number', description: 'UI Flow DB ID', required: true },
    tenantId: { type: 'number', description: 'Owning tenant ID', required: true },
    pageSlug: { type: 'string', description: 'Visited page slug' },
    visitorId: { type: 'string', description: 'Anonymous visitor identifier' },
    metadata: { type: 'object', description: 'Visit metadata (user agent, referrer)' },
  },
  'ui-flows.form.submitted': {
    uiFlowId: { type: 'number', description: 'UI Flow DB ID', required: true },
    tenantId: { type: 'number', description: 'Owning tenant ID', required: true },
    pageSlug: { type: 'string', description: 'Page where form was submitted' },
    formId: { type: 'number', description: 'Form DB ID' },
    submissionId: { type: 'number', description: 'Form submission DB ID' },
  },
};
```

## chat.actionSchemas

Five MCP actions exposed to agent workflows:

1. `uiFlows.create` -- `POST ui-flows` -- `ui-flows.create` permission.
2. `uiFlows.list` -- `GET ui-flows` -- `ui-flows.read` permission.
3. `uiFlows.getPortal` -- `GET portal/[tenantSlug]` -- public.
4. `uiFlows.publish` -- `POST ui-flows/[id]/publish` -- `ui-flows.publish` permission.
5. `uiFlows.analytics` -- `GET ui-flow-analytics` -- `ui-flow-analytics.read` permission.

See `api.md` for full parameter shapes.

## Dependency graph

```
                 ┌──────────────────┐
                 │  module-registry │
                 └──────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
  ┌──────────┐     ┌──────────┐      ┌──────────┐
  │ tenants  │     │  forms   │      │  roles   │
  └──────────┘     └──────────┘      └──────────┘
         \________________│________________/
                          │
                 ┌──────────────────┐
                 │    ui-flows      │  <-- this module
                 └──────────────────┘
                          │  (runtime only, not declared deps)
         ┌────────────────┼────────────────┐
         │                │                │
  ┌──────────┐   ┌────────────────┐  ┌───────────┐
  │  files   │   │ knowledge-base │  │ chat +    │
  │          │   │   (faq pages)  │  │ agent-*   │
  └──────────┘   └────────────────┘  └───────────┘
```

Hard dependencies are declared in `uiFlowsModule.dependencies = ['forms', 'tenants']`. The runtime touch-points (`knowledge-base`, `chat`, `agent-core`, `agent-ui`, `files`) are not declared as hard dependencies because a portal can be rendered even when those modules are disabled -- the corresponding page types simply render an informative "feature disabled" state instead of failing.

## Seed (`seedUiFlows`)

From `packages/module-ui-flows/src/seed.ts`. Inserts:

1. Six `permissions` rows: `ui-flows.read`, `ui-flows.create`, `ui-flows.update`, `ui-flows.delete`, `ui-flows.publish`, `ui-flow-analytics.read`.
2. Four `api_endpoint_permissions` rows marking the public portal routes (`portal/[tenantSlug]`, `portal/[tenantSlug]/pages/[pageSlug]`, `portal/[tenantSlug]/theme`, `portal/[tenantSlug]/analytics`).

No example data in the seed -- that lives in tenant-specific seeds (`dental-seed.ts`).

## Slug utilities

From `packages/module-ui-flows/src/slug-utils.ts`:

- `normalizePageSlug(input)` -- lowercases, removes invalid chars, enforces max length.
- `normalizeFlowSlug(input)` -- same rules, plus rejects reserved words (`api`, `admin`, `dashboard`).
- `pageSlugToUrlSegment(slug)` -- maps `HOME_PAGE_SENTINEL` to the empty string and everything else to `/<slug>`.
- `urlSegmentToPageSlug(segment)` -- reverse mapping; used by the portal catch-all route.
- `HOME_PAGE_SENTINEL` -- sentinel value for the home page slug (used when `routing.defaultPage` points at `/`).

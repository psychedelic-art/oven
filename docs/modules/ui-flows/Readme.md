# Module: UI Flows

> **Package**: `packages/module-ui-flows/` + `packages/ui-flows-editor/`
> **npm**: `@oven/module-ui-flows` + `@oven/ui-flows-editor`
> **Phase**: 6 (tenant-facing portals)
> **Status**: In graduation -- see `docs/modules/todo/ui-flows/STATUS.md`

---

## What It Does

UI Flows is the tenant-facing portal system. Every tenant that subscribes to OVEN gets a branded multi-page portal served on a subdomain (or a verified custom domain) that patients and end-users land on. Each portal is described by a JSONB `definition` -- a list of pages, a navigation bar, a routing map, and a footer -- stored in the `ui_flows` table and rendered dynamically by the `apps/portal` Next.js 15 app.

A UI flow is *not* the same as `module-flows` (`01-flows.md`). `module-flows` is an internal content pipeline with stages and reviews. `module-ui-flows` is the public-facing mini-website that a tenant publishes so patients can book appointments, read FAQs, chat with the support agent, and submit forms.

Pages in a UI flow delegate their content to one of 5 renderers:

| Type | Content source |
|------|----------------|
| `form` | A `module-forms` Form rendered via the published GrapeJS layer |
| `landing` | Built-in hero-and-CTA renderer, optionally backed by a Form |
| `faq` | Searchable accordion backed by `module-knowledge-base` entries |
| `chat` | Embedded `@oven/agent-ui` widget configured with an agent slug |
| `custom` | Generic Form renderer for arbitrary content |

## Why It Exists

The dental project (see `docs/dental-project.md`) is the reference customer: each clinic onboarded into OVEN must expose a branded website at `clinica-xyz.portal.myapp.com` where patients can book appointments, find FAQs, and chat with the clinic agent. Without UI flows, every tenant would require a custom Next.js app -- with UI flows, a new tenant is one row in `ui_flows` plus one row in each `ui_flow_pages` entry.

The secondary driver is A/B testing: because each tenant can have multiple `ui_flows` rows with different `status` values, marketing can publish a new portal variant without touching code.

## Quick Start

1. Register the module in `apps/dashboard/src/lib/modules.ts` after `tenantsModule` and `formsModule`.
2. Run the seed to create permissions and public endpoint declarations.
3. Navigate to **Portals > UI Flows** in the dashboard and click **Create**.
4. Configure the portal name, slug, and tenant.
5. Click **Visual Editor** to open the ReactFlow canvas (`ui-flows-editor`) and drag in `landing`, `form`, `faq`, `chat` pages.
6. Click **Publish**. The portal is now live at `http://{tenantSlug}.localhost:3001` in dev.

## Package Location

```
packages/module-ui-flows/
  package.json
  tsconfig.json
  src/
    index.ts                                     -- ModuleDefinition + re-exports
    schema.ts                                    -- Drizzle tables (4)
    types.ts                                     -- UiFlowDefinition, Page, Theme, Domain
    seed.ts                                      -- Permissions + public endpoint seeds
    slug-utils.ts                                -- Page/flow slug normalization + HOME_PAGE_SENTINEL
    api/
      ui-flows.handler.ts                        -- GET list / POST create
      ui-flows-by-id.handler.ts                  -- GET / PUT / DELETE by id
      ui-flows-publish.handler.ts                -- POST publish (status=published, version++)
      ui-flows-versions.handler.ts               -- GET version history
      ui-flows-versions-restore.handler.ts       -- POST restore a version
      portal-resolve.handler.ts                  -- Public: resolve portal for tenant slug
      portal-page.handler.ts                     -- Public: resolve a single page
      portal-theme.handler.ts                    -- Public: resolve theme config
      portal-analytics.handler.ts                -- Public: record analytics events
      ui-flow-analytics.handler.ts               -- Authed: list/export analytics
      ui-flow-pages.handler.ts                   -- Authed: inline page list

packages/ui-flows-editor/
  src/
    UiFlowCanvas.tsx                             -- ReactFlow canvas
    nodes/                                       -- PageNode, NavigationNode, ThemeNode, FooterNode, RedirectNode
    panels/                                      -- PagePalette, PageInspector, ThemePanel, NavigationPanel, PreviewPanel
    components/                                  -- Shared subcomponents
    store/                                       -- Zustand factory + React context
    index.ts
```

## Dependencies

| Dependency | Role |
|---|---|
| `module-registry` | ModuleDefinition registration, API utilities, EventBus |
| `module-forms` | Page renderer source for `form` and `custom` page types |
| `module-tenants` | Tenant scoping, slug resolution for subdomain routing |
| `module-roles` | Permission-based access control on CRUD and publish |
| `module-files` | Logo, favicon, hero image storage |
| `module-knowledge-base` *(runtime)* | Source for `faq` page type |
| `module-chat` + `module-agent-core` *(runtime)* | Source for `chat` page type |
| `module-config` | Per-tenant config cascade (MAX_PAGES_PER_FLOW, ENABLE_CUSTOM_CSS, ANALYTICS_RETENTION_DAYS) |

Hard dependencies are declared in `uiFlowsModule.dependencies` as `['forms', 'tenants']`; everything else is a soft runtime touch-point used by specific page renderers.

## Key Exports

```typescript
// ModuleDefinition
export { uiFlowsModule } from './index';

// Schema (Drizzle tables)
export { uiFlows, uiFlowVersions, uiFlowPages, uiFlowAnalytics } from './schema';

// Slug utils
export {
  normalizePageSlug,
  normalizeFlowSlug,
  pageSlugToUrlSegment,
  urlSegmentToPageSlug,
  HOME_PAGE_SENTINEL,
} from './slug-utils';

// Types
export type {
  UiFlowDefinition,
  UiFlowPage,
  UiFlowNavigation,
  UiFlowRouting,
  UiFlowFooter,
  ThemeConfig,
  DomainConfig,
  AnalyticsEventType,
} from './types';

// Seed
export { seedUiFlows } from './seed';
```

## Events Emitted

| Event | When |
|---|---|
| `ui-flows.flow.created` | Row inserted in `ui_flows` |
| `ui-flows.flow.updated` | Row updated (any column) |
| `ui-flows.flow.published` | Publish handler flips status to `published` and bumps `version` |
| `ui-flows.flow.archived` | Archive handler flips status to `archived` |
| `ui-flows.page.visited` | Portal analytics handler receives a page_view event |
| `ui-flows.form.submitted` | Portal form submission finalized |

## Related Documentation

| Document | Description |
|---|---|
| [Architecture](./architecture.md) | Layered view + subdomain resolution + theme propagation |
| [Module Design](./module-design.md) | ModuleDefinition graph, resources, events, config |
| [Requirements](./detailed-requirements.md) | Functional requirements with acceptance criteria |
| [API Reference](./api.md) | Every route with request/response shape and auth scope |
| [Database](./database.md) | The 4 tables, indexes, versioning, RLS notes |
| [Security](./secure.md) | OWASP coverage, custom CSS sandbox, custom domain verification |
| [UI Design](./UI.md) | Dashboard resources, editor nodes/panels, portal renderers |
| [Use-Case Compliance](./use-case-compliance.md) | Mapping to platform use cases and dental project tasks |
| [References](./references.md) | External resources and prior art |

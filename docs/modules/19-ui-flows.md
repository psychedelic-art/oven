# Module: UI Flows

> **Package**: `packages/module-ui-flows/` + `packages/ui-flows-editor/`
> **Name**: `@oven/module-ui-flows` + `@oven/ui-flows-editor`
> **Dependencies**: `module-registry`, `module-roles`, `module-tenants`, `module-forms`
> **Status**: Planned

---

## 1. Overview

UI Flows is a **dynamic tenant-facing page system** that works like `module-workflows` but for UI. Instead of defining automation nodes, it defines **pages and routes** that are fetched from the API and rendered dynamically per tenant.

Each UI Flow is a JSON definition of a mini-application — a set of pages with navigation, theme, and routing — served on a tenant's subdomain. Individual pages reuse `module-forms` definitions for their content, leveraging the 3-layer architecture (Data, Business, Frontend) already built into Forms.

This is **not** the same as `module-flows` (01-flows.md), which is a content pipeline with stages and transitions. `module-ui-flows` is about rendering tenant-facing portals — dynamic websites served on custom subdomains where each tenant gets their own branded experience.

### Key Differentiators

| Concern | module-flows | module-forms | module-ui-flows |
|---------|-------------|-------------|----------------|
| Purpose | Content pipeline (stages, reviews, approvals) | Individual page/form builder (GrapeJS) | Multi-page tenant portal with routing |
| Content | References any content type | Builds single pages | Composes multiple Forms into a routed app |
| Output | Flow items moving through stages | Published form/page | Live tenant portal on subdomain |
| Audience | Internal teams (reviewers, authors) | Form designers | Tenant end-users (patients, customers) |

---

## 2. Core Concepts

### UI Flow
A reusable portal definition that specifies pages, navigation, routing, theme, and footer for a tenant-facing website. Stored as JSONB in the `definition` column.

### Page Reference
Each page in a UI Flow references a `module-forms` Form by slug or ID. The Form provides the full rendering capability (GrapeJS components, data binding, business logic). Special page types (`faq`, `chat`, `landing`) have built-in renderers that don't require a Form reference.

### Theme Config
Per-tenant branding configuration — colors, logo, fonts, border radius, custom CSS. Applied as CSS variables to the portal layout.

### Domain Config
Each UI Flow can be served on:
- **Subdomain**: `clinica-xyz.portal.myapp.com` (automatic via wildcard)
- **Custom domain**: `www.clinicaxyz.com` (registered via Vercel SDK)

### Portal App
A separate Next.js 15 application (`apps/portal`) that resolves subdomains to tenants, fetches UI Flow definitions from the API, and renders pages dynamically. See `docs/apps-portal.md` for full architecture.

---

## 3. Page Types

| Type | Description | Requires Form Ref? |
|------|-------------|-------------------|
| `form` | Renders a `module-forms` Form — full GrapeJS output with data binding and submissions | Yes |
| `landing` | Hero section with CTA buttons, images, and text blocks | Optional (can use built-in renderer or a Form) |
| `faq` | Fetches FAQ entries from `module-knowledge-base` API, renders as searchable accordion | No |
| `chat` | Embeds the `agent-ui` chat widget with a specific agent | No |
| `custom` | Generic page that always references a Form for content | Yes |

### Built-in Page Renderers

For `faq` and `chat` page types, the portal app includes built-in renderers that fetch data directly from module APIs:

- **FAQ Renderer**: `GET /api/knowledge-base/[tenantSlug]/search` → renders categories + entries as an accordion with search
- **Chat Renderer**: Embeds `@oven/agent-ui` widget configured with the agent slug from page config

For `form` and `custom` types, the portal fetches the Form definition via `GET /api/forms/[id]/render` and renders the published GrapeJS output.

---

## 4. Database Schema

### Tables

**`ui_flows`** — Portal definitions (one per tenant, or multiple for A/B testing)
```typescript
export const uiFlows = pgTable('ui_flows', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  description: text('description'),
  definition: jsonb('definition').notNull(),         // pages, navigation, routing, footer
  themeConfig: jsonb('theme_config'),                // colors, logo, fonts
  domainConfig: jsonb('domain_config'),              // subdomain, custom domain settings
  status: varchar('status', { length: 20 }).notNull().default('draft'), // draft | published | archived
  version: integer('version').notNull().default(1),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('ui_flows_tenant_id_idx').on(table.tenantId),
  index('ui_flows_slug_idx').on(table.slug),
  index('ui_flows_status_idx').on(table.status),
]);
```

**`ui_flow_versions`** — Version history snapshots
```typescript
export const uiFlowVersions = pgTable('ui_flow_versions', {
  id: serial('id').primaryKey(),
  uiFlowId: integer('ui_flow_id').notNull(),
  version: integer('version').notNull(),
  definition: jsonb('definition').notNull(),
  themeConfig: jsonb('theme_config'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('ui_fv_flow_id_idx').on(table.uiFlowId),
  unique('ui_fv_unique').on(table.uiFlowId, table.version),
]);
```

**`ui_flow_pages`** — Denormalized page metadata (synced from definition JSONB on save)
```typescript
export const uiFlowPages = pgTable('ui_flow_pages', {
  id: serial('id').primaryKey(),
  uiFlowId: integer('ui_flow_id').notNull(),
  tenantId: integer('tenant_id').notNull(),
  slug: varchar('slug', { length: 128 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  pageType: varchar('page_type', { length: 50 }).notNull(), // form | faq | landing | chat | custom
  formId: integer('form_id'),                                // FK → forms (nullable)
  config: jsonb('config'),                                   // page-specific config
  position: integer('position').notNull().default(0),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('ui_fp_flow_id_idx').on(table.uiFlowId),
  index('ui_fp_tenant_id_idx').on(table.tenantId),
  index('ui_fp_slug_idx').on(table.slug),
  unique('ui_fp_flow_page').on(table.uiFlowId, table.slug),
]);
```

**`ui_flow_analytics`** — Portal usage tracking
```typescript
export const uiFlowAnalytics = pgTable('ui_flow_analytics', {
  id: serial('id').primaryKey(),
  uiFlowId: integer('ui_flow_id').notNull(),
  tenantId: integer('tenant_id').notNull(),
  pageSlug: varchar('page_slug', { length: 128 }).notNull(),
  eventType: varchar('event_type', { length: 50 }).notNull(), // page_view | form_submit | chat_start | cta_click
  visitorId: varchar('visitor_id', { length: 255 }),
  metadata: jsonb('metadata'),                                 // user agent, referrer, duration
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('ui_fa_flow_id_idx').on(table.uiFlowId),
  index('ui_fa_tenant_id_idx').on(table.tenantId),
  index('ui_fa_created_at_idx').on(table.createdAt),
]);
```

---

## 5. Definition Format (JSONB)

### UI Flow Definition

```json
{
  "pages": [
    {
      "slug": "inicio",
      "title": "Inicio",
      "type": "landing",
      "formRef": null,
      "config": {
        "heroImage": "/files/t5/hero.jpg",
        "ctaText": "Agendar Cita",
        "ctaLink": "/agendar"
      }
    },
    {
      "slug": "agendar",
      "title": "Agendar Cita",
      "type": "form",
      "formRef": "appointment-form",
      "config": {}
    },
    {
      "slug": "faq",
      "title": "Preguntas Frecuentes",
      "type": "faq",
      "formRef": null,
      "config": {
        "dataSource": "knowledge-base",
        "categoryFilter": "general",
        "searchEnabled": true
      }
    },
    {
      "slug": "chat",
      "title": "Chat",
      "type": "chat",
      "formRef": null,
      "config": {
        "agentSlug": "dental-faq-agent",
        "placeholder": "¿En qué puedo ayudarte?",
        "welcomeMessage": "¡Hola! Soy el asistente de la clínica."
      }
    }
  ],
  "navigation": {
    "type": "top-bar",
    "items": [
      { "label": "Inicio", "pageSlug": "inicio" },
      { "label": "Agendar", "pageSlug": "agendar" },
      { "label": "FAQ", "pageSlug": "faq" },
      { "label": "Chat", "pageSlug": "chat", "highlight": true }
    ],
    "showLogo": true,
    "position": "fixed"
  },
  "routing": {
    "defaultPage": "inicio",
    "notFoundPage": "inicio",
    "redirects": [
      { "from": "/cita", "to": "/agendar" },
      { "from": "/preguntas", "to": "/faq" }
    ]
  },
  "footer": {
    "enabled": true,
    "links": [
      { "label": "WhatsApp", "url": "https://wa.me/573001234567", "icon": "whatsapp" },
      { "label": "Política de Privacidad", "pageSlug": "privacidad" }
    ],
    "copyright": "© 2026 Clínica Dental XYZ",
    "showPoweredBy": true
  }
}
```

### Theme Config

```json
{
  "primaryColor": "#1976D2",
  "secondaryColor": "#FF9800",
  "backgroundColor": "#FFFFFF",
  "surfaceColor": "#F5F5F5",
  "textColor": "#333333",
  "fontFamily": "Inter",
  "headingFontFamily": "Inter",
  "logoUrl": "/files/t5/logo.png",
  "faviconUrl": "/files/t5/favicon.ico",
  "borderRadius": "8px",
  "maxContentWidth": "1200px",
  "customCss": ""
}
```

### Domain Config

```json
{
  "subdomain": "clinica-xyz",
  "customDomain": "www.clinicaxyz.com",
  "customDomainVerified": true,
  "sslStatus": "active"
}
```

---

## 6. API Endpoints

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| GET/POST | `/api/ui-flows` | List and create UI flows | Authenticated |
| GET/PUT/DELETE | `/api/ui-flows/[id]` | Single flow CRUD | Authenticated |
| POST | `/api/ui-flows/[id]/publish` | Set status=published, increment version | Authenticated |
| GET | `/api/ui-flows/[id]/versions` | Version history | Authenticated |
| POST | `/api/ui-flows/[id]/versions/[versionId]/restore` | Restore a version | Authenticated |
| GET | `/api/portal/[tenantSlug]` | Resolve published flow for tenant | **Public** |
| GET | `/api/portal/[tenantSlug]/pages/[pageSlug]` | Resolve a specific page | **Public** |
| GET | `/api/portal/[tenantSlug]/theme` | Resolve theme config | **Public** |
| POST | `/api/portal/[tenantSlug]/analytics` | Record analytics event | **Public** |
| GET/POST | `/api/ui-flow-analytics` | List analytics / export | Authenticated |

### Handler Examples

**List handler with tenant filtering (Rule 5.2, Rule 10.1)**:
```typescript
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const tenantId = request.headers.get('x-tenant-id');

  const filters = tenantId
    ? eq(uiFlows.tenantId, Number(tenantId))
    : undefined;

  const [rows, [{ count }]] = await Promise.all([
    db.select().from(uiFlows).where(filters).offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(uiFlows).where(filters),
  ]);

  return listResponse(rows, 'ui-flows', params, Number(count));
}
```

**Public portal resolver**:
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantSlug: string } }
) {
  const tenant = await db.select().from(tenants)
    .where(eq(tenants.slug, params.tenantSlug)).limit(1);

  if (!tenant.length) return notFound();

  const flow = await db.select().from(uiFlows)
    .where(and(
      eq(uiFlows.tenantId, tenant[0].id),
      eq(uiFlows.status, 'published'),
      eq(uiFlows.enabled, true),
    ))
    .limit(1);

  if (!flow.length) return notFound();

  return Response.json({
    definition: flow[0].definition,
    theme: flow[0].themeConfig,
    domain: flow[0].domainConfig,
    tenantName: tenant[0].name,
  });
}
```

---

## 7. Editor Package (`ui-flows-editor`)

### Package: `packages/ui-flows-editor/`

A standalone React package using **ReactFlow** for the portal page/route graph editor:

```
packages/ui-flows-editor/
  src/
    UiFlowCanvas.tsx               ← ReactFlow canvas for page/route layout
    nodes/
      PageNode.tsx                 ← Represents a page (form | faq | chat | landing | custom)
      NavigationNode.tsx           ← Navigation menu definition
      ThemeNode.tsx                ← Theme/branding configuration
      FooterNode.tsx               ← Footer links and copyright
      RedirectNode.tsx             ← URL redirect rule
    panels/
      PagePalette.tsx              ← Drag-and-drop page types
      PageInspector.tsx            ← Configure selected page (form ref, slug, title, config)
      ThemePanel.tsx               ← Color pickers, logo upload, font selector
      NavigationPanel.tsx          ← Menu item ordering, labels, highlights
      PreviewPanel.tsx             ← Live preview iframe
    toolbar/
      PublishButton.tsx            ← Publish the flow (changes status to published)
      VersionHistoryButton.tsx     ← Open version history modal
      PreviewButton.tsx            ← Open portal preview in new tab
    utils/
      definition-converter.ts      ← ReactFlow nodes/edges ↔ UiFlowDefinition conversion
      validation.ts                ← Validate definition (required pages, valid form refs)
```

### Peer Dependencies
- `@xyflow/react` (ReactFlow v12)
- `react`, `react-dom`
- `@mui/material`, `@mui/icons-material`

### Visual Layout

```
┌──────────────┐
│  Navigation  │──→ Page: inicio ──→ Page: agendar
│  (top-bar)   │──→ Page: faq
│              │──→ Page: chat
└──────────────┘

┌──────────────┐    ┌──────────────┐
│    Theme     │    │    Footer    │
│  #1976D2     │    │  © 2026 ...  │
│  Inter       │    │  WhatsApp    │
└──────────────┘    └──────────────┘

Redirect: /cita → /agendar
Redirect: /preguntas → /faq
```

---

## 8. Dashboard UI

### React Admin Resources

- **UI Flows** — List, Create, Edit, Show
  - List: Datagrid with tenant filter, status badges (draft/published/archived), domain column, page count
  - Create: SimpleForm with name, slug, description, tenant selector
  - Edit: SimpleForm + toolbar with "Visual Editor" and "Preview" buttons
  - Show: Definition JSON viewer, version history tab, analytics summary

- **UI Flow Pages** — Inline within UI Flow detail (not a standalone resource)
  - Datagrid showing page slug, title, type, form reference, position, enabled toggle

- **UI Flow Analytics** — List with filters
  - Date range filter, page slug filter, event type filter, tenant filter
  - Summary cards: total views, unique visitors, form submissions, chat starts

### Custom Pages

- **UI Flow Editor** (`/ui-flows/[id]/editor`) — Full-page ReactFlow editor
- **Portal Preview** (`/ui-flows/[id]/preview`) — iframe rendering the portal for review

### Menu Section

```
──── Portals ────
UI Flows
Portal Analytics
```

Added to `CustomMenu.tsx`:
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

---

## 9. Events

| Event | Payload |
|-------|---------|
| `ui-flows.flow.created` | `{ id, tenantId, name, slug }` |
| `ui-flows.flow.updated` | `{ id, tenantId, name, version }` |
| `ui-flows.flow.published` | `{ id, tenantId, slug, version, domain }` |
| `ui-flows.flow.archived` | `{ id, tenantId, slug }` |
| `ui-flows.page.visited` | `{ uiFlowId, tenantId, pageSlug, visitorId, metadata }` |
| `ui-flows.form.submitted` | `{ uiFlowId, tenantId, pageSlug, formId, submissionId }` |

### Typed Event Schemas

```typescript
events: {
  emits: [
    'ui-flows.flow.created',
    'ui-flows.flow.updated',
    'ui-flows.flow.published',
    'ui-flows.flow.archived',
    'ui-flows.page.visited',
    'ui-flows.form.submitted',
  ],
  schemas: {
    'ui-flows.flow.created': {
      id: { type: 'number', description: 'UI Flow DB ID', required: true },
      tenantId: { type: 'number', description: 'Owning tenant ID', required: true },
      name: { type: 'string', description: 'Flow display name' },
      slug: { type: 'string', description: 'URL-safe slug' },
    },
    'ui-flows.flow.published': {
      id: { type: 'number', description: 'UI Flow DB ID', required: true },
      tenantId: { type: 'number', description: 'Owning tenant ID', required: true },
      slug: { type: 'string', description: 'URL-safe slug' },
      version: { type: 'number', description: 'Published version number' },
      domain: { type: 'string', description: 'Portal domain (subdomain or custom)' },
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
  },
}
```

---

## 10. ModuleDefinition

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
  schema: { uiFlows, uiFlowVersions, uiFlowPages, uiFlowAnalytics },
  seed: seedUiFlows,
  resources: [
    {
      name: 'ui-flows',
      list: UiFlowList,
      create: UiFlowCreate,
      edit: UiFlowEdit,
      show: UiFlowShow,
      icon: WebIcon,
      options: { label: 'UI Flows' },
    },
    {
      name: 'ui-flow-analytics',
      list: UiFlowAnalyticsList,
      icon: AnalyticsIcon,
      options: { label: 'Portal Analytics' },
    },
  ],
  customRoutes: [
    { path: '/ui-flows/:id/editor', component: UiFlowEditorPage },
    { path: '/ui-flows/:id/preview', component: UiFlowPreviewPage },
  ],
  menuItems: [
    { label: 'UI Flows', to: '/ui-flows' },
    { label: 'Portal Analytics', to: '/ui-flow-analytics' },
  ],
  apiHandlers: {
    'ui-flows': { GET: listUiFlows, POST: createUiFlow },
    'ui-flows/[id]': { GET: getUiFlow, PUT: updateUiFlow, DELETE: deleteUiFlow },
    'ui-flows/[id]/publish': { POST: publishUiFlow },
    'ui-flows/[id]/versions': { GET: listUiFlowVersions },
    'ui-flows/[id]/versions/[versionId]/restore': { POST: restoreUiFlowVersion },
    'portal/[tenantSlug]': { GET: resolvePortal },
    'portal/[tenantSlug]/pages/[pageSlug]': { GET: resolvePortalPage },
    'portal/[tenantSlug]/theme': { GET: resolvePortalTheme },
    'portal/[tenantSlug]/analytics': { POST: recordAnalyticsEvent },
    'ui-flow-analytics': { GET: listAnalytics },
  },
  configSchema: [
    {
      key: 'MAX_PAGES_PER_FLOW',
      type: 'number',
      description: 'Maximum pages per UI flow',
      defaultValue: 20,
      instanceScoped: true,
    },
    {
      key: 'ENABLE_CUSTOM_CSS',
      type: 'boolean',
      description: 'Allow tenants to inject custom CSS in portals',
      defaultValue: false,
      instanceScoped: true,
    },
    {
      key: 'ANALYTICS_RETENTION_DAYS',
      type: 'number',
      description: 'Days to retain analytics events before cleanup',
      defaultValue: 90,
      instanceScoped: true,
    },
    {
      key: 'DEFAULT_THEME',
      type: 'json',
      description: 'Default theme for new portals',
      defaultValue: '{"primaryColor":"#1976D2","fontFamily":"Inter"}',
      instanceScoped: false,
    },
    {
      key: 'ENABLE_CUSTOM_DOMAINS',
      type: 'boolean',
      description: 'Allow tenants to configure custom domains',
      defaultValue: true,
      instanceScoped: false,
    },
  ],
  events: {
    emits: [
      'ui-flows.flow.created',
      'ui-flows.flow.updated',
      'ui-flows.flow.published',
      'ui-flows.flow.archived',
      'ui-flows.page.visited',
      'ui-flows.form.submitted',
    ],
    listeners: {
      'forms.form.published': async (payload) => {
        // When a form is published, check if any UI flow page references it
        // and auto-notify the tenant admin
      },
    },
    schemas: {
      // See Section 9 for typed schemas
    },
  },
  chat: {
    description: 'Manages dynamic tenant-facing page portals with forms, FAQ, chat, and routing. Each tenant gets a branded portal on a subdomain.',
    capabilities: [
      'create UI flow',
      'publish portal',
      'list portal pages',
      'view portal analytics',
      'configure portal theme',
    ],
    actionSchemas: [
      {
        name: 'uiFlows.create',
        description: 'Create a new UI flow portal for a tenant',
        parameters: {
          tenantId: { type: 'number', description: 'Tenant ID', required: true },
          name: { type: 'string', description: 'Portal name', required: true },
          slug: { type: 'string', description: 'URL slug', required: true },
        },
        returns: { id: { type: 'number' }, slug: { type: 'string' } },
        requiredPermissions: ['ui-flows.create'],
        endpoint: { method: 'POST', path: 'ui-flows' },
      },
      {
        name: 'uiFlows.getPortal',
        description: 'Get the published portal definition for a tenant',
        parameters: {
          tenantSlug: { type: 'string', description: 'Tenant slug', required: true },
        },
        returns: { definition: { type: 'object' }, theme: { type: 'object' } },
        requiredPermissions: [],
        endpoint: { method: 'GET', path: 'portal/[tenantSlug]' },
      },
      {
        name: 'uiFlows.publish',
        description: 'Publish a UI flow, making it live on the tenant subdomain',
        parameters: {
          id: { type: 'number', description: 'UI Flow ID', required: true },
        },
        requiredPermissions: ['ui-flows.publish'],
        endpoint: { method: 'POST', path: 'ui-flows/[id]/publish' },
      },
      {
        name: 'uiFlows.analytics',
        description: 'Get portal analytics for a UI flow',
        parameters: {
          uiFlowId: { type: 'number', description: 'UI Flow ID' },
          dateFrom: { type: 'string', description: 'Start date (ISO 8601)' },
          dateTo: { type: 'string', description: 'End date (ISO 8601)' },
        },
        requiredPermissions: ['ui-flow-analytics.read'],
        endpoint: { method: 'GET', path: 'ui-flow-analytics' },
      },
    ],
  },
};
```

---

## 11. Seed Data

```typescript
export async function seedUiFlows(db: any) {
  // Seed permissions
  const modulePermissions = [
    { resource: 'ui-flows', action: 'read', slug: 'ui-flows.read', description: 'View UI flow portals' },
    { resource: 'ui-flows', action: 'create', slug: 'ui-flows.create', description: 'Create UI flow portals' },
    { resource: 'ui-flows', action: 'update', slug: 'ui-flows.update', description: 'Edit UI flow portals' },
    { resource: 'ui-flows', action: 'delete', slug: 'ui-flows.delete', description: 'Delete UI flow portals' },
    { resource: 'ui-flows', action: 'publish', slug: 'ui-flows.publish', description: 'Publish UI flow portals' },
    { resource: 'ui-flow-analytics', action: 'read', slug: 'ui-flow-analytics.read', description: 'View portal analytics' },
  ];

  for (const perm of modulePermissions) {
    await db.insert(permissions).values(perm).onConflictDoNothing();
  }

  // Seed public endpoint permissions
  const publicEndpoints = [
    { module: 'ui-flows', route: 'portal/[tenantSlug]', method: 'GET', isPublic: true },
    { module: 'ui-flows', route: 'portal/[tenantSlug]/pages/[pageSlug]', method: 'GET', isPublic: true },
    { module: 'ui-flows', route: 'portal/[tenantSlug]/theme', method: 'GET', isPublic: true },
    { module: 'ui-flows', route: 'portal/[tenantSlug]/analytics', method: 'POST', isPublic: true },
  ];

  for (const ep of publicEndpoints) {
    await db.insert(apiEndpointPermissions).values(ep).onConflictDoNothing();
  }
}
```

---

## 12. Integration Points

| Module | Integration |
|--------|-------------|
| **module-forms** | Pages reference Forms for content rendering. UI flows depend on `module-forms` for the GrapeJS 3-layer architecture |
| **module-tenants** | Each UI flow is tenant-scoped. Tenant domain management provides custom domain registration |
| **module-knowledge-base** | FAQ page type fetches entries from KB API endpoints |
| **module-chat** | Chat page type embeds the `agent-ui` widget with a configured agent |
| **module-files** | Theme logos, hero images, and assets stored via `module-files` bucket |
| **module-roles** | Permission-based access to create, edit, publish portals |
| **module-workflows** | Trigger workflows on portal events (e.g., notify admin on form submission) |
| **module-notifications** | Portal form submissions can trigger notification workflows (e.g., appointment confirmation via WhatsApp) |
| **module-flows** | A Form going through a Flow pipeline can be published as a UI flow page at the terminal stage |

---

## 13. Portal App Overview

The portal is served by a separate Next.js app at `apps/portal/`. Full architecture is documented in `docs/apps-portal.md`. Key points:

- **Subdomain resolution**: Next.js middleware extracts subdomain from hostname → resolves tenant
- **Custom domains**: Tenant adds a custom domain → verified via TXT record → Vercel auto-provisions SSL
- **Dynamic rendering**: Catch-all route `[...slug]/page.tsx` fetches UI Flow definition from API → renders appropriate page component
- **Theme application**: CSS variables injected from `themeConfig` → consistent branding across all pages
- **Analytics**: Client-side events sent to `/api/portal/[tenantSlug]/analytics`

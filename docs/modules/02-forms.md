# Module: Forms

> **Package**: `packages/module-forms/` + `packages/form-editor/`
> **Name**: `@oven/module-forms` + `@oven/form-editor`
> **Dependencies**: `module-registry`, `module-roles`
> **Status**: In Progress (core editor, component registry, discovery, and rendering implemented)

---

## 1. Overview

Forms is an **enterprise interface builder** that enables teams to construct fully dynamic pages, forms, and applications using a visual drag-and-drop editor built on **GrapeJS**, rendered in **React**. Every form is stored as a JSON definition encompassing three layers: **Data**, **Business**, and **Frontend** — making it possible to dynamically build components, edit pages, and create complete application interfaces without writing code.

The ambition is to bring the complexity of enterprise applications (like MEA-class tools) down to a configurable, visual builder — where data fetching, business logic, and UI rendering are all composable and reusable.

---

## 2. Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| GrapeJS editor integration | **Done** | Plain GrapeJS (no `grapesjs-react` wrapper) with manual init |
| Component registry (DB) | **Done** | 42 seeded components across 6 categories with `data_contract` |
| `registerOvenComponents()` | **Done** | Dynamic block registration from DB + `className` preservation |
| `serializeComponent()` | **Done** | GrapeJS → `ComponentNode` tree converter with data source + workflow serialization |
| Canvas Tailwind v4 styling | **Done** | CDN + `@import "tailwindcss"` trigger + `selectorManager.escapeName` + `triggerTailwindRescan()` |
| Preview mode (React) | **Done** | `TailwindPreviewFrame` iframe with `renderComponentTree()` + `FormProvider` |
| Discovery API | **Done** | `GET /api/form-discovery?type=workflows\|endpoints` for trait dropdowns |
| Dynamic trait dropdowns | **Done** | Workflow slug + Data Source Endpoint as `select` with pre-fetched options |
| Advanced API settings | **Done** | Method, headers, auth type/value, body traits for API data sources |
| Form versions | **Done** | Auto-versioning on definition change |
| Form submissions | **Done** | Capture + query submissions |
| Data Layer (full) | Planned | Grouped fetches, caching, dependency chaining |
| Business Layer | Planned | Transformations, validation rules, computed fields |
| Drag-to-bind UX | Planned | Visual data source → component binding |
| Published mode rendering | Partial | `renderComponentTree()` works; portal integration pending |
| Data source test endpoint | Planned | `POST /api/form-data-sources/[id]/test` |

---

## 3. Three-Layer Architecture

### Data Layer
Responsible for fetching, caching, and providing data to components.

- **HTTP Request Definitions**: Define requests to internal OVEN API endpoints or external services, with method, URL, headers, params, and body templates
- **API Discovery**: `GET /api/form-discovery?type=endpoints` scans available endpoints from the module registry so builders can pick from known APIs without typing URLs
- **Workflow Discovery**: `GET /api/form-discovery?type=workflows` lists enabled workflows for workflow-based data sources and action triggers
- **Schema Discovery**: For each API endpoint, retrieve and display the response schema so users can map output fields to components visually
- **Grouped Fetches**: Combine multiple data sources into groups that execute as `Promise.all` (parallel), `Promise.race` (fastest wins), or sequential (chained) — similar to how workflow nodes compose operations
- **Caching Policies**: Configure per-source caching: none, session-scoped, or TTL-based
- **Dependency Chaining**: A data source can depend on the output of another (e.g., "fetch user, then fetch their orders")

### Business Layer
Transforms and validates data between the Data Layer and the Frontend Layer.

- **Field Transformations**: Map, rename, compute, and filter fields from data source outputs
- **Validation Rules**: Define constraints on inputs before submission (required, type, range, pattern)
- **Computed Fields**: Derived values calculated from multiple data sources
- **Conditional Logic**: Show/hide components, enable/disable fields, change labels based on data values

### Frontend Layer
The visual interface composed in GrapeJS.

- **Component Library**: A curated set of reusable components (inputs, tables, lists, cards, buttons, layouts) that are GrapeJS blocks
- **Data Binding**: Each component declares which data layer fields it consumes, with a clear mapping UI showing source field to component property
- **Stateful Components**: Components like lists and tables that manage their own state (pagination, sorting, selection, filtering) while bound to data layer outputs
- **Layout System**: Grid, flex, tabs, accordions, cards — standard responsive containers
- **Action Handlers**: Buttons and forms can trigger data layer mutations (POST/PUT/DELETE), workflow executions, or emit events

---

## 4. Component Library

42 components registered in the `form_components` table, organized in 6 categories:

### Input Components (10)
`oven-text-input`, `oven-textarea`, `oven-number-input`, `oven-email-input`, `oven-phone-input`, `oven-select`, `oven-checkbox`, `oven-radio-group`, `oven-toggle`, `oven-date-picker`

### Data Display Components (7)
`oven-data-table`, `oven-data-list`, `oven-data-card`, `oven-stat-card`, `oven-badge`, `oven-avatar`, `oven-progress-bar`

### Layout Components (8)
`oven-grid-2col`, `oven-grid-3col`, `oven-container`, `oven-card`, `oven-divider`, `oven-spacer`, `oven-tabs`, `oven-accordion`

### Action Components (5)
`oven-button`, `oven-submit-button`, `oven-link-button`, `oven-icon-button`, `oven-action-menu`

### Navigation Components (5)
`oven-breadcrumbs`, `oven-pagination`, `oven-sidebar-nav`, `oven-tab-navigation`, `oven-stepper`

### Content Components (7)
`oven-heading`, `oven-paragraph`, `oven-image`, `oven-alert`, `oven-hero-section`, `oven-feature-grid`, `oven-footer`

Each component has a `data_contract` defining its inputs (with types, defaults, and options) and outputs, plus a `className` property for Tailwind CSS styling.

---

## 5. Data Binding UX

The connection between data and components needs to be intuitive:

1. **Data Source Panel** (sidebar): Shows all configured data sources with their output schemas. Users can browse available API endpoints discovered from the module registry.
2. **Drag-to-Bind**: Drag a field from a data source onto a component property in the inspector to create a binding.
3. **Mapping Preview**: When a component is selected, show which data fields are bound and a live preview of the data flowing through.
4. **Schema Viewer**: For any selected API endpoint, display the response structure so the user knows exactly what fields are available.

---

## 6. Database Schema

### Tables

**`forms`** — Form/page definitions
- `id`, `name`, `slug`, `description`
- `definition` (JSONB) — GrapeJS editor state (components, styles, data bindings)
- `dataLayerConfig` (JSONB) — data source definitions, groups, caching rules
- `businessLayerConfig` (JSONB) — transformations, validations, computed fields
- `version`, `status` (draft/published/archived)
- `createdBy`, `createdAt`, `updatedAt`

**`form_versions`** — Version history
- `id`, `formId`, `version`, `definition`, `dataLayerConfig`, `businessLayerConfig`, `description`, `createdAt`

**`form_components`** — Registered reusable components
- `id`, `name`, `slug`, `category`, `description`
- `definition` (JSONB) — GrapeJS block definition
- `defaultProps` (JSONB), `dataContract` (JSONB — expected input schema including `className`)
- `createdAt`, `updatedAt`

**`form_data_sources`** — Saved/reusable data source configurations
- `id`, `name`, `slug`, `formId` (nullable — null means shared/reusable)
- `type` (internal-api / external-http / static)
- `config` (JSONB — URL, method, headers, params, body template)
- `outputSchema` (JSONB — cached response structure)
- `cachingPolicy` (none/session/ttl), `ttlSeconds`
- `createdAt`, `updatedAt`

**`form_submissions`** — Submitted data from rendered forms
- `id`, `formId`, `formVersion`
- `data` (JSONB — the submitted field values)
- `submittedBy`, `submittedAt`
- `metadata` (JSONB — user agent, IP, duration, etc.)

---

## 7. API Endpoints

| Method | Route | Purpose | Status |
|--------|-------|---------|--------|
| GET/POST | `/api/forms` | List and create forms | Done |
| GET/PUT/DELETE | `/api/forms/[id]` | Single form CRUD | Done |
| GET | `/api/forms/[id]/render` | Get the published form for rendering | Done |
| GET/POST | `/api/form-submissions` | List and create submissions | Done |
| GET | `/api/form-submissions/[id]` | Get a single submission | Done |
| GET/POST | `/api/form-components` | List and register reusable components | Done |
| GET/PUT/DELETE | `/api/form-components/[id]` | Component CRUD | Done |
| GET/POST | `/api/form-data-sources` | List and create data source configs | Done |
| GET/PUT/DELETE | `/api/form-data-sources/[id]` | Data source CRUD | Done |
| GET | `/api/form-discovery` | Discover workflows + API endpoints for editor traits | Done |
| GET | `/api/form-versions` | Version history | Done |
| POST | `/api/form-data-sources/[id]/test` | Test a data source and return sample output | Planned |
| POST | `/api/form-versions/[id]/restore` | Restore a version | Planned |

---

## 8. Editor Package (`form-editor`)

### Package: `packages/form-editor/`

A standalone React package wrapping GrapeJS with OVEN-specific configuration. Uses **plain GrapeJS** (not `grapesjs-react`) with manual `grapesjs.init()` lifecycle.

#### Source Files

| File | Purpose |
|------|---------|
| `FormEditor.tsx` | Main component — GrapeJS init, canvas styling, `serializeComponent()`, save/load |
| `registerOvenComponents.ts` | Registers DB-sourced blocks as GrapeJS components with traits, `onRender()`, and `className` extraction |
| `types.ts` | TypeScript interfaces (`EditorConfig`, `BlockDefinition`, `EditorState`, `DiscoveryData`) |
| `index.ts` | Package exports |

#### Key Implementation Details

**GrapeJS Initialization** (`FormEditor.tsx`):
- `selectorManager.escapeName`: Overrides GrapeJS's default CSS selector sanitizer to preserve Tailwind characters (`/`, `[`, `]`, `:`, `!`). Without this, `w-1/2` becomes `w-1-2`.
- `canvas.scripts`: Loads Tailwind v4 Browser CDN into the iframe
- `canvas:frame:load` event: Injects `@import "tailwindcss"` trigger style + `oven-canvas-styles` CSS for container/slot visual placeholders
- `storageManager: false`: Persistence handled by OVEN (save to DB via `handleSave`)

**Component Registration** (`registerOvenComponents.ts`):
- `registerOvenComponents(editor, options)`: Takes `blocks` (from DB) and `discovery` (workflows + endpoints), registers each as a GrapeJS component type with:
  - **Traits** (`buildTraits(block, discovery)`): Auto-generated from `dataContract.inputs`. Includes dynamic `select` dropdowns for Workflow and Data Source Endpoint using pre-fetched discovery data. Adds advanced API traits (Method, Headers, Auth Type/Value, Body) when data source type is API.
  - **`onRender()`**: Renders canvas placeholder markup for containers (header + drop slot), grid rows (flex cells with labels), grid cells, and leaf components (fallback placeholders). Calls `triggerTailwindRescan(el)` after DOM manipulation to force Tailwind v4 CDN rescan.
  - **`extractTraitProps()`**: Converts GrapeJS traits to React-friendly props, with special handling for `className` (extracts user classes from GrapeJS model, excludes `gjs-` prefixed selectors). Skips internal data/workflow traits from the props map.

**Serialization** (`serializeComponent()` in `FormEditor.tsx`):
- Converts GrapeJS component model → `ComponentNode` tree (stored in `forms.definition.components`)
- Extracts `dataSource` object from traits: endpoint, type, method, headers, authType, authValue, body
- Extracts `workflowSlug` → `node.actions[]` with `{ event: 'onClick', type: 'workflow', workflowSlug }`
- Falls back to GrapeJS model classes for `className` if not set via traits

**Canvas Tailwind Integration**:
- `triggerTailwindRescan(el)`: Helper that toggles a dummy class via `requestAnimationFrame` to trigger Tailwind v4 CDN's `MutationObserver` after raw DOM manipulation in `onRender()`.
- `oven-canvas-styles`: CSS rules for visual editing aids (container headers, drop slots, grid layout, fallback placeholders) that display in the editor canvas

#### Peer Dependencies
- `grapesjs` (>=0.21.0)
- `react`, `react-dom` (>=19.0.0)
- `@mui/material`, `@mui/icons-material` (>=6.0.0)
- `@oven/oven-ui` (workspace)

---

## 9. Page Creation Step-by-Step

### Creating a New Page/Form

1. **Navigate to Forms**: Go to `/#/forms` in the dashboard
2. **Create New**: Click "Create" — enter a name, slug, and optional description
3. **Open Editor**: After creation, navigate to `/#/forms/:id/editor` (or click "Edit" on the form detail page)

### Working in the Editor

4. **Drag Blocks**: The left sidebar shows available blocks organized by category:
   - **Basic**: Text, Heading, Image, Link, Video
   - **Layout**: Section, 2-Column, 3-Column
   - **Form**: Text Input, Textarea, Select, Checkbox, Button
   - **Oven Components**: All 42 registered components from the DB (Input, Data Display, Layout, Action, Navigation, Content categories)

5. **Arrange Components**: Drag blocks onto the canvas. Layout components (containers, grids) show visual drop zones. Grid rows auto-create equal-width cells.

6. **Configure Properties**: Click any component → right sidebar shows:
   - **Traits Panel**: Component-specific properties from `data_contract.inputs` (label, placeholder, required, variant, etc.)
   - **Data Category**: Data Source Type (None/API/Workflow/Static), Data Source Endpoint (dropdown of discovered API routes), and advanced settings (Method, Headers, Auth, Body)
   - **Actions Category**: Workflow dropdown (populated from enabled workflows in DB)
   - **Styles Panel**: CSS properties organized by sector (Layout, Dimension, Typography, Decorations)

7. **Set Data Bindings**: For data-driven components:
   - Select a Data Source Type (e.g., "API Endpoint")
   - Choose an endpoint from the discovery dropdown (e.g., `GET maps/maps`)
   - Optionally configure advanced settings: HTTP Method override, custom Headers (JSON), Auth Type + credentials, Request Body
   - Bind data fields to component props using `$.path` syntax in trait values

8. **Configure Workflow Triggers**: For action components (buttons):
   - Select a workflow from the Workflow dropdown
   - The serializer creates an `actions[]` entry with `{ event: 'onClick', type: 'workflow', workflowSlug }`

9. **Apply Tailwind Classes**: Use GrapeJS's class selector (Style Manager) to add Tailwind utility classes. The `selectorManager.escapeName` config preserves special characters like `/`, `[`, `]`.

### Preview & Save

10. **Preview Mode**: Click "Preview" button in the header bar. Toggles to a `TailwindPreviewFrame` that renders actual React components from `@oven/oven-ui` via `renderComponentTree()` inside an isolated iframe with full Tailwind CSS processing.

11. **Save**: Click "Save" (or Ctrl/Cmd+S). The editor serializes the GrapeJS component tree into `ComponentNode[]` format and sends a `PUT /api/forms/:id` with:
    ```json
    {
      "definition": {
        "components": [...],
        "styles": [...],
        "projectData": { ... }
      }
    }
    ```
    The `projectData` contains the full GrapeJS state for accurate reload. The `components` array contains the portable `ComponentNode` tree used by `renderComponentTree()`.

12. **Publishing**: Change form status to "published" — the form is now available via `GET /api/forms/:id/render` for the portal or other consumers.

---

## 10. Rendering Modes

| Mode | Description |
|------|-------------|
| **Edit** | Full GrapeJS editor — drag-and-drop, trait editing, style editing, data source configuration |
| **Preview** | Rendered as React components via `renderComponentTree()` inside `TailwindPreviewFrame` iframe with full Tailwind CSS |
| **Published** | Production render — data is fetched, interactions work, submissions are stored in `form_submissions` |
| **Submission View** | Read-only replay of a specific submission showing the form filled with that submission's data |

---

## 11. Events

| Event | Payload |
|-------|---------|
| `forms.form.created` | id, tenantId, name, slug |
| `forms.form.updated` | id, tenantId, name |
| `forms.form.published` | id, tenantId, version |
| `forms.form.archived` | id, tenantId, name |
| `forms.submission.created` | id, tenantId, formId, formVersion, submittedBy |
| `forms.component.registered` | id, name, slug, category |

---

## 12. Integration Points

| Module | Integration |
|--------|-------------|
| **module-roles** | Permission-based access to edit, publish, submit forms |
| **module-workflows** | Workflow discovery for action triggers; workflow execution on button clicks |
| **module-flows** | Forms can be Flow items — drafted, reviewed, and published through stages |
| **module-question-types** | Educational question components are a special category in the component library |
| **module-analytics-forms** | Analytics dashboards can embed form submission data |
| **module-chat** | Chat agent can create and modify forms via `chat.actionSchemas` |

---

## Module Rules Compliance

> Added per [`module-rules.md`](../module-rules.md) — 7 required items.

### A. Schema Updates — tenantId + Indexes

```typescript
// forms
tenantId: integer('tenant_id').notNull(),
}, (table) => [
  index('forms_tenant_id_idx').on(table.tenantId),
  index('forms_slug_idx').on(table.slug),
  index('forms_status_idx').on(table.status),
  index('forms_created_by_idx').on(table.createdBy),
]);

// form_versions
}, (table) => [
  index('fv_form_id_idx').on(table.formId),
  unique('fv_unique').on(table.formId, table.version),
]);

// form_components
tenantId: integer('tenant_id'),  // nullable — null means platform-global
}, (table) => [
  index('fc_tenant_id_idx').on(table.tenantId),
  index('fc_slug_idx').on(table.slug),
  index('fc_category_idx').on(table.category),
]);

// form_data_sources
tenantId: integer('tenant_id'),  // nullable — null means shared
}, (table) => [
  index('fds_tenant_id_idx').on(table.tenantId),
  index('fds_form_id_idx').on(table.formId),
  index('fds_slug_idx').on(table.slug),
]);

// form_submissions
tenantId: integer('tenant_id').notNull(),
}, (table) => [
  index('fsub_tenant_id_idx').on(table.tenantId),
  index('fsub_form_id_idx').on(table.formId),
  index('fsub_submitted_by_idx').on(table.submittedBy),
]);
```

### B. Chat Block

```typescript
chat: {
  description: 'Enterprise interface builder module. Manages dynamic forms with versioned definitions, reusable component registries, data-source bindings, and submission capture.',
  capabilities: [
    'list and search forms',
    'create new forms',
    'list form submissions',
    'manage form components',
    'manage form data sources',
  ],
  actionSchemas: [
    {
      name: 'forms.list',
      description: 'List forms with optional filtering by tenant, status, or search term',
      parameters: {
        tenantId: { type: 'number', description: 'Filter by tenant ID' },
        status: { type: 'string', description: 'Filter by status (draft, published, archived)' },
        q: { type: 'string', description: 'Search forms by name' },
      },
      returns: { data: { type: 'array' }, total: { type: 'number' } },
      requiredPermissions: ['forms.read'],
      endpoint: { method: 'GET', path: 'forms' },
    },
    {
      name: 'forms.create',
      description: 'Create a new form with definition and configuration',
      parameters: {
        tenantId: { type: 'number', description: 'Tenant ID', required: true },
        name: { type: 'string', description: 'Form name', required: true },
        slug: { type: 'string', description: 'URL-safe slug', required: true },
        description: { type: 'string', description: 'Form description' },
        definition: { type: 'object', description: 'Form JSON definition' },
      },
      returns: { id: { type: 'number' }, name: { type: 'string' } },
      requiredPermissions: ['forms.create'],
      endpoint: { method: 'POST', path: 'forms' },
    },
    {
      name: 'forms.listSubmissions',
      description: 'List form submissions with optional filtering',
      parameters: {
        tenantId: { type: 'number', description: 'Filter by tenant ID' },
        formId: { type: 'number', description: 'Filter by form ID' },
      },
      returns: { data: { type: 'array' }, total: { type: 'number' } },
      requiredPermissions: ['form-submissions.read'],
      endpoint: { method: 'GET', path: 'form-submissions' },
    },
  ],
},
```

### C. configSchema

```typescript
configSchema: [
  {
    key: 'MAX_COMPONENTS_PER_FORM',
    type: 'number',
    description: 'Maximum components per form definition',
    defaultValue: 200,
    instanceScoped: true,
  },
  {
    key: 'MAX_DATA_SOURCES_PER_FORM',
    type: 'number',
    description: 'Maximum data sources per form',
    defaultValue: 20,
    instanceScoped: true,
  },
  {
    key: 'SUBMISSION_RETENTION_DAYS',
    type: 'number',
    description: 'Days to retain form submissions (0 = forever)',
    defaultValue: 0,
    instanceScoped: true,
  },
],
```

### D. Typed Event Schemas

```typescript
events: {
  schemas: {
    'forms.form.created': {
      id: { type: 'number', required: true },
      tenantId: { type: 'number', required: true },
      name: { type: 'string' },
      slug: { type: 'string' },
    },
    'forms.form.published': {
      id: { type: 'number', required: true },
      tenantId: { type: 'number', required: true },
      version: { type: 'number' },
    },
    'forms.submission.created': {
      id: { type: 'number', required: true },
      tenantId: { type: 'number', required: true },
      formId: { type: 'number', required: true },
      submittedBy: { type: 'number' },
    },
    'forms.component.registered': {
      id: { type: 'number', required: true },
      name: { type: 'string' },
      slug: { type: 'string' },
      category: { type: 'string' },
    },
  },
},
```

### E. Seed Function

```typescript
export async function seedForms(db: any) {
  // Seeds 42 form_components across 6 categories with data_contracts
  // Seeds permissions for forms, form-submissions, form-components, form-data-sources
  // Uses onConflictDoUpdate for idempotent re-runs
}
```

### F. API Handler Example

```typescript
// GET /api/forms — List handler with tenant filtering
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const tenantId = request.headers.get('x-tenant-id');

  const conditions = [];
  if (tenantId) conditions.push(eq(forms.tenantId, Number(tenantId)));
  if (params.filter?.status) conditions.push(eq(forms.status, params.filter.status));

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ count }]] = await Promise.all([
    db.select().from(forms).where(where)
      .orderBy(desc(forms.updatedAt))
      .offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(forms).where(where),
  ]);

  return listResponse(rows, 'forms', params, Number(count));
}
```

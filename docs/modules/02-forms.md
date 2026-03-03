# Module: Forms

> **Package**: `packages/module-forms/` + `packages/form-editor/`
> **Name**: `@oven/module-forms` + `@oven/form-editor`
> **Dependencies**: `module-registry`, `module-roles`
> **Status**: Planned

---

## 1. Overview

Forms is an **enterprise interface builder** that enables teams to construct fully dynamic pages, forms, and applications using a visual drag-and-drop editor built on **GrapeJS**, rendered in **React**. Every form is stored as a JSON definition encompassing three layers: **Data**, **Business**, and **Frontend** — making it possible to dynamically build components, edit pages, and create complete application interfaces without writing code.

The ambition is to bring the complexity of enterprise applications (like MEA-class tools) down to a configurable, visual builder — where data fetching, business logic, and UI rendering are all composable and reusable.

---

## 2. Three-Layer Architecture

### Data Layer
Responsible for fetching, caching, and providing data to components.

- **HTTP Request Definitions**: Define requests to internal OVEN API endpoints or external services, with method, URL, headers, params, and body templates
- **API Discovery**: Scan available endpoints from the module registry (via `registry.getAllApiEndpoints()`) so builders can pick from known APIs without typing URLs
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
- **Action Handlers**: Buttons and forms can trigger data layer mutations (POST/PUT/DELETE) or emit events

---

## 3. Component Library

### Input Components
- Text input, textarea, number input, email, password, phone
- Date picker, time picker, datetime picker
- Select (single), multi-select, combobox/autocomplete
- Checkbox, radio group, toggle switch
- File upload, image upload
- Rich text editor, code editor
- Slider, range picker, color picker

### Display Components
- Text/heading, paragraph, rich text block
- Image, avatar, icon
- Badge, chip, tag
- Progress bar, status indicator
- Divider, spacer

### Data Components
- **Data Table**: Sortable, filterable, paginated table bound to a data source. Configurable columns, inline actions, row selection
- **Data List**: Vertical list with customizable item template, pagination, search
- **Data Card Grid**: Card-based grid layout with data binding per card
- **Detail View**: Key-value display for a single record
- **Chart embed**: Embed a visualization from Analytics Forms

### Layout Components
- Grid container (responsive columns)
- Flex row / flex column
- Tabs, accordion, stepper
- Card, paper, modal, drawer
- Section with header

### Action Components
- Button (primary, secondary, outlined, text)
- Button group
- Form submit / reset
- Link / navigation
- Action menu (dropdown actions)

---

## 4. Data Binding UX

The connection between data and components needs to be intuitive:

1. **Data Source Panel** (sidebar): Shows all configured data sources with their output schemas. Users can browse available API endpoints discovered from the module registry.
2. **Drag-to-Bind**: Drag a field from a data source onto a component property in the inspector to create a binding.
3. **Mapping Preview**: When a component is selected, show which data fields are bound and a live preview of the data flowing through.
4. **Schema Viewer**: For any selected API endpoint, display the response structure so the user knows exactly what fields are available.

---

## 5. Database Schema

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
- `defaultProps` (JSONB), `dataContract` (JSONB — expected input schema)
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

## 6. API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET/POST | `/api/forms` | List and create forms |
| GET/PUT/DELETE | `/api/forms/[id]` | Single form CRUD |
| GET | `/api/forms/[id]/render` | Get the published form for rendering (read-only) |
| GET/POST | `/api/form-submissions` | List and create submissions |
| GET | `/api/form-submissions/[id]` | Get a single submission |
| GET/POST | `/api/form-components` | List and register reusable components |
| GET/PUT/DELETE | `/api/form-components/[id]` | Component CRUD |
| GET/POST | `/api/form-data-sources` | List and create data source configs |
| GET/PUT/DELETE | `/api/form-data-sources/[id]` | Data source CRUD |
| POST | `/api/form-data-sources/[id]/test` | Test a data source and return sample output |
| GET | `/api/form-data-sources/discover` | Discover available API endpoints from registry |
| GET | `/api/form-versions` | Version history |
| POST | `/api/form-versions/[id]/restore` | Restore a version |

---

## 7. Editor Package (`form-editor`)

### Package: `packages/form-editor/`

A standalone React package wrapping GrapeJS with OVEN-specific configuration:

- **GrapeJS Canvas**: The main visual editor where components are dragged, dropped, and arranged
- **Component Panel** (left sidebar): Categorized blocks from the component library
- **Data Source Panel** (left sidebar tab): Browse, configure, and test data sources
- **Style Panel** (right sidebar): CSS/style editor for the selected component
- **Properties Panel** (right sidebar tab): Component props + data binding configuration
- **Preview Mode**: Toggle between edit and preview to see the form with live data
- **Toolbar**: Save, publish, version history, preview, settings

### Peer Dependencies
- `grapesjs` + `grapesjs-react`
- `react`, `react-dom`
- `@mui/material`, `@mui/icons-material`

---

## 8. Rendering Modes

| Mode | Description |
|------|-------------|
| **Edit** | Full GrapeJS editor — drag-and-drop, data binding, style editing |
| **Preview** | Rendered form with live data fetching, all interactions work, but submissions are not persisted |
| **Published** | Production render — data is fetched, interactions work, submissions are stored in `form_submissions` |
| **Submission View** | Read-only replay of a specific submission showing the form filled with that submission's data |

---

## 9. Events

| Event | Payload |
|-------|---------|
| `forms.form.created` | id, name, slug, createdBy |
| `forms.form.updated` | id, name, slug, version |
| `forms.form.published` | id, name, slug, version |
| `forms.form.archived` | id, name, slug |
| `forms.submission.created` | id, formId, submittedBy |
| `forms.component.registered` | id, name, slug, category |

---

## 10. Integration Points

| Module | Integration |
|--------|-------------|
| **module-roles** | Permission-based access to edit, publish, submit forms |
| **module-flows** | Forms can be Flow items — drafted, reviewed, and published through stages |
| **module-workflows** | Trigger a workflow on form submission (e.g., process data, send notifications) |
| **module-question-types** | Educational question components are a special category in the component library |
| **module-analytics-forms** | Analytics dashboards can embed form submission data |
| **module-chat** | Chat agent can create and modify forms |

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
  description: 'Enterprise interface builder with GrapeJS visual editor. Builds dynamic forms, pages, and applications with 3-layer architecture (Data, Business, Frontend).',
  capabilities: [
    'create forms and pages',
    'publish forms',
    'list form submissions',
    'manage reusable components',
    'configure data sources',
  ],
  actionSchemas: [
    {
      name: 'forms.list',
      description: 'List forms with filtering and pagination',
      parameters: {
        tenantId: { type: 'number' },
        status: { type: 'string', description: 'draft/published/archived' },
      },
      returns: { data: { type: 'array' }, total: { type: 'number' } },
      requiredPermissions: ['forms.read'],
      endpoint: { method: 'GET', path: 'forms' },
    },
    {
      name: 'forms.create',
      description: 'Create a new form or page',
      parameters: {
        name: { type: 'string', required: true },
        slug: { type: 'string', required: true },
        description: { type: 'string' },
      },
      returns: { id: { type: 'number' }, slug: { type: 'string' } },
      requiredPermissions: ['forms.create'],
      endpoint: { method: 'POST', path: 'forms' },
    },
    {
      name: 'forms.listSubmissions',
      description: 'List submissions for a form',
      parameters: {
        formId: { type: 'number', required: true },
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
      createdBy: { type: 'number' },
    },
    'forms.form.published': {
      id: { type: 'number', required: true },
      tenantId: { type: 'number', required: true },
      name: { type: 'string' },
      slug: { type: 'string' },
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
      tenantId: { type: 'number', description: 'null if platform-global' },
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
  const modulePermissions = [
    { resource: 'forms', action: 'read', slug: 'forms.read', description: 'View forms' },
    { resource: 'forms', action: 'create', slug: 'forms.create', description: 'Create forms' },
    { resource: 'forms', action: 'update', slug: 'forms.update', description: 'Edit forms' },
    { resource: 'forms', action: 'delete', slug: 'forms.delete', description: 'Delete forms' },
    { resource: 'forms', action: 'publish', slug: 'forms.publish', description: 'Publish forms' },
    { resource: 'form-submissions', action: 'read', slug: 'form-submissions.read', description: 'View submissions' },
    { resource: 'form-submissions', action: 'create', slug: 'form-submissions.create', description: 'Submit forms' },
    { resource: 'form-components', action: 'read', slug: 'form-components.read', description: 'View components' },
    { resource: 'form-components', action: 'create', slug: 'form-components.create', description: 'Register components' },
    { resource: 'form-components', action: 'update', slug: 'form-components.update', description: 'Edit components' },
    { resource: 'form-components', action: 'delete', slug: 'form-components.delete', description: 'Delete components' },
    { resource: 'form-data-sources', action: 'read', slug: 'form-data-sources.read', description: 'View data sources' },
    { resource: 'form-data-sources', action: 'create', slug: 'form-data-sources.create', description: 'Create data sources' },
  ];

  for (const perm of modulePermissions) {
    await db.insert(permissions).values(perm).onConflictDoNothing();
  }
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

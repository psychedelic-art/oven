# UI Flows -- UI Design

This document covers the three UI surfaces owned by the `ui-flows` module: the dashboard React Admin resources, the `ui-flows-editor` ReactFlow canvas, and the portal page renderers. All dashboard and editor code follows the MUI `sx` rule; all portal code follows the Tailwind `cn()` rule from `@oven/oven-ui`.

## 1. Dashboard resources

### 1.1 UI Flow list (`UiFlowList`)

File: `apps/dashboard/src/components/ui-flows/UiFlowList.tsx`.

Layout: React Admin `<Datagrid>` wrapped in a `<List>` with filters.

| Column       | Component                                             | Notes                                 |
|--------------|-------------------------------------------------------|---------------------------------------|
| Tenant       | `<ReferenceField source="tenantId" reference="tenants">` | Uses tenant name lookup            |
| Name         | `<TextField source="name" />`                          |                                       |
| Slug         | `<TextField source="slug" />`                          | Displayed in `fontFamily: monospace` via `sx` |
| Status       | `<ChipField source="status" />`                        | Colors: `draft`=default, `published`=success, `archived`=default with reduced opacity |
| Version      | `<NumberField source="version" />`                     |                                       |
| Enabled      | `<BooleanField source="enabled" />`                    |                                       |
| Updated      | `<DateField source="updatedAt" showTime />`            |                                       |
| Actions      | `<EditButton /><ShowButton />`                         |                                       |

Filters: `<TextInput source="q" placeholder="Search name/slug" />`, `<SelectInput source="status" choices={[...]} />`, `<ReferenceInput source="tenantId" reference="tenants" />`.

FTUE: empty state shows a centered card (MUI `sx={{ maxWidth: 480, mx: 'auto', mt: 8 }}`) with a brief explainer and a prominent "Create your first portal" CTA button.

### 1.2 UI Flow create (`UiFlowCreate`)

File: `apps/dashboard/src/components/ui-flows/UiFlowCreate.tsx`.

Layout: `<Create><SimpleForm>` with fields: `name`, `slug` (auto-derived from name via `normalizeFlowSlug`), `description`, `tenantId` (reference input), `templateRef` (optional select from seeded templates).

Validation: client-side uses `validate` props; server-side errors surface via `onFailure`.

### 1.3 UI Flow edit (`UiFlowEdit`)

File: `apps/dashboard/src/components/ui-flows/UiFlowEdit.tsx`.

Layout: `<Edit>` with a tabbed interior:

- **Overview** tab: `name`, `description`, `enabled` toggle, archive button.
- **Pages** tab: inline datagrid of `ui_flow_pages`; cells show `slug`, `title`, `pageType`, `formId` (reference field), `position`.
- **Theme** tab: preview swatches + "Open visual editor" CTA.
- **Domain** tab: subdomain / custom domain fields with verification badge.
- **Versions** tab: history datagrid with a "Restore" button per row.

Toolbar: `<Toolbar>` extended with **Visual Editor**, **Preview**, **Publish** buttons. Each uses MUI `sx` for spacing.

### 1.4 UI Flow show (`UiFlowShow`)

File: `apps/dashboard/src/components/ui-flows/UiFlowShow.tsx`.

Tabs mirror `UiFlowEdit` but read-only. Adds a **Definition JSON** tab with a syntax-highlighted JSON viewer (no external dep; uses a `<Box component="pre" sx={{ fontFamily: 'monospace', fontSize: 12, p: 2, bgcolor: 'background.paper' }}>`).

### 1.5 Portal Analytics list (`UiFlowAnalyticsList`)

File: `apps/dashboard/src/components/ui-flow-analytics/UiFlowAnalyticsList.tsx`.

Layout: summary cards at the top followed by a filterable datagrid.

Summary cards (4, in a `<Grid container spacing={2}>`):
- Total page views (last 30 days)
- Unique visitors (last 30 days)
- Form submissions (last 30 days)
- Chat starts (last 30 days)

Datagrid columns: `createdAt`, `uiFlow.name` (reference), `pageSlug`, `eventType`, `visitorId` (truncated to 8 chars), `metadata.referrer`.

Filters: `dateFrom`, `dateTo`, `eventType` select, `uiFlowId` reference input, `pageSlug` text input.

## 2. Editor (`@oven/ui-flows-editor`)

### 2.1 Canvas (`UiFlowCanvas.tsx`)

ReactFlow v12 canvas with a minimap, zoom controls, and a custom panel for the palette. Background dots at 16px. Pan/zoom state persisted to the zustand store.

### 2.2 Nodes

Each node is a functional component styled with MUI `sx`.

| Node              | Purpose                                                       |
|-------------------|---------------------------------------------------------------|
| `PageNode`        | Represents a page. Shows type icon, title, slug, form ref chip. Double-click opens `PageInspector` in the right panel. |
| `NavigationNode`  | Represents the top-bar or side-bar navigation. Lists items with drag handles. |
| `ThemeNode`       | Represents the theme config. Shows a color swatch row.        |
| `FooterNode`      | Represents the footer. Shows enabled state and link count.    |
| `RedirectNode`    | Represents a URL redirect rule.                               |

Connections: page nodes connect to the navigation node via the `slug` handle; redirect nodes connect to pages via the `to` handle.

### 2.3 Panels (right side drawer)

| Panel              | Opens when                                                     |
|--------------------|----------------------------------------------------------------|
| `PagePalette`      | No selection -- shows drag-and-drop cards for each page type  |
| `PageInspector`    | A page node is selected                                        |
| `ThemePanel`       | The theme node is selected                                     |
| `NavigationPanel`  | The navigation node is selected                                |
| `PreviewPanel`     | Tab at the bottom of any other panel                           |

FTUE: On first open, an overlay tooltip points at the palette and says "Drag a page to start building your portal". Dismissed on first drop or via close button. Persisted in local storage by `ui_flow_id`.

### 2.4 Toolbar

`PublishButton`, `VersionHistoryButton`, `PreviewButton`, `SaveIndicator`, `UndoRedoGroup`.

- **Save indicator**: polls the store for `isDirty`; displays "Saved" (grey) / "Saving..." (spinner) / "Unsaved changes" (orange) with MUI `Chip`.
- **Preview button**: opens `/ui-flows/[id]/preview` in a new tab.
- **Publish button**: opens a confirm dialog; runs validation; on success calls the publish endpoint and shows a success snackbar.

### 2.5 Microinteractions

- Hover on a page node shows a 4px shadow lift (`sx={{ '&:hover': { boxShadow: 4 } }}`).
- Drag over a drop zone darkens the background (`'action.hover'`).
- Publish success triggers a confetti animation in the top-right corner (uses `motion/react` from the existing dashboard deps; no new package).

## 3. Portal renderers

Lives in `apps/portal/src/components/renderers/*` (to be created in `sprint-02-portal-app.md`). Every renderer uses Tailwind `cn()` from `@oven/oven-ui`.

### 3.1 `LandingRenderer`

Props: `{ page, theme }`. Renders a full-bleed hero with background image from `page.config.heroImage`, a headline, a subheadline, and a single CTA button. CTA target comes from `page.config.ctaLink`.

```tsx
<section className={cn('relative w-full min-h-[70vh] flex items-center')}>
  <div className={cn('absolute inset-0 bg-cover bg-center')}
       style={{ '--hero-image': `url(${page.config.heroImage})` } as React.CSSProperties} />
  <div className={cn('relative z-10 max-w-3xl px-6 mx-auto text-center text-white')}>
    <h1 className={cn('text-5xl font-bold mb-4')}>{page.title}</h1>
    ...
  </div>
</section>
```

The `style=` usage is the sole exception permitted by root `CLAUDE.md` -- CSS custom properties from runtime values.

### 3.2 `FormRenderer`

Fetches the published form via `GET /api/forms/[formRef]/render` and renders the GrapeJS output. Submits through the portal analytics endpoint on success, emitting `ui-flows.form.submitted`.

### 3.3 `FaqRenderer`

Fetches entries from `GET /api/knowledge-base/[tenantSlug]/search` with the `categoryFilter` and `searchEnabled` flags from `page.config`. Renders each category as an `<Accordion>` (from `@oven/oven-ui`, a Tailwind-first accordion primitive, not MUI).

### 3.4 `ChatRenderer`

Embeds `@oven/agent-ui` chat widget configured with `agentSlug`, `placeholder`, `welcomeMessage` from `page.config`. The widget is a client component (`'use client'`). It fetches agent metadata and streams responses via `agent-core`.

### 3.5 `CustomRenderer`

Generic form renderer for arbitrary content. Same as `FormRenderer` but without the form-submission analytics hook.

## 4. Accessibility

- All interactive elements expose `aria-label` when no visible label exists.
- Color contrast for default themes verified at AA.
- Editor canvas supports keyboard navigation: arrow keys move selected nodes, Delete removes, Tab cycles nodes.
- Portal pages render server-side first for non-JS environments; analytics beacon only fires on hydration.

## 5. Responsive behavior

- Dashboard resources follow React Admin defaults (single-column on mobile).
- Editor canvas collapses side panels into a bottom drawer below 960px width.
- Portal renderers use Tailwind breakpoints (`sm`, `md`, `lg`) on container widths and typography scales.

# Module: Analytics Forms

> **Package**: `packages/module-analytics-forms/` + `packages/analytics-editor/`
> **Name**: `@oven/module-analytics-forms` + `@oven/analytics-editor`
> **Dependencies**: `module-registry`, `module-roles`
> **Status**: Planned

---

## 1. Overview

Analytics Forms is a **visual analytics dashboard builder** that enables teams to create data-driven dashboards and reports using a component-based editor. Built on **GrapeJS** (same foundation as Forms), it provides a library of 75+ visualization and reporting components organized into categories.

Unlike the Dashboards module (which focuses on database-level data exploration with a wizard), Analytics Forms is about **designing custom visual interfaces** that combine KPIs, charts, tables, filters, and narrative elements into polished, shareable dashboards.

---

## 2. Core Concepts

### Analytics Form
A visual dashboard definition stored as JSON. Contains component layout, data bindings, filter configurations, and styling — similar to a Form but focused on data visualization.

### Metric
A standardized measure defined in the metric layer. Metrics have a name, formula, dimensions (groupable fields), and optional targets/thresholds. All components reference metrics rather than raw queries, ensuring consistency across dashboards.

### Data Source
A configured connection to data — internal OVEN APIs, database queries, or external endpoints. Data sources produce structured output that components bind to.

### Template
A pre-built dashboard layout for common use cases. Templates can be cloned and customized. Examples: Flow Health, Assessment Performance, Operational Overview.

---

## 3. Component Library (75+ Components)

### KPI & Summary (8 components)
- Metric card, comparison card, trend indicator, sparkline
- Target gauge, status badge, summary stat, delta indicator

### Time Series (7 components)
- Line chart, area chart, stacked area, multi-axis line
- Candlestick, timeline, step chart

### Comparison (6 components)
- Bar chart (horizontal/vertical), grouped bar, stacked bar
- Bullet chart, paired bar, benchmark comparison

### Distribution (6 components)
- Histogram, box plot, violin plot, density curve
- Scatter plot, bubble chart

### Proportion (5 components)
- Pie chart, donut chart, treemap, waffle chart, sunburst

### Funnel & Flow (4 components)
- Funnel chart, Sankey diagram, flow diagram, conversion waterfall

### Heatmaps & Spatial (4 components)
- Calendar heatmap, matrix heatmap, geographic map, choropleth

### Tables & Lists (6 components)
- Data table (sortable/filterable), pivot table, leaderboard
- Comparison table, changelog list, detail list

### Filters & Controls (8 components)
- Date range picker, dropdown filter, search box, toggle filter
- Slider range, segmented control, filter chip group, reset button

### Alerts & Thresholds (4 components)
- Alert banner, threshold indicator, anomaly highlight, status traffic light

### Narrative & Annotation (5 components)
- Text block, annotation callout, section header, divider
- Insight card (auto-generated summary)

### Embeds & Integration (6 components)
- Iframe embed, image, video, external chart embed
- Module embed (embed content from another OVEN module), export button

---

## 4. Metric Layer

Metrics provide a **single source of truth** for measures across dashboards:

- **Name**: Human-readable label (e.g., "Monthly Active Users")
- **Slug**: Machine identifier (e.g., `monthly_active_users`)
- **Formula**: How to compute the metric (count, sum, average, custom SQL/expression)
- **Dimensions**: Groupable fields (e.g., by region, by role, by time period)
- **Targets**: Optional goal values with thresholds (green/yellow/red)
- **Data Source**: Which data source provides the raw data

Components bind to metrics rather than raw data, so changing a metric formula updates all dashboards that use it.

---

## 5. Database Schema

### Tables

**`analytics_forms`** — Dashboard definitions
- `id`, `name`, `slug`, `description`
- `definition` (JSONB) — GrapeJS editor state (components, styles, bindings)
- `dataConfig` (JSONB) — data source bindings, filter configurations
- `version`, `status` (draft/published/archived)
- `createdBy`, `createdAt`, `updatedAt`

**`analytics_form_versions`** — Version history
- `id`, `analyticsFormId`, `version`, `definition`, `dataConfig`, `description`, `createdAt`

**`analytics_data_sources`** — Data source configurations
- `id`, `name`, `slug`, `type` (internal-api/database-query/external)
- `config` (JSONB) — connection details, query, endpoint
- `outputSchema` (JSONB) — cached response structure
- `refreshInterval` (integer — seconds, nullable)
- `createdAt`, `updatedAt`

**`analytics_metrics`** — Metric definitions
- `id`, `name`, `slug`, `description`
- `formula` (JSONB) — computation definition
- `dimensions` (JSONB) — groupable fields
- `targets` (JSONB) — threshold values
- `dataSourceId` (FK → analytics_data_sources)
- `createdBy`, `createdAt`, `updatedAt`

**`analytics_templates`** — Pre-built dashboard templates
- `id`, `name`, `slug`, `description`, `category`
- `definition` (JSONB), `dataConfig` (JSONB)
- `thumbnail` (varchar — preview image URL)
- `builtIn` (boolean)
- `createdAt`, `updatedAt`

---

## 6. API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET/POST | `/api/analytics-forms` | List and create dashboards |
| GET/PUT/DELETE | `/api/analytics-forms/[id]` | Single dashboard CRUD |
| GET | `/api/analytics-forms/[id]/render` | Published dashboard for embedding |
| GET/POST | `/api/analytics-data-sources` | List and create data sources |
| GET/PUT/DELETE | `/api/analytics-data-sources/[id]` | Data source CRUD |
| POST | `/api/analytics-data-sources/[id]/test` | Test a data source, return sample output |
| GET/POST | `/api/analytics-metrics` | List and create metrics |
| GET/PUT/DELETE | `/api/analytics-metrics/[id]` | Metric CRUD |
| GET | `/api/analytics-templates` | List available templates |
| POST | `/api/analytics-templates/[id]/clone` | Clone a template into a new dashboard |
| GET | `/api/analytics-form-versions` | Version history |

---

## 7. Editor Package (`analytics-editor`)

### Package: `packages/analytics-editor/`

A standalone React package wrapping GrapeJS with analytics-specific configuration:

- **GrapeJS Canvas**: Visual editor with analytics component blocks
- **Component Panel** (left sidebar): 75+ components organized by category
- **Data Panel** (left sidebar tab): Configure data sources, browse metrics
- **Style Panel** (right sidebar): Component styling and layout
- **Properties Panel** (right sidebar tab): Data binding, metric selection, thresholds
- **Preview Mode**: Live dashboard with real data
- **Toolbar**: Save, publish, export, share, version history

### Peer Dependencies
- `grapesjs` + `grapesjs-react`
- `react`, `react-dom`
- `@mui/material`, `@mui/icons-material`
- Chart library (e.g., `recharts`, `visx`, or `echarts`)

---

## 8. Dashboard UI

### React Admin Resources
- **Analytics Forms** — List, Create, Edit, Show
- **Metrics** — List, Create, Edit
- **Data Sources** — List, Create, Edit
- **Templates** — List, Show

### Custom Pages
- **Analytics Editor** (`/analytics-forms/[id]/editor`) — Full-page GrapeJS editor
- **Analytics Viewer** (`/analytics-forms/[id]/view`) — Published dashboard view

### Menu Section
```
──── Analytics ────
Dashboards
Metrics
Data Sources
Templates
```

---

## 9. Events

| Event | Payload |
|-------|---------|
| `analytics-forms.form.created` | id, name, createdBy |
| `analytics-forms.form.published` | id, name, version |
| `analytics-forms.form.archived` | id, name |
| `analytics-forms.metric.created` | id, name, slug |
| `analytics-forms.metric.updated` | id, name |
| `analytics-forms.data-source.created` | id, name, type |

---

## 10. Built-in Templates

| Template | Description |
|----------|-------------|
| **Flow Health** | Pipeline throughput, stage durations, bottleneck detection |
| **Forms Reliability** | Submission rates, error rates, completion times |
| **Assessment Performance** | Score distributions, pass rates, question difficulty analysis |
| **Chat Quality** | Response times, satisfaction scores, topic distribution |
| **Operational Overview** | Cross-module KPIs, active users, system health |

---

## 11. Integration Points

| Module | Integration |
|--------|-------------|
| **module-roles** | Permission-based access to create, view, edit dashboards |
| **module-scoring-engine** | Score data feeds assessment performance dashboards |
| **module-exams** | Attempt data feeds assessment analytics |
| **module-flows** | Flow data feeds pipeline health dashboards |
| **module-forms** | Form submission data feeds form analytics |
| **module-dashboards** | Analytics Forms can be embedded in data dashboards |
| **module-chat** | Chat agent can query metrics, generate insights |

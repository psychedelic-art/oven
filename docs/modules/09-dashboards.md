# Module: Dashboards

> **Package**: `packages/module-dashboards/` + `packages/dashboard-editor/`
> **Name**: `@oven/module-dashboards` + `@oven/dashboard-editor`
> **Dependencies**: `module-registry`, `module-roles`
> **Status**: Planned

---

## 1. Overview

Dashboards is a **data exploration and visualization module** with a wizard-based creation flow. Unlike Analytics Forms (which builds visual interfaces with GrapeJS), Dashboards focuses on **database-level data exploration** — selecting tables, defining column mappings, building relationships, and generating visualizations from structured data.

The creation flow uses a **ReactFlow-based data connector** (similar to the RLS and Workflow builders) to visually define data transformations and relationships, combined with a wizard that guides users from table selection to finished dashboard.

---

## 2. Core Concepts

### Dashboard
A configured data exploration view with tabs, filters, visualizations, and KPIs — all derived from database tables and their relationships.

### Data Configuration
A visual pipeline (built in ReactFlow) that defines:
- Which tables to query
- Which columns to include
- How tables relate (1:M, M:1, M:M joins)
- Computed columns and aggregations
- Filters and parameters

### Tab
A logical section within a dashboard. Each tab has its own set of visualizations but shares the dashboard's data configuration and global filters.

### Saved View
A named snapshot of filter values and settings. Users can save their current filter state as a view and return to it later — like bookmarks for data exploration.

### Comparison Mode
A side-by-side view comparing two records against the same dashboard layout. Example: compare Student A vs Student B exam performance, or Department X vs Department Y metrics.

---

## 3. Dashboard Creation Wizard

### Step 1: Select Tables
Browse the database schema, select the tables relevant to the dashboard. The system displays available tables from registered module schemas.

### Step 2: Define Columns
For each selected table, choose which columns to include. Configure display labels, formatting, and visibility.

### Step 3: Map Relationships
Using the **ReactFlow data connector**, visually draw relationships between tables:
- Drag a column from Table A to Table B to define a join
- Specify relationship type (1:M, M:1, M:M)
- Preview the resulting joined data

### Step 4: Choose Visualizations
Select how to display the data:
- Pick chart types (bar, line, pie, table, KPI card)
- Map columns to axes, series, values
- Configure aggregations (count, sum, average, min, max)
- Organize into tabs

### Step 5: Configure Filters
Define which columns are filterable. The system auto-generates filter controls (dropdowns, date ranges, search boxes) based on column types.

### Step 6: Set KPIs
Define key metrics displayed at the top of the dashboard — aggregate values with optional targets and trend indicators.

---

## 4. Data Connector (ReactFlow Editor)

The data connector provides a visual way to build the data pipeline:

### Node Types
- **Table Node**: Represents a database table with selectable columns
- **Join Node**: Defines how two tables connect (inner, left, right, full join)
- **Filter Node**: Applies WHERE conditions to the data flow
- **Aggregate Node**: Groups data and applies aggregation functions
- **Computed Node**: Creates derived columns (formulas, expressions)
- **Output Node**: The final data shape that feeds into visualizations

### Edges
Connections between nodes represent data flow. The pipeline executes top-to-bottom, left-to-right.

---

## 5. Database Schema

### Tables

**`dashboards`** — Dashboard definitions
- `id`, `name`, `slug`, `description`
- `dataConfig` (JSONB) — ReactFlow definition (nodes + edges for data pipeline)
- `layoutConfig` (JSONB) — tab layout, visualization placement, KPI configuration
- `filterConfig` (JSONB) — available filters with types and defaults
- `version`, `status` (draft/published/archived)
- `createdBy`, `createdAt`, `updatedAt`

**`dashboard_versions`** — Version history
- `id`, `dashboardId`, `version`, `dataConfig`, `layoutConfig`, `filterConfig`, `description`, `createdAt`

**`dashboard_tabs`** — Tab definitions within a dashboard
- `id`, `dashboardId` (FK → dashboards)
- `name`, `slug`, `position` (integer)
- `visualizations` (JSONB) — array of visualization configs (chart type, column mappings, options)
- `createdAt`, `updatedAt`

**`dashboard_saved_views`** — Saved filter configurations
- `id`, `dashboardId` (FK → dashboards)
- `name`, `description`
- `filterValues` (JSONB) — saved filter state
- `createdBy`, `isDefault` (boolean)
- `createdAt`, `updatedAt`

**`dashboard_kpis`** — KPI definitions per dashboard
- `id`, `dashboardId` (FK → dashboards)
- `name`, `column` (varchar), `aggregation` (varchar — count/sum/avg/min/max)
- `format` (varchar — number/currency/percentage)
- `target` (decimal — optional), `thresholds` (JSONB — green/yellow/red ranges)
- `position` (integer)

---

## 6. API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET/POST | `/api/dashboards` | List and create dashboards |
| GET/PUT/DELETE | `/api/dashboards/[id]` | Single dashboard CRUD |
| GET | `/api/dashboards/[id]/data` | Execute the data pipeline, return results |
| GET/POST | `/api/dashboards/[id]/tabs` | List and create tabs |
| PUT/DELETE | `/api/dashboard-tabs/[id]` | Tab CRUD |
| GET/POST | `/api/dashboards/[id]/saved-views` | List and create saved views |
| PUT/DELETE | `/api/dashboard-saved-views/[id]` | Saved view CRUD |
| GET/POST | `/api/dashboards/[id]/kpis` | List and create KPIs |
| PUT/DELETE | `/api/dashboard-kpis/[id]` | KPI CRUD |
| GET | `/api/dashboards/[id]/compare` | Comparison mode — two records side-by-side |
| GET | `/api/dashboards/schema/tables` | List available tables from module schemas |
| GET | `/api/dashboards/schema/tables/[table]/columns` | List columns for a table |
| GET | `/api/dashboards/[id]/versions` | Version history |

---

## 7. Editor Package (`dashboard-editor`)

### Package: `packages/dashboard-editor/`

A standalone React package using ReactFlow for the data connector:

- **Data Connector Canvas**: ReactFlow editor for building the data pipeline (table → join → filter → aggregate → output)
- **Table Browser** (left sidebar): Browse available database tables and columns
- **Node Inspector** (right sidebar): Configure selected node (join type, filter conditions, aggregation functions)
- **Data Preview** (bottom panel): Live preview of the query results at each stage
- **Visualization Config**: Chart type selection and column mapping interface
- **Tab Manager**: Create, reorder, and configure dashboard tabs

### Peer Dependencies
- `@xyflow/react` (ReactFlow v12)
- `react`, `react-dom`
- `@mui/material`, `@mui/icons-material`

---

## 8. Dashboard UI

### React Admin Resources
- **Dashboards** — List, Create (wizard), Edit, Show
- **Saved Views** — Inline within dashboard detail

### Custom Pages
- **Dashboard Wizard** (`/dashboards/new/wizard`) — Step-by-step creation flow
- **Dashboard Editor** (`/dashboards/[id]/editor`) — Full-page ReactFlow data connector
- **Dashboard Viewer** (`/dashboards/[id]/view`) — Published dashboard with filters, tabs, KPIs
- **Comparison View** (`/dashboards/[id]/compare`) — Side-by-side record comparison

### Menu Section
```
──── Dashboards ────
Dashboards
```

---

## 9. Events

| Event | Payload |
|-------|---------|
| `dashboards.dashboard.created` | id, name, createdBy |
| `dashboards.dashboard.published` | id, name, version |
| `dashboards.dashboard.archived` | id, name |
| `dashboards.view.saved` | id, dashboardId, name, createdBy |
| `dashboards.kpi.created` | id, dashboardId, name |

---

## 10. Integration Points

| Module | Integration |
|--------|-------------|
| **module-roles** | Permission-based access to create, view, edit dashboards |
| **module-registry** | Discovers available database schemas from registered modules |
| **module-analytics-forms** | Analytics dashboards can be embedded within data dashboards |
| **module-flows** | Dashboards can be flow items for review/approval |
| **module-exams** | Exam data tables available for dashboard exploration |
| **module-scoring-engine** | Score/grade tables available for dashboard exploration |
| **module-chat** | Chat agent can create dashboards, query data, suggest visualizations |

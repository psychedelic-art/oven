# Knowledge Base -- UI Design

> Dashboard screens, component specifications, and interaction patterns for `module-knowledge-base`.

---

## 1. Menu Structure

The Knowledge Base module adds a menu section to the dashboard sidebar:

```
---- Knowledge Base ----
  Categories
  Entries
  Search Test
  Bulk Actions
```

Implemented in `CustomMenu.tsx`:

```tsx
<Divider sx={{ my: 1 }} />
<Box sx={{ px: 2, pb: 0.5 }}>
  <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>
    Knowledge Base
  </Typography>
</Box>
<Menu.ResourceItem name="kb-categories" />
<Menu.ResourceItem name="kb-entries" />
<MenuItemLink to="/knowledge-base/search-test" primaryText="Search Test" leftIcon={<SearchIcon />} />
<MenuItemLink to="/knowledge-base/bulk-actions" primaryText="Bulk Actions" leftIcon={<CloudUploadIcon />} />
```

---

## 2. Category List (CategoryList.tsx)

### Layout

Datagrid with drag-and-drop reordering via `@dnd-kit`.

### Columns

| Column | Component | Width | Notes |
|---|---|---|---|
| Drag handle | Custom grip icon | 40px | Drag to reorder |
| Name | `<TextField>` | 200px | Category display name |
| Slug | `<TextField>` | 150px | URL-safe identifier, muted color |
| Description | `<TextField>` | Flex | Truncated to 60 chars |
| Entries | `<FunctionField>` | 80px | Count badge, e.g., "12 entries" |
| Enabled | `<BooleanField>` + toggle | 80px | Inline toggle switch |
| Actions | `<EditButton>` `<DeleteButton>` | 100px | Standard actions |

### Behavior

- **Drag-and-drop**: Rows are wrapped in `@dnd-kit` `SortableContext`. On drop, a batch PUT updates `order` values for all affected rows.
- **Tenant filtering**: Respects global `TenantSelector`. When no tenant selected, shows all categories with a Tenant column.
- **Delete protection**: `<DeleteButton>` shows confirmation dialog. If category has entries, the API returns 409 and the UI displays "This category has N entries. Move or delete them first."

### Filters

| Filter | Component | Notes |
|---|---|---|
| Tenant | Auto from `TenantSelector` | Hidden when tenant selected |
| Enabled | `<BooleanInput>` | Toggle in filter sidebar |
| Search | `<TextInput>` | Searches `name` field (ILIKE) |

---

## 3. Category Create / Edit (CategoryCreate.tsx, CategoryEdit.tsx)

### Form Fields

| Field | Component | Required | Notes |
|---|---|---|---|
| Name | `<TextInput>` | Yes | Full width |
| Slug | `<TextInput>` | No | Auto-generated from name on blur; editable |
| Description | `<TextInput multiline>` | No | 3 rows |
| Icon | Custom `<IconSelectorInput>` | No | Grid of MUI icons, filterable |
| Order | `<NumberInput>` | No | Default 0 |
| Enabled | `<BooleanInput>` | No | Default true |

### Icon Selector

Custom component that displays a grid of common MUI icons. Clicking an icon sets the `icon` field value to the icon name string (e.g., "EventNote", "Schedule", "Payment").

The selector shows ~30 curated icons relevant to FAQ categories: `EventNote`, `Schedule`, `LocationOn`, `MedicalServices`, `Payment`, `Assignment`, `Healing`, `Warning`, `Phone`, `HelpOutline`, `QuestionAnswer`, `Info`, `LocalHospital`, `CalendarMonth`, `AccessTime`, `DirectionsCar`, `CreditCard`, `Description`, `Notifications`, `Group`, `Star`, `Category`, `Bookmark`, `Folder`, `Label`, `AttachMoney`, `Science`, `Build`, `Security`, `SupportAgent`.

---

## 4. Entry List (EntryList.tsx)

### Layout

Datagrid with rich filtering and embedding status indicators.

### Columns

| Column | Component | Width | Notes |
|---|---|---|---|
| Question | `<TextField>` | Flex | Truncated to 80 chars |
| Category | `<ReferenceField>` + `<ChipField>` | 150px | Category name as colored chip |
| Keywords | `<FunctionField>` | 200px | Array rendered as small MUI Chips, max 3 shown + "+N more" |
| Embedding | `<EmbeddingStatusBadge>` | 50px | Custom component (see below) |
| Priority | `<NumberField>` | 60px | Numeric display |
| Language | `<TextField>` | 60px | ISO code |
| Enabled | `<BooleanField>` + toggle | 80px | Inline toggle |
| Actions | `<EditButton>` `<ShowButton>` | 100px | Standard actions |

### Filters

| Filter | Component | Notes |
|---|---|---|
| Tenant | Auto from `TenantSelector` | Hidden when tenant selected |
| Category | `<ReferenceInput>` + `<SelectInput>` | Filtered by active tenant |
| Enabled | `<BooleanInput>` | Toggle |
| Language | `<SelectInput>` | Options: es, en, pt |
| Search | `<TextInput>` | Full-text search on question (ILIKE via `q` filter) |
| Embedding Status | `<SelectInput>` | Options: embedded, pending, failed |

### Bulk Actions

| Action | Description |
|---|---|
| Delete selected | Standard bulk delete with confirmation |
| Re-embed selected | Triggers embedding pipeline for selected entries |
| Enable/Disable selected | Toggle enabled state for selected entries |

---

## 5. Entry Create / Edit (EntryCreate.tsx, EntryEdit.tsx)

### Form Layout

Two-column layout on desktop, single column on mobile.

**Left column** (main content):

| Field | Component | Required | Notes |
|---|---|---|---|
| Category | `<ReferenceInput>` + `<AutocompleteInput>` | Yes | Filtered by active tenant |
| Question | `<TextInput multiline>` | Yes | 4 rows, full width |
| Answer | `<TextInput multiline>` or `<RichTextInput>` | Yes | 8 rows, full width |

**Right column** (metadata):

| Field | Component | Required | Notes |
|---|---|---|---|
| Keywords | Custom `<TagInput>` | No | Tag input with autocomplete from existing keywords |
| Priority | `<SliderInput>` | No | Slider 0-10, shows numeric value |
| Language | `<SelectInput>` | No | Default "es" |
| Enabled | `<BooleanInput>` | No | Default true |

### Tag Input (Keywords)

Custom component for entering keyword tags:

- Text input with type-ahead autocomplete from existing keywords across the tenant's entries.
- Press Enter or comma to add a tag.
- Tags rendered as MUI Chips with delete icon.
- Auto-normalize: lowercase, trim, deduplicate.
- Maximum 20 keywords per entry.

### Edit-Specific Additions

The Edit form includes two additional tabs:

**Tab 1: Content** (default) -- The form fields above.

**Tab 2: Version History** -- Shows a timeline of previous versions:

```
  v3 (current) -- 2026-01-20 14:30
  "Updated phone number"
  ----------------------------------------
  v2 -- 2026-01-15 10:00
  "Fixed typo in answer"
  [Restore] [Compare with current]
  ----------------------------------------
  v1 -- 2026-01-10 08:00
  "Initial version"
  [Restore] [Compare with current]
```

Each version entry shows: version number, timestamp, description (if provided), and action buttons. "Compare with current" opens a side-by-side diff view.

### Embedding Status Indicator (Edit only)

At the top of the Edit form, a status bar shows the current embedding state:

```
  Embedding: Embedded (text-embedding-3-small, Jan 15 2026 10:05 AM)
```

Or:

```
  Embedding: Failed -- "Rate limit exceeded" [Retry]
```

---

## 6. Entry Show (EntryShow.tsx)

### Layout

Three-section layout:

**Header**: Question as page title, category chip, language badge, enabled badge, embedding status badge.

**Main Content**:

| Section | Content |
|---|---|
| Answer | Full answer text (rendered as HTML if rich text) |
| Keywords | All keywords as MUI Chips |
| Metadata | Created date, updated date, version number, priority |
| Embedding Details | Model, dimensions, embedded timestamp, status |

**Sidebar** (right column on desktop):

| Section | Content |
|---|---|
| Version History | Compact timeline (last 5 versions with "Show all" link) |
| Similar Entries | Top 3 semantically similar entries from the same tenant (via vector similarity) |

### Similar Entries

Computed on page load by calling the search endpoint with the entry's own question as the query, filtering out the current entry. Shows question text, category, and similarity score for each result.

---

## 7. Search Test Page (KBSearchTest.tsx)

### Route

`/knowledge-base/search-test` (registered as `customRoute` in the ModuleDefinition).

### Layout

Split view (50/50 on desktop, stacked on mobile):

**Left panel: Search**

```
  +--------------------------------------------------+
  | Tenant: [Dropdown selector]                       |
  | Category: [Optional filter dropdown]              |
  +--------------------------------------------------+
  | Query: [Text input field                        ] |
  | [Search]                                          |
  +--------------------------------------------------+
  | Results:                                          |
  |                                                   |
  | +----------------------------------------------+ |
  | | 0.94  [semantic]  Horarios                    | |
  | | Cual es el horario de atencion?               | |
  | | Nuestro horario es de lunes a viernes...      | |
  | +----------------------------------------------+ |
  |                                                   |
  | +----------------------------------------------+ |
  | | 0.87  [semantic]  Horarios                    | |
  | | Atienden los sabados?                         | |
  | | Si, los sabados atendemos de 9:00 AM...       | |
  | +----------------------------------------------+ |
  |                                                   |
  | Confidence threshold: 0.8                         |
  | Top result confident: Yes                         |
  +--------------------------------------------------+
```

**Right panel: Selected Entry Detail**

When a result card is clicked, the right panel shows the full entry detail (question, answer, keywords, category, embedding info, version history).

### Result Card Design

Each result card contains:

- **Score bar**: Horizontal bar filled proportionally to the score (0-1), with the numeric score displayed. Bar uses a gradient: red (< 0.5) -> yellow (0.5-0.8) -> green (> 0.8).
- **Match type badge**: Small chip labeled "semantic", "keyword", or "hybrid" with distinct colors.
- **Category badge**: Colored chip with category name.
- **Question**: Bold text, full display.
- **Answer preview**: First 150 characters, muted color.

### Confidence Score Bar Animation

When search results load, the score bars animate from 0% to their target width over 300ms with an ease-out curve. This provides visual feedback and draws attention to the confidence level.

---

## 8. Bulk Actions Page (KBBulkActions.tsx)

### Route

`/knowledge-base/bulk-actions` (registered as `customRoute`).

### Layout

Three cards stacked vertically:

**Card 1: Import**

```
  +--------------------------------------------------+
  | Import FAQ Entries                                |
  |                                                   |
  | [Drop zone: Drag CSV or JSON file here]           |
  |           or click to browse                      |
  |                                                   |
  | Accepted formats: .csv, .json                     |
  |                                                   |
  | (After file selected:)                            |
  | File: dental-faq.csv (2.4 KB, 45 rows)           |
  | Preview:                                          |
  | +------+------------------+----------+---------+  |
  | | Row  | Question         | Category | Keywords|  |
  | +------+------------------+----------+---------+  |
  | | 1    | Como agendar...  | agenda.. | cita,...|  |
  | | 2    | Horario de...    | horarios | hora,...|  |
  | +------+------------------+----------+---------+  |
  | (showing 2 of 45 rows)                            |
  |                                                   |
  | [Import 45 entries]                               |
  +--------------------------------------------------+
```

The drop zone uses an `<input type="file">` with drag-and-drop styling. File parsing happens client-side to show the preview. The actual import POST sends the parsed data.

**Card 2: Export**

```
  +--------------------------------------------------+
  | Export FAQ Entries                                 |
  |                                                   |
  | Format: [CSV v] [JSON]                            |
  | Include: [All entries v] [Enabled only] [Category]|
  |                                                   |
  | [Download]                                        |
  +--------------------------------------------------+
```

**Card 3: Re-embed**

```
  +--------------------------------------------------+
  | Re-embed All Entries                              |
  |                                                   |
  | Tenant: Clinica Norte                             |
  | Total entries: 150                                |
  | Already embedded: 145                             |
  | Estimated time: ~75 seconds                       |
  | Estimated cost: 150 embedding credits             |
  |                                                   |
  | [ ] Force re-embed (include already embedded)     |
  | [Category filter: All categories v]               |
  |                                                   |
  | [Start Re-embedding]                              |
  |                                                   |
  | (After starting:)                                 |
  | Progress: [==========>          ] 67/150          |
  | Failed: 2                                         |
  | Elapsed: 34s                                      |
  |                                                   |
  | [Cancel]                                          |
  +--------------------------------------------------+
```

The progress bar polls the stats endpoint every 2 seconds while the job is running. The bar uses MUI `<LinearProgress>` with `variant="determinate"` and `value={(done/total)*100}`.

---

## 9. EmbeddingStatusBadge Component

### File

`apps/dashboard/src/components/knowledge-base/EmbeddingStatusBadge.tsx`

### Props

```typescript
interface EmbeddingStatusBadgeProps {
  status: 'embedded' | 'pending' | 'processing' | 'failed' | null;
  embeddedAt?: string;
  embeddingModel?: string;
  embeddingError?: string;
}
```

### Rendering

| Status | Icon | Color | Tooltip |
|---|---|---|---|
| `embedded` | CheckCircle | `success.main` (green) | "Embedded on Jan 15 2026 via text-embedding-3-small" |
| `pending` | HourglassEmpty | `warning.main` (yellow) | "Embedding pending" |
| `processing` | CircularProgress (small) | `warning.main` (yellow) | "Embedding in progress..." |
| `failed` | Error | `error.main` (red) | "Embedding failed: Rate limit exceeded" |
| `null` | Remove | `text.disabled` (gray) | "Not yet embedded" |

### Size

Small inline badge: 20x20px icon with MUI Tooltip on hover. Uses `sx` prop for sizing:

```tsx
<Tooltip title={tooltipText}>
  <CheckCircleIcon sx={{ fontSize: 20, color: 'success.main' }} />
</Tooltip>
```

### Transition Animation

When status changes (e.g., pending -> embedded), the icon cross-fades over 200ms using MUI `<Fade>` transition.

---

## 10. First-Time User Experience (FTUE)

### Empty State Flow

When a tenant has no KB data, the module guides users through setup:

**Stage 1: No categories**

```
  +--------------------------------------------------+
  |                                                   |
  |         (QuestionAnswerIcon, large, muted)        |
  |                                                   |
  |    Build your Knowledge Base                      |
  |                                                   |
  |    Start by creating FAQ categories to            |
  |    organize your entries by topic.                 |
  |                                                   |
  |    [Create your first category]                   |
  |                                                   |
  +--------------------------------------------------+
```

**Stage 2: Categories exist, no entries**

```
  +--------------------------------------------------+
  |                                                   |
  |         (EditNoteIcon, large, muted)              |
  |                                                   |
  |    Add FAQ Entries                                |
  |                                                   |
  |    You have 10 categories ready.                   |
  |    Now add question-answer pairs that your         |
  |    AI agent can use to answer patients.            |
  |                                                   |
  |    [Add your first entry]  [Import from CSV]      |
  |                                                   |
  +--------------------------------------------------+
```

**Stage 3: Entries exist, not yet tested**

```
  +--------------------------------------------------+
  |                                                   |
  |         (SearchIcon, large, muted)                |
  |                                                   |
  |    Test your Knowledge Base                       |
  |                                                   |
  |    You have 15 entries across 10 categories.       |
  |    Test that search returns relevant results       |
  |    before connecting your AI agent.                |
  |                                                   |
  |    [Open Search Test]                             |
  |                                                   |
  +--------------------------------------------------+
```

The stage is determined by checking: `categories.length === 0` -> Stage 1, `entries.length === 0` -> Stage 2, otherwise show normal list. Stage 3 is shown as a dismissible banner above the entry list.

---

## 11. Component File Structure

```
apps/dashboard/src/components/knowledge-base/
  CategoryList.tsx          -- Drag-and-drop sortable datagrid
  CategoryCreate.tsx        -- SimpleForm with icon selector
  CategoryEdit.tsx          -- Same as create
  EntryList.tsx             -- Filtered datagrid with embedding badges
  EntryCreate.tsx           -- Two-column form with tag input
  EntryEdit.tsx             -- Same as create + version history tab
  EntryShow.tsx             -- Full detail with sidebar (versions, similar)
  KBSearchTest.tsx          -- Split-view search testing interface
  KBBulkActions.tsx         -- Import/Export/Re-embed cards
  EmbeddingStatusBadge.tsx  -- Small status indicator component
  IconSelectorInput.tsx     -- MUI icon grid picker for categories
  TagInput.tsx              -- Keyword tag input with autocomplete
  VersionTimeline.tsx       -- Version history display component
  ScoreBar.tsx              -- Animated confidence score bar for search results
```

---

## 12. Interaction Details

### Category Drag-and-Drop Reorder

1. User grabs the drag handle (grip icon) on a category row.
2. Row lifts with a subtle shadow and becomes semi-transparent.
3. Other rows slide smoothly to make room as the user drags.
4. On drop, the new order is calculated and a batch PUT sends updated `order` values.
5. A brief success snackbar confirms "Category order updated".

Uses `@dnd-kit/core` with `SortableContext` and `DragOverlay` for smooth animation.

### Embedding Status Transition

When a user saves an entry, the embedding status badge in the entry list updates in real-time:

1. On save: badge immediately shows yellow "pending" icon.
2. The list view polls the entry every 3 seconds (max 10 polls).
3. When status changes to "embedded", badge cross-fades to green checkmark.
4. If status changes to "failed", badge cross-fades to red X with tooltip showing the error.

### Search Result Score Bar Fill

When search results load on the Search Test page:

1. Results appear with score bars at 0% width.
2. Each bar animates to its target width with a staggered delay (100ms between each result).
3. The fill animation uses CSS `transition: width 300ms ease-out`.
4. The numeric score fades in after the bar reaches its target width.

This creates a cascading reveal effect that draws attention to the confidence levels.

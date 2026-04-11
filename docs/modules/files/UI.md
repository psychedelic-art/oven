# Files Module — UI

> Surfaces the `files` table in the React Admin 5 + MUI 7 dashboard and
> provides three reusable components other modules import to attach
> file pickers / previews to their own forms.

## Dashboard resources (React Admin)

### `<FileList />`

Route: `/files`. Classic React Admin `<List>` with a toggle between a
`<Datagrid>` and a thumbnail grid view.

- **Columns**: `thumbnail` (via `<FilePreview />`), `filename`,
  `mimeType` (badge), `sizeBytes` (human-readable), `folder`,
  `createdAt`, `sourceModule`.
- **Filters**: `folder`, `mimeType` (pattern input), `tenantId`,
  `sourceModule`, full-text `q`.
- **Bulk actions**: delete, move-to-folder.
- **Styling**: `sx` prop only. Thumbnail grid uses `Box` with
  `display: { xs: 'block', md: 'grid' }, gridTemplateColumns:
  'repeat(auto-fill, minmax(200px, 1fr))', gap: 2`.

### `<FileShow />`

Route: `/files/:id`. Renders a MIME-aware preview pane plus metadata.

- `image/*` → `<Box component="img" src={publicUrl} sx={{ maxWidth: '100%', maxHeight: 480 }} />`
- `application/pdf` → `<Box component="iframe" src={publicUrl} sx={{ width: '100%', height: 640, border: 'none' }} />`
- `audio/*` → `<Box component="audio" src={publicUrl} controls sx={{ width: '100%' }} />`
- `video/*` → `<Box component="video" src={publicUrl} controls sx={{ maxWidth: '100%' }} />`
- everything else → MIME badge + download button.

Metadata table: every non-null column from `FileRecord`.

### `<FileBrowserPage />`

Custom page at `/files/browser`. Not a React Admin resource — it is
registered via `customRoutes`. Left sidebar is a folder tree
(`<Treeview>` from `@mui/lab`), main pane is a grid of
`<FilePreview />` tiles, top bar has a drag-and-drop upload zone.

## Reusable components (consumed by other modules)

These three components are exported from
`@oven/module-files/components` (a new entry point — sprint-04
delivers this; the components do not exist yet).

### `<FileUpload />`

Drop zone + manual file picker. Props:

```ts
interface FileUploadProps {
  tenantId?: number;                // scopes the upload
  folder?: string;                  // virtual folder path
  accept?: string;                  // MIME type filter, e.g. 'image/*'
  maxSizeMb?: number;               // per-file size cap
  sourceModule?: string;            // for audit trail
  sourceId?: string;
  onUpload: (file: FileRecord) => void;
  onError?: (err: Error) => void;
  sx?: SxProps<Theme>;              // dashboard styling pass-through
}
```

Styling rules:

- `sx` prop on every MUI element.
- No `style={{ }}`. The drop-zone dashed border is configured via
  `sx={{ border: '2px dashed', borderColor: 'divider', '&:hover': { borderColor: 'primary.main' } }}`.
- Uses theme spacing tokens (`p: 3, gap: 2`) not raw pixel values.

### `<FilePreview />`

Inline file preview. Props: `file: FileRecord`, `size?: 'sm' | 'md' | 'lg'`.

- Images → `<Box component="img" sx={sizeStyles[size]} />`
- PDFs → `<Box sx={{ ..., bgcolor: 'grey.100' }}><PdfIcon /></Box>`
- Audio / video → MIME badge with a play icon overlay.
- Other → generic file icon + filename.

Variant size map (defined outside the component per `tailwind-cn-utility` pattern, adapted for MUI):

```ts
const sizeStyles: Record<'sm' | 'md' | 'lg', SxProps<Theme>> = {
  sm: { width: 64, height: 64, objectFit: 'cover' },
  md: { width: 120, height: 120, objectFit: 'cover' },
  lg: { width: 240, height: 240, objectFit: 'cover' },
};
```

### `<FilePicker />`

Modal picker. Two tabs: **Existing files** (list from `GET /api/files`
filtered by `folder` / `mimeType`) and **Upload new** (embeds
`<FileUpload />`). `onPick(file)` fires when the user selects a file.

## Portal (Tailwind + `@oven/oven-ui`)

The portal app does NOT consume `<FileUpload />` directly. Portal
forms use the `FileInput` primitive from `@oven/oven-ui` which calls
`POST /api/files/upload` under the hood and follows the
`tailwind-cn-utility` rule: all classes via `cn()`, no template
literals, no inline `style={{ }}`.

## Styling compliance

| Rule | Verdict (after sprint-04) |
|---|---|
| No `style={{ }}` | All components use `sx`. |
| MUI `sx` only | Yes. |
| Tailwind `cn()` in portal | Yes (portal primitive only, not this package). |
| `import type` for type imports | Yes (`FileRecord`, `FileUploadProps`). |
| Zustand factory + context | N/A — no zustand in this module. |

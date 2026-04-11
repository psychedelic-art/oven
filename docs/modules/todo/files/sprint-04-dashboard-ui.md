# sprint-04-dashboard-ui — Module Files

## Goal

Ship the dashboard UI surface for `@oven/module-files`: React Admin
`FileList` / `FileShow` resources, plus the three reusable
components (`<FileUpload />`, `<FilePreview />`, `<FilePicker />`)
that other modules import for their own attachment UIs. Ship the
`PUT /api/files/[id]` handler that the UI's rename/move operations
depend on, and emit the missing `files.file.updated` event.

## Scope

- `packages/module-files/src/api/files-by-id.handler.ts` —
  MODIFIED. Adds `PUT` export updating `folder` and `metadata`.
- `packages/module-files/src/index.ts` — MODIFIED. Adds
  `files.file.updated` to `events.emits` and `events.schemas`.
  Registers `list: FileList, show: FileShow` on the `files`
  resource. Registers the components entry point.
- `packages/module-files/src/components/FileUpload.tsx` — NEW.
- `packages/module-files/src/components/FilePreview.tsx` — NEW.
- `packages/module-files/src/components/FilePicker.tsx` — NEW.
- `packages/module-files/src/components/FileList.tsx` — NEW.
  React Admin `<List>` with grid/datagrid toggle.
- `packages/module-files/src/components/FileShow.tsx` — NEW.
  React Admin `<Show>` with MIME-aware preview pane.
- `packages/module-files/src/components/index.ts` — NEW. Re-exports
  the five components.
- `packages/module-files/package.json` — MODIFIED. Add the
  `./components` export condition.

## Out of scope

- Download / public-serve handlers (sprint-05).
- `FileBrowserPage` custom route (sprint-05).
- Portal-side changes — the portal uses `@oven/oven-ui`'s
  `FileInput` primitive, which already exists.

## Deliverables

### 1. PUT handler

```ts
// files-by-id.handler.ts
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const id = Number(params.id);
  if (!Number.isFinite(id)) return badRequest('Invalid file id');

  const body = await request.json() as { folder?: string | null; metadata?: Record<string, unknown> | null };

  const callerTenantIds = await getTenantIdsFromRequest(request);
  const [existing] = await db.select().from(files).where(eq(files.id, id)).limit(1);
  if (!existing) return notFound();
  if (existing.tenantId != null && !callerTenantIds.includes(existing.tenantId)) return notFound();

  const [updated] = await db.update(files)
    .set({
      folder: body.folder !== undefined ? body.folder : existing.folder,
      metadata: body.metadata !== undefined ? body.metadata : existing.metadata,
    })
    .where(eq(files.id, id))
    .returning();

  eventBus.emit('files.file.updated', {
    id: updated.id,
    tenantId: updated.tenantId,
    filename: updated.filename,
    folder: updated.folder,
    metadata: updated.metadata,
  });

  return NextResponse.json(updated);
}
```

### 2. `files.file.updated` event schema

```ts
'files.file.updated': {
  id: { type: 'number', required: true },
  tenantId: { type: 'number' },
  filename: { type: 'string' },
  folder: { type: 'string' },
  metadata: { type: 'object' },
},
```

### 3. Components — styling rules

**Every component uses `sx` only.** No `style={{ }}`, no custom
CSS classes, no `styled(Component)`.

- `FileUpload.tsx`:
  - Drop-zone `<Box>` with `sx={{ border: '2px dashed',
    borderColor: 'divider', borderRadius: 1, p: 3, textAlign:
    'center', cursor: 'pointer', '&:hover': { borderColor:
    'primary.main' } }}`.
  - On file select, converts to base64 and calls
    `fetch('/api/files/upload', { method: 'POST', body: JSON.stringify(...)})`.
  - Accepts `accept`, `maxSizeMb`, `folder`, `sourceModule`,
    `sourceId`, `tenantId`, `onUpload`, `onError`, `sx` props.
  - Does NOT use zustand. Local `useState` for upload progress is
    fine.

- `FilePreview.tsx`:
  - `sizeStyles: Record<'sm' | 'md' | 'lg', SxProps<Theme>>`
    defined outside the component.
  - MIME-aware switch: image → `<Box component="img" sx={...}
    />`, PDF → `<Box sx={{ bgcolor: 'grey.100', ... }}><PdfIcon />`,
    audio/video → play-icon overlay, other → file icon.

- `FilePicker.tsx`:
  - MUI `<Dialog>` with `<Tabs>` for "Existing files" and
    "Upload new".
  - Existing files tab: paginated `GET /api/files?filter[folder]=...`
    call, renders results in a grid of `<FilePreview />` tiles.
  - Upload tab: embeds `<FileUpload />` and calls
    `onPick(file)` on success.

- `FileList.tsx`:
  - React Admin `<List>` with `filters={[<TextInput source="q" />,
    <SelectInput source="mimeType" choices={...} />, ...]}`.
  - Toggle between `<Datagrid>` (default) and a thumbnail grid via
    a custom `<ViewModeToggle />` in the list actions area.

- `FileShow.tsx`:
  - `<Show>` with a `<SimpleShowLayout>` containing the
    MIME-aware preview component and a metadata table.

### 4. Registration

```ts
// index.ts
import { FileList, FileShow } from './components';

resources: [
  {
    name: 'files',
    list: FileList,
    show: FileShow,
    options: { label: 'Files' },
  },
],
```

### 5. Components entry point

`packages/module-files/package.json`:

```json
"exports": {
  ".": "./src/index.ts",
  "./components": "./src/components/index.ts"
}
```

Consumer modules (`@oven/module-chat`, `@oven/module-knowledge-base`,
etc.) import as:

```ts
import { FileUpload, FilePreview } from '@oven/module-files/components';
```

## Acceptance criteria

- [x] `PUT /api/files/[id]` shipped with tenant scoping.
- [x] `files.file.updated` event emitted.
- [x] Five components exist and export from `./components/index.ts`.
- [x] Zero `style={{ }}` usages in any component
      (`rg 'style=\{\{' packages/module-files/src/components` → 0).
- [x] Every type-only import uses `import type`.
- [x] `FileList` / `FileShow` registered in
      `filesModule.resources`.
- [x] Manual dev-server walkthrough: `pnpm dev` on dashboard,
      visit `/files`, upload a PNG, see it in the list, open the
      show view, rename it to a new folder, delete it. The golden
      path works end to end.
- [x] `STATUS.md` closes gaps #8, #10, #11.

## Dependencies

- Sprint-02 and sprint-03 must be landed (upload validation and
  tenant scoping are prerequisites for safe UI exposure).
- React Admin 5, MUI 7 — already in the dashboard.

## Risks

- **Base64 encoding large files in the browser** — `FileReader`
  can stall on files >50 MB. Mitigation: the `FileUpload`
  component enforces `maxSizeMb` on the client before encoding,
  mirroring the server-side limit.
- **Component bundle size** — adding 5 components to
  `@oven/module-files` increases the dashboard bundle. Mitigation:
  components are under the `./components` export path so portal
  builds that don't import them don't pay the cost.

## Test plan

- Automated: vitest doesn't render React Admin components well;
  rely on the dashboard dev server + golden-path walkthrough.
- Manual: see Acceptance §Manual dev-server walkthrough.
- Regression: `pnpm --filter @oven/module-files test` must still
  show sprints 01-03 tests green.

## Rule Compliance checklist

| Ground truth | Applicable | How |
|---|---|---|
| `docs/module-rules.md` | Yes | `./components` export is a second public entry point — documented in `module-design.md` §Public surface. |
| `docs/modules/14-files.md` | Yes | Spec §6 (Dashboard UI) implemented. |
| Root `CLAUDE.md` — `mui-sx-prop` | **Yes, mandatory** | All components use `sx`. Verified via ripgrep. |
| Root `CLAUDE.md` — no inline styles | **Yes, mandatory** | Zero `style={{ }}`. |
| Root `CLAUDE.md` — `import type` | Yes | `SxProps`, `Theme`, `FileRecord` are type-only. |
| Root `CLAUDE.md` — zustand factory + context | N/A | No zustand in this sprint. |

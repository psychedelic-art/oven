# Sprint 04 — Dashboard UI + Registration (`module-knowledge-base`)

> Wire the KB module into the dashboard. React Admin resources, the
> CustomMenu section, the `KBSearchTest` playground, and
> `KBBulkActions` tool. This is the first sprint where the module is
> actually registered in `apps/dashboard/src/lib/modules.ts`.

---

## Goal

A dashboard user with the right role can:

- Browse, create, edit, and delete categories and entries under
  `/kb-categories` and `/kb-entries`.
- See an embedding status badge on every entry row.
- Open the "Search Test" tool and type a query to see hybrid search
  results with confidence scores.
- Open the "Bulk Actions" tool and trigger a re-embed-all run with a
  live progress bar.
- See the new menu section `──── Knowledge Base ────` under the
  appropriate dashboard group.

## Scope

1. **React Admin resources** — populate `resources` in
   `src/index.ts`:

   ```typescript
   resources: [
     { name: 'kb-categories', options: { label: 'KB Categories' } },
     { name: 'kb-entries',    options: { label: 'FAQ Entries' } },
   ]
   ```

   These become discoverable via `<Resource name="kb-categories" />` in
   the dashboard's Admin tree once the module is registered.

2. **Menu items** — populate `menuItems` in `src/index.ts`:

   ```typescript
   menuItems: [
     { label: 'Categories',  to: '/kb-categories' },
     { label: 'Entries',     to: '/kb-entries' },
     { label: 'Search Test', to: '/kb-search-test' },
     { label: 'Bulk Actions', to: '/kb-bulk-actions' },
   ]
   ```

   Plus edit `apps/dashboard/src/components/CustomMenu.tsx` to add a
   "Knowledge Base" section divider above the new items — matching the
   pattern already in use for the AI module.

3. **Custom routes** — populate `customRoutes` for the two non-CRUD
   pages:

   ```typescript
   customRoutes: [
     { path: '/kb-search-test',  component: 'KBSearchTest'  },
     { path: '/kb-bulk-actions', component: 'KBBulkActions' },
   ]
   ```

4. **Dashboard components** — create under
   `apps/dashboard/src/components/knowledge-base/`:

   - `CategoryList.tsx` — React Admin `<List>` with sortable rows
     (drag handle uses `@dnd-kit/core` if already present in the
     dashboard, otherwise simple order input).
   - `CategoryCreate.tsx`, `CategoryEdit.tsx`, `CategoryShow.tsx`.
   - `EntryList.tsx` — filter by category, language, enabled, embedding
     status. Row shows `EmbeddingStatusBadge`.
   - `EntryCreate.tsx`, `EntryEdit.tsx`, `EntryShow.tsx`.
     Edit/Create auto-assigns `tenantId` from `useTenantContext`.
   - `EmbeddingStatusBadge.tsx` — MUI `<Chip>` with color mapped to
     status (`ready` → success, `pending`/`processing` → warning,
     `failed` → error). Styling via `sx` only.
   - `KBSearchTest.tsx` — split view: left is a `<TextField>` for the
     query, right is a list of results with score + confidence flag.
     Hits `POST /api/knowledge-base/[tenantSlug]/search` directly via
     `fetch`. Uses `sx` for layout.
   - `KBBulkActions.tsx` — one button triggers
     `POST /api/knowledge-base/[tenantSlug]/ingest`, polls the stats
     endpoint, and renders a `<LinearProgress>` bar driven by
     `embeddingHealth.pending / totalEntries`.

   **Styling rule** — every component uses MUI `sx`. Zero inline
   `style={{ }}`. Zero hand-written CSS classes. Zero `styled()`.
   Any component that needs responsive values uses the `sx` breakpoint
   syntax (`sx={{ p: { xs: 1, md: 2 } }}`).

5. **Register the module** — edit
   `apps/dashboard/src/lib/modules.ts`:

   ```typescript
   import { knowledgeBaseModule } from '@oven/module-knowledge-base';
   // ...
   registry.register(knowledgeBaseModule);  // After aiModule, before authModule
   ```

   Register after `aiModule` (dependency order) and before
   `formsModule` (to group dashboard sections logically).

6. **Transpile config** — add `@oven/module-knowledge-base` to
   `apps/dashboard/next.config.js` `transpilePackages` if required by
   the existing pattern.

7. **E2E smoke test** — run the dev server locally, verify:
   - Menu section appears.
   - Category create → persists → appears in list.
   - Entry create with a real question → row appears with
     `embeddingStatus: pending` → within a few seconds flips to
     `ready` (mocked embed for local dev).
   - Search test returns at least one semantic match.
   - Bulk actions progress bar advances.

## Out of scope

- Internationalization beyond the canonical Spanish seed.
- Mobile responsiveness beyond the default React Admin breakpoints.
- Role-specific menu visibility (handled by `module-roles` hooks
  already available to every menu item).

## Deliverables

- [ ] `resources`, `menuItems`, `customRoutes` populated in
      `src/index.ts`.
- [ ] 10+ component files under
      `apps/dashboard/src/components/knowledge-base/`.
- [ ] `CustomMenu.tsx` edited with the KB section divider.
- [ ] `modules.ts` edited with the registration call in correct order.
- [ ] `next.config.js` updated if transpilePackages is required.
- [ ] Dev server smoke test passes (documented in `STATUS.md`).

## Acceptance criteria

- [ ] `pnpm turbo run lint typecheck --filter=...<affected>` exits 0
      for both `@oven/module-knowledge-base` and `apps/dashboard`.
- [ ] Dashboard boot with `pnpm --filter apps/dashboard dev` shows no
      console errors related to KB registration.
- [ ] Manual smoke test: create a category, create an entry, see
      embedding flip to `ready`, run a search, trigger bulk ingest.
- [ ] Every new component obeys `CLAUDE.md` styling rules — grep for
      `style={{` under `apps/dashboard/src/components/knowledge-base/`
      returns zero matches.
- [ ] Every new component uses `import type` for all type-only imports.

## Dependencies

- Sprint 03 complete (search endpoint responding).
- `module-ai` reachable at `/api/ai/embed`.
- Dental-project dashboard already uses React Admin 5 conventions for
  similar modules (ai, files). Follow the `apps/dashboard/src/components/ai/`
  patterns for filter/list composition.

## Risks

- **Risk**: drag-and-drop category ordering conflicts with tenant
  filtering. **Mitigation**: start without drag-and-drop (simple order
  integer input). Drag-and-drop is a follow-up.
- **Risk**: `KBSearchTest` uses local state that drifts from React
  Admin filter state. **Mitigation**: the search test is a standalone
  custom route — no React Admin filter involvement.
- **Risk**: `KBBulkActions` long-poll conflicts with dashboard React
  query cache. **Mitigation**: the poller uses a dedicated
  `setInterval` outside React Query and cleans up on unmount.

## Test plan

Add lightweight Vitest + React Testing Library tests for the
components that have non-trivial logic:

- `EmbeddingStatusBadge.test.tsx` — renders correct color per status.
- `KBSearchTest.test.tsx` — mocks `fetch`, asserts results render.
- `KBBulkActions.test.tsx` — mocks `fetch`, asserts progress bar
  advances.

The rest of the React Admin components are thin wiring and are
covered by the smoke test in the dev server.

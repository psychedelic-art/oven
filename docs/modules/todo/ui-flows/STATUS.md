# STATUS — module-ui-flows

> Last updated: 2026-04-11
> Session branch: `claude/eager-curie-TXjZZ`

## Summary

| Field               | Value                                                      |
|---------------------|------------------------------------------------------------|
| Current sprint      | `sprint-00-discovery`                                      |
| % complete          | 15% (spec locked, code shipped, docs graduated; no tests)  |
| Active branch       | `claude/eager-curie-TXjZZ` (this session)                  |
| Backup branch       | none yet (no feature branch to back up)                    |
| PR                  | none (no user request to open one)                         |
| Blockers            | none                                                        |

## Sprint status

| Sprint                         | State        | Notes                                                                 |
|--------------------------------|--------------|-----------------------------------------------------------------------|
| sprint-00-discovery            | in progress  | Canonical doc scaffold complete this session. CODE-REVIEW.md pending. |
| sprint-01-foundation           | ready        | Unit tests absent in `module-ui-flows` and `ui-flows-editor`.         |
| sprint-02-portal-app           | ready        | `apps/portal` does not exist; catch-all route currently in dashboard. |
| sprint-03-editor-hardening     | ready        | Editor package scaffolded; validation + version diff missing.         |
| sprint-99-acceptance           | blocked      | Waits on sprint-01..03 completion.                                    |

## QA outcomes

No QA run yet. There was no active feature branch to audit when this
file was created. QA reports will be written to `QA-REPORT.md` as each
sprint branch is opened.

## Implementation surface at audit time

Already shipped (verified by inspection, not by running tests):

- `packages/module-ui-flows/src/schema.ts` — 4 tables (`ui_flows`,
  `ui_flow_versions`, `ui_flow_pages`, `ui_flow_analytics`).
- `packages/module-ui-flows/src/seed.ts` — permissions and public
  endpoint permissions.
- `packages/module-ui-flows/src/slug-utils.ts` — page/flow slug
  normalization + `HOME_PAGE_SENTINEL`.
- `packages/module-ui-flows/src/api/*.handler.ts` — 11 handlers
  (list/create/get/put/delete/publish/versions/restore/public portal
  resolve/page resolve/theme resolve/analytics record/analytics list).
- `packages/module-ui-flows/src/index.ts` — ModuleDefinition with
  events, configSchema, chat.actionSchemas.
- `packages/ui-flows-editor/src/{UiFlowCanvas.tsx, nodes, panels,
  components, store}` — ReactFlow editor scaffold.
- `apps/dashboard/src/components/ui-flows/{UiFlowList, UiFlowCreate,
  UiFlowEdit, UiFlowShow, UiFlowEditorPage}.tsx` — dashboard CRUD +
  editor page.
- `apps/dashboard/src/components/ui-flow-analytics/UiFlowAnalyticsList.tsx`.
- `apps/dashboard/src/app/api/ui-flows/**` and
  `apps/dashboard/src/app/api/portal/[tenantSlug]/**` route wrappers
  that delegate to the module handlers.
- `apps/dashboard/src/app/portal/[tenantSlug]/[[...slug]]/page.tsx` —
  temporary catch-all portal host.

Not yet shipped:

- Unit tests in `module-ui-flows` (0 files found).
- Unit tests in `ui-flows-editor` (0 files found).
- Dedicated `apps/portal` Next.js app (only `apps/dashboard` exists
  today).
- Canonical doc folder `docs/modules/ui-flows/` — **created in this
  session**.
- `CODE-REVIEW.md` + `QA-REPORT.md` — pending.

## Change log

| Date       | Session                    | Change                                                                                           |
|------------|----------------------------|--------------------------------------------------------------------------------------------------|
| 2026-04-11 | `claude/eager-curie-TXjZZ` | Created `docs/modules/todo/ui-flows/` scaffold. Graduated canonical `docs/modules/ui-flows/`.    |

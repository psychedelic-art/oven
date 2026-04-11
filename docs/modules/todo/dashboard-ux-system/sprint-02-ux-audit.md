# Sprint 02 — UX Audit

## Goal

Produce a complete, file-by-file audit of every dashboard surface against
the foundation primitives from sprint-01 and the UX standards in
`docs/module-rules.md` Rule 6. Route every finding to a specific
follow-up sprint (03, 04, 05, or 06). No code changes — this is a pure
audit sprint that feeds the next four sprints with concrete work items.

## Scope

### In

- **List audit** — every `*List.tsx` under `apps/dashboard/src/components/`:
  - Does the list filter by tenant? If so, how?
  - Does it hand-roll a tenant input? (`<NumberInput source="tenantId">`,
    `<ReferenceInput>`, raw query param, etc.)
  - Does it declare its own `filters` array? List the filter shapes and
    choice sources.
  - Does it show a tenant column in admin mode?
  - Status column: `SelectInput`, `BooleanInput`, or missing?
  - Date filter: present or missing?
- **Create audit** — every `*Create.tsx`:
  - Does the create form auto-assign `tenantId` via `transform`?
  - Does it expose a tenant picker to non-admin users?
- **Edit audit** — every `*Edit.tsx`:
  - Does it navigate to a custom editor via a toolbar button?
  - Is the tenant visible as a read-only field, or absent?
- **Show audit** — every `*Show.tsx`:
  - Does it include related data as per Rule 6.6?
- **Playground audit** — every `*Playground*.tsx`:
  - Layout shape (tabs, 3-panel, collapsible)
  - State model (local `useState`, custom hook, store)
  - Relationship to `UnifiedAIPlayground` (uses it, ignores it, duplicates it)
  - Line count and approximate % of dead code paths
- **Chrome audit** — `AdminApp.tsx`, `CustomMenu.tsx`, `app/layout.tsx`,
  `components/shared/**`:
  - Which chrome primitives are present vs absent?
  - Which sections in the menu need `<MenuSectionLabel>` once it ships?

### Out

- Writing any TypeScript
- Editing any file under `apps/` or `packages/`
- Running any lint / typecheck / test

## Deliverables

1. `docs/modules/todo/dashboard-ux-system/audit/lists.md` — markdown table
   with columns: `file`, `tenant-scoped`, `tenant filter shape`,
   `filter count`, `filters`, `status control`, `date filter`,
   `tenant column in admin mode`, `routed to sprint`.
2. `docs/modules/todo/dashboard-ux-system/audit/create-forms.md` — same
   shape for create forms, with columns `file`, `auto-assigns tenantId`,
   `exposes tenant picker`, `routed to sprint`.
3. `docs/modules/todo/dashboard-ux-system/audit/playgrounds.md` — table
   with columns: `file`, `line count`, `layout`, `state model`,
   `uses UnifiedAIPlayground`, `routed to sprint`, `dead code estimate`.
4. `docs/modules/todo/dashboard-ux-system/audit/chrome.md` — checklist
   of the missing primitives (`PageHeader`, `EmptyState`,
   `LoadingSkeleton`, `ErrorBoundary`, `MenuSectionLabel`) and the
   locations where they should land in sprint-06.
5. `docs/modules/todo/dashboard-ux-system/audit/summary.md` — aggregate
   counts, top-10 offending files per sprint, and a priority-ordered
   backlog for sprint-03 / sprint-04 / sprint-05 / sprint-06.
6. Commit: `docs(dashboard-ux-system): sprint-02 audit complete`

## Acceptance criteria

- [ ] Every `*List.tsx` under `apps/dashboard/src/components/` appears in
  `audit/lists.md` with every column populated.
- [ ] Every `*Create.tsx` under `apps/dashboard/src/components/` appears
  in `audit/create-forms.md`.
- [ ] All four playgrounds from DRIFT-3 appear in `audit/playgrounds.md`
  with a concrete dead-code estimate.
- [ ] `audit/summary.md` contains a priority-ordered backlog with
  every finding tagged with the sprint that will consume it.
- [ ] No file outside `docs/modules/todo/dashboard-ux-system/audit/**` is
  created or modified.
- [ ] `STATUS.md` updated with commit hash and the sprint state moved to
  `done`.

## Dependencies

- Sprint-01 must be complete — the audit uses the foundation primitive
  names as the target surface.
- [`./CODE-REVIEW.md`](./CODE-REVIEW.md) drift findings as the seed for
  the audit taxonomy.

## Risks

- **Audit stale by the time sprint-03 runs** — mitigated by re-running
  the grep commands as the first step of sprint-03 and diffing against
  the audit tables.

## Test plan

- n/a — docs only.

## Rule compliance checklist

- [ ] Rule 6.1 — CRUD inventory covers every resource
- [ ] Rule 6.2 — menu section audit captures the `CustomMenu.tsx` gaps
- [ ] Rule 6.3 — every tenant-scoped list is flagged as compliant or drift
- [ ] Rule 6.4 — every create form is flagged as compliant or drift
- [ ] Root `CLAUDE.md` `no-inline-styles` — the audit scans for
  `style={` and records any hits as sprint-05 / sprint-06 clean-up work

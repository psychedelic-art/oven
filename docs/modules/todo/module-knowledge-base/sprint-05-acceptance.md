# Sprint 05 — Acceptance + Graduation (`module-knowledge-base`)

> Final gate. Run the module-rules checklist, update
> `IMPLEMENTATION-STATUS.md`, and request approval to move the folder
> from `docs/modules/todo/module-knowledge-base/` to graduated status.

---

## Goal

`module-knowledge-base` passes every item in the module-rules checklist
and is marked `Graduated` in `docs/modules/IMPLEMENTATION-STATUS.md`.

## Scope

1. **Checklist walk-through** — the "Checklist: Before Merging a New
   Module" at the bottom of `docs/module-rules.md`. Every checkbox must
   be verifiable. Record pass/fail per item in this sprint file's
   "Checklist results" section.

2. **Test suite full pass** —
   `pnpm turbo run lint typecheck test --filter=@oven/module-knowledge-base --filter=apps/dashboard`
   must exit 0 with zero warnings treated as errors (if that's the
   existing convention).

3. **Manual browser verification** — walk the full dental FAQ flow in
   the dev dashboard:
   - Create 3 categories.
   - Create 5 entries across them.
   - Run a hybrid search from the `KBSearchTest` page.
   - Run bulk re-embed from the `KBBulkActions` page.
   - Confirm embedding badges flip.
   - Confirm events appear in the dashboard event log (if an event
     inspector exists).

4. **Crosscheck report update** — edit
   `docs/modules/crosscheck-report.md`:
   - §4.6 — mark the `kb.searchEntries` decision as resolved, reference
     sprint 01 of this module.
   - §6.1 — remove the `kb.search` vs `kb.searchEntries` row from the
     open issues list.

5. **Implementation status flip** — edit
   `docs/modules/IMPLEMENTATION-STATUS.md`:
   - Row 18 (`module-knowledge-base`): status `Todo` →
     `Graduated`. Update the `Package` and `Registered` columns to
     `packages/module-knowledge-base` and `Yes`.
   - Phase ordering table: KB → Graduated, agent-core → unblocked.
   - Backfill queue: no change (KB's canonical doc folder was already
     present).

6. **Progress log update** — edit
   `docs/modules/todo/PROGRESS.md`:
   - Update the row for `module-knowledge-base` to reflect the
     graduation.
   - Add a new row for the next selected module (likely
     `module-agent-core`).
   - Append a line to the "Pipeline-pass log" table with the acceptance
     outcome.

7. **Folder move request** — the graduation step itself (removing
   `docs/modules/todo/module-knowledge-base/`) is an irreversible-feeling
   action. Per the execution pipeline, this requires explicit user
   approval via `AskUserQuestion` before proceeding. Sprint 05 ends at
   the approval prompt — the actual delete is executed only after the
   user says yes.

## Out of scope

- Any new feature work. If a bug is found during acceptance, it gets a
  new sprint file (`sprint-06-hotfix.md`) — sprint 05 does not silently
  absorb feature work.

## Deliverables

- [ ] Checklist results table populated below.
- [ ] Full test suite passing.
- [ ] Browser smoke test passing.
- [ ] `crosscheck-report.md` updated.
- [ ] `IMPLEMENTATION-STATUS.md` updated.
- [ ] `PROGRESS.md` updated.
- [ ] AskUserQuestion prompt sent requesting approval to move the todo
      folder.

## Acceptance criteria

Sprint 05 is complete when:

1. Every checklist item is PASS.
2. Every test suite is green.
3. The user approves (or rejects) the todo folder move.
4. If approved, the module is marked Graduated.
5. If rejected, the reason is logged in `STATUS.md` and the blocker is
   opened as a new sprint.

## Checklist results

Populate this table when executing sprint 05. Leave the current
placeholder rows — do NOT pretend items pass before they do.

| # | Item | Status | Evidence |
|---|------|:------:|----------|
| 1 | Implements `ModuleDefinition` contract fully | TBD | `src/index.ts` |
| 2 | Registered in `apps/dashboard/src/lib/modules.ts` in dependency order | TBD | `apps/dashboard/src/lib/modules.ts` |
| 3 | `chat` block declared with `description`, `capabilities`, `actionSchemas` | TBD | `src/index.ts` |
| 4 | All events listed in `events.emits` with typed `schemas` | TBD | `src/index.ts` |
| 5 | No direct imports from other module packages | TBD | grep `@oven/module-ai` under `packages/module-knowledge-base/src/` |
| 6 | External integrations use adapter interface | N/A | KB has no external adapters |
| 7 | All tenant-scoped tables have `tenantId` column with index | TBD | `src/schema.ts` |
| 8 | All tenant-scoped API handlers filter by `tenantId` | TBD | `src/api/*.ts` |
| 9 | Events include `tenantId` in payload for tenant-scoped entities | TBD | `src/api/*.ts` |
| 10 | Permissions seeded for all CRUD operations | TBD | `src/seed.ts` |
| 11 | JSONB definitions have companion `_versions` table | N/A | KB stores text Q/A; the `_versions` table is present for history |
| 12 | PUT handlers auto-create version snapshots | TBD | `src/api/kb-entries-by-id.handler.ts` |
| 13 | List endpoints return `Content-Range` header via `listResponse()` | TBD | every list handler |
| 14 | `parseListParams()` used for all list endpoints | TBD | every list handler |
| 15 | Menu items added to `CustomMenu.tsx` with section label | TBD | `apps/dashboard/src/components/CustomMenu.tsx` |
| 16 | React Admin resources registered with list/create/edit/show | TBD | `src/index.ts` resources array |
| 17 | Create forms auto-assign `tenantId` from context | TBD | `CategoryCreate.tsx`, `EntryCreate.tsx` |
| 18 | List views filter by active tenant | TBD | `CategoryList.tsx`, `EntryList.tsx` |
| 19 | Seed function is idempotent | TBD | re-run `seedKnowledgeBase` twice, assert no duplicates |
| 20 | Config settings declared in `configSchema` if applicable | TBD | `src/index.ts` configSchema array |
| 21 | Tenant-customizable settings stored in `module-config` | TBD | no tenant-customizable columns on domain tables |
| 22 | All configurable settings declared in `configSchema` with type, description, defaultValue | TBD | `src/index.ts` |
| 23 | Slug columns have unique constraint | TBD | `unique('kbc_tenant_slug').on(tenantId, slug)` |
| 24 | Foreign keys are plain integers (no Drizzle `references()`) | TBD | `src/schema.ts` grep for `.references(` |
| 25 | Public endpoints marked in `api_endpoint_permissions` | TBD | `src/seed.ts` search endpoint entry |

## Dependencies

- Sprints 01–04 complete.
- Dashboard dev server startable.
- Stakeholder available to approve graduation.

## Risks

- **Risk**: a late-breaking checklist failure requires rolling back
  registration. **Mitigation**: registration happens in sprint 04, so
  sprint 05 can un-register without touching KB's own package by
  reverting the single line in `modules.ts`.
- **Risk**: graduation move is approved but the todo folder has
  in-progress work not yet captured in canonical docs. **Mitigation**:
  canonical docs are the source of truth; this sprint's job is to
  ensure nothing in the todo folder contradicts them before moving.

## Test plan

No new tests. Run everything that exists.

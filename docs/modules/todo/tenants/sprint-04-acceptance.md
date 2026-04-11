# Sprint 04 — Acceptance

## Goal

Final cross-module acceptance pass for `tenants`. Runs only after
sprint-02 and sprint-03 are complete. Graduates the module out of
`docs/modules/todo/tenants/` and into
`docs/modules/IMPLEMENTATION-STATUS.md` as live.

## Scope

### In

- **Cross-module integration walkthrough**: run UC-2 (onboard
  tenant), UC-3 (configure), UC-11 (portal public access) end-to-end
  against a scratch Neon database. Script the walkthrough in
  `apps/dashboard/scripts/acceptance-tenants.ts`.
- **Graduation review**: every item in `STATUS.md` acceptance
  checklist is closed.
- **Doc sync**: `docs/modules/IMPLEMENTATION-STATUS.md` gains a
  "Tenants — Live" row with test-count, last-audit date, and
  backup branch name.
- **Cleanup**: `docs/modules/todo/tenants/` deleted in the same
  commit that publishes the graduation (per the todo
  `README.md#graduation-definition-of-done`).

### Out

- New features
- Additional test coverage beyond what sprint-02 and sprint-03
  shipped
- RLS policy rollout (blocked on `module-auth`)

## Deliverables

- [ ] `apps/dashboard/scripts/acceptance-tenants.ts` — runnable
  script that exits 0 if all acceptance criteria pass
- [ ] `pnpm --filter dashboard run acceptance:tenants` green on
  fresh Neon DB
- [ ] `IMPLEMENTATION-STATUS.md` updated
- [ ] `docs/modules/todo/tenants/` deleted
- [ ] `docs/modules/todo/PROGRESS.md` regenerated with the
  graduation row
- [ ] Final commit message:
  `graduate(tenants): canonical docs + sprint-02 tests + sprint-03 hardening`

## Acceptance criteria

- Every box in `STATUS.md` acceptance checklist is checked
- Acceptance script passes on a fresh database
- No regressions in `pnpm --filter @oven/module-tenants test`
- `pnpm --filter dashboard lint` passes on the acceptance script
- No `style={}` in any component touched by this program
- `import type` audit green across the package

## Cross-module integration script outline

```typescript
// apps/dashboard/scripts/acceptance-tenants.ts
async function main() {
  // 1. Create a tenant via POST /api/tenants
  // 2. Assert `tenants.tenant.created` event reaches a subscriptions listener
  //    (check: a plan row was attached)
  // 3. Write 14 config keys via POST /api/module-configs (one per key)
  // 4. Read them back via GET /api/module-configs/resolve-batch
  // 5. Assert the resolve response has every key at the tenant-instance tier
  // 6. Call GET /api/tenants/<slug>/public
  // 7. Assert the public response has every field EXCEPT `id`
  // 8. Add a member; assert tenant_members row exists
  // 9. Try to remove the last owner; assert 409
  // 10. Try to add a 51st member (MAX_MEMBERS_PER_TENANT default); assert 409
  //     (or a pre-seeded override for faster test)
  // 11. Delete the tenant (soft delete); assert enabled=false
  // 12. Assert /api/tenants/<slug>/public now returns 404
}
```

## Rule compliance checklist — graduation gate

- [ ] `docs/module-rules.md` — every rule in
  `CODE-REVIEW.md#rule-compliance-matrix` is PASS
- [ ] `docs/package-composition.md` — no cross-module imports
- [ ] `docs/routes.md` — every route registered
- [ ] `docs/use-cases.md` — UC-2, UC-3, UC-9, UC-11 walk green
- [ ] `docs/modules/00-overview.md` — tenants in Phase-0 position
- [ ] `docs/modules/20-module-config.md` — 15 configSchema entries
  resolvable
- [ ] `docs/modules/21-module-subscriptions.md` — quota listener
  wired
- [ ] `docs/modules/13-tenants.md` — spec fully implemented
- [ ] Root `CLAUDE.md` — styling, type imports, zustand pattern
  (future), error-handling posture
- [ ] Canonical 11-file doc shape complete

## Graduation outcome

When this sprint closes:

1. `docs/modules/todo/tenants/` is removed from the repo.
2. `docs/modules/tenants/` remains as the canonical doc set.
3. `docs/modules/IMPLEMENTATION-STATUS.md` lists tenants as live.
4. The next tenant-related work opens its own new todo folder if
   needed (e.g., `docs/modules/todo/tenants-rls/` for the RLS
   rollout once `module-auth` ships middleware).

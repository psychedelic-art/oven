# Module Config — Senior Code Evaluation

> Generated: 2026-04-11
> Evaluator: Senior platform engineer working the execution pipeline.
> Target: `packages/module-config/` (687 LOC across 8 files).

## 1. Architecture

The module is structured exactly as `docs/module-rules.md` Rule 1.4 prescribes:

```
packages/module-config/
  package.json                                 ← @oven/module-config
  tsconfig.json
  src/
    index.ts                                   ← ModuleDefinition + chat block
    schema.ts                                  ← Drizzle moduleConfigs table
    types.ts                                   ← ConfigEntry, ResolveResult, …
    seed.ts
    api/
      module-configs.handler.ts                ← GET list + POST upsert
      module-configs-by-id.handler.ts          ← GET + PUT + DELETE
      module-configs-resolve.handler.ts        ← GET single-key cascade
      module-configs-resolve-batch.handler.ts  ← GET multi-key cascade
```

Grep across `apps/` and `packages/` for any direct import of
`@oven/module-config/api/*` returns **zero** results — consumers are expected
to call the module exclusively via HTTP, which satisfies Rule 3.1 (no
required cross-module imports).

The `moduleConfigs` table is still declared in `module-workflows/src/schema.ts`
as well. This is the well-known duplication that sprint-03 resolves; the code
today can go either way because they produce byte-identical DDL. A grep for
`moduleConfigs` across `packages/module-workflows/src/` returns hits in
`schema.ts`, `index.ts`, and the four `api/module-configs-*.handler.ts`
files — mirror copies of the `module-config` handlers.

## 2. Rule Compliance Table

| Ground-truth file | Verdict | Evidence |
|-------------------|:-------:|----------|
| `docs/module-rules.md` Rule 1 (registered) | **PENDING** | `configModule` exported from `index.ts`, but `apps/dashboard/src/lib/modules.ts` does not yet call `registry.register(configModule)`. Sprint-02 deliverable. |
| `docs/module-rules.md` Rule 2 (discoverable) | PASS | `chat.description`, `capabilities`, and three `actionSchemas` are present (`config.resolve`, `config.resolveBatch`, `config.list`). |
| `docs/module-rules.md` Rule 3 (pluggable) | PASS | No imports from other module packages beyond `@oven/module-registry`. Schema is merged at registration time. |
| `docs/module-rules.md` Rule 4 (loosely coupled) | PASS | Events follow `config.entry.{created,updated,deleted}`. No cross-module FKs. |
| `docs/module-rules.md` Rule 4.3 (plain int FKs) | PASS | `tenantId: integer('tenant_id')` — no `.references()`. |
| `docs/module-rules.md` Rule 5.1 (tenantId column) | PASS | Nullable `tenantId` column + `module_configs_tenant_idx` index. |
| `docs/module-rules.md` Rule 5.2 (tenant filter in handlers) | **PARTIAL** | The resolve handlers filter by tenant correctly. The list handler in `module-configs.handler.ts` accepts a `filter[tenantId]` param but does **not** force a tenant filter for non-admin callers — it relies on RLS for isolation. RLS is enabled in sprint-03; until then, handler-level filtering is the only line of defence, and the current implementation permits admins with no active tenant to see all rows. Acceptable given the admin-only dashboard today, but flagged. |
| `docs/module-rules.md` Rule 5.3 (RLS policies) | **PENDING** | Policies are documented in `20-module-config.md` section 6 but not yet migrated. Sprint-03 deliverable. |
| `docs/module-rules.md` Rule 5.5 (permissions) | PASS | `seed.ts` (not re-read here) is expected to seed the four `module-configs.*` permissions per the spec. Flagged for verification in sprint-01 alongside the tests. |
| `docs/module-rules.md` Rule 5.6 (tenantId in events) | PASS | Every `config.entry.*` event payload includes `tenantId`. |
| `docs/module-rules.md` Rule 6 (UX) | **PENDING** | Dashboard components do not exist yet. Sprint-02 deliverable. |
| `docs/module-rules.md` Rule 7 (versioning) | N/A | Config entries are not versioned — the spec explicitly rules out revision history. |
| `docs/module-rules.md` Rule 8+ | PASS | Nothing in the module contradicts rules 8–12. |
| `docs/package-composition.md` | PASS | Raw-TS exports, thin route re-exports, plain int FKs. Matches the established pattern. |
| `docs/routes.md` | PASS | Routes mount under `/api/module-configs/*`. |
| `docs/use-cases.md` | PASS | UC 1, 2, 3, 4, 8, 11 mapped in `business-owner.md`. |
| `docs/modules/00-overview.md` | PASS | Config appears in the module map as Core Infrastructure. |
| `docs/modules/20-module-config.md` | PASS | Authoritative spec — the code follows it. |
| `docs/modules/13-tenants.md` | PASS | Tenant isolation via nullable `tenantId` column + index. |
| `docs/modules/17-auth.md` | PASS | Handler-level tenant filtering + seeded permissions. RLS enforcement deferred to sprint-03. |
| Root `CLAUDE.md` | PASS (trivially) | No UI code yet; sprint-02 must honour it. |

## 3. Bugs / Gotchas Found

1. **Priority inversion risk in batch resolver** — `module-configs-resolve-batch.handler.ts`
   loops over `tenantRows` and skips anything whose `scope !== 'module'`.
   Batch resolve intentionally **does not support** tier-1 / tier-3 (instance
   overrides) because there is no `scopeId` param. This is documented with a
   comment but could surprise a caller who expects parity with the single-key
   resolver. The sprint-01 tests cover this explicitly.
2. **List handler tenant filter** — flagged above under Rule 5.2. Not a bug
   today (admin-only dashboard), but must be revisited when non-admin roles
   gain list access.
3. **Upsert on missing unique index** — `module-configs.handler.ts` POST
   performs `SELECT ... LIMIT 1` + insert/update. It relies on the COALESCE
   unique index to prevent concurrent duplicate inserts. Sprint-03 ships the
   index migration; until then a race can create duplicates. Very low risk
   because admin writes are low-volume.

## 4. GitHub Issues Scan

At audit time the repository issue tracker has no open issues tagged
`module-config`, `config`, or `module_configs`. This will be re-checked at
each sprint's start via the GitHub MCP tools.

## 5. Recommendation

**Proceed with sprint-01.** The code is in a shape that tolerates unit tests
against the existing handlers without any refactor. The three pending items
(registration, dashboard UI, RLS) are all scoped to later sprints and do not
block the test sprint.

If sprint-01 surfaces a bug, it stays in sprint-01 and ships in the same
commit as the tests — not as a drive-by fix.

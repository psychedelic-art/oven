# Todo Queue Progress

Regenerated on 2026-04-11 (cycle 3) after the merge pipeline landed
the `auth` and `tenants` canonical doc scaffolds and the `module-ai`
F-05-01 sort allowlist helper onto the session branch
`claude/inspiring-clarke-M7sl8`, on top of the latest `origin/dev`
which already carries PR #25 (5-branch roll-up) and PR #26
(`dashboard-ux-system` bootstrap).

## Cycle-3 merge audit

One source branch landed this cycle — `GA0Ok`. It is a strict superset
of the two other open branches through shared merge ancestry and also
carries two brand-new tenants commits (`e6be97c`, `06d259d`) that
appeared between cycle-2 and cycle-3.

| # | Branch | Module / Program | Backup | Unique content | Tests | Verdict |
|---|--------|------------------|--------|----------------|-------|---------|
| 1 | `claude/inspiring-clarke-GA0Ok` | `auth` + `tenants` + `module-ai` F-05-01 | `bk/claude-inspiring-clarke-GA0Ok-20260411` | `docs/modules/auth/` 11 canonical files (1,411 lines); `docs/modules/todo/auth/` README + STATUS + PROMPT + business-owner + CODE-REVIEW + `sprint-00..04`; `docs/modules/tenants/` 11 canonical files; `docs/modules/todo/tenants/` README + STATUS + CODE-REVIEW + `sprint-00..04`; `computeBusinessHours` hardening + 28 vitest; `getOrderColumn<T>` helper + playground handler fix + 8 vitest; `oven-bug-sprint` sprint-05 F-05-01 cross-links | **36 new** — 8 `@oven/module-ai` + 28 `@oven/module-tenants` | **MERGED** → session branch |
| 2 | `claude/inspiring-clarke-0OpL4` | (subset of GA0Ok — auth + F-05-01) | `bk/claude-inspiring-clarke-0OpL4-20260411` | — subsumed by GA0Ok through ancestry | — | DROPPED (superseded) |
| 3 | `claude/dashboard-ux-system-nESUZ` | (already landed on `origin/dev` via PR #26 on 2026-04-11) | `bk/claude-dashboard-ux-system-nESUZ-20260411` | — already on `dev` | — | ALREADY ON DEV |
| 4 | `claude/qa-test-todo-module-K2tpT` | — (build artifact only) | `bk/claude-qa-test-todo-module-K2tpT-20260411` | `apps/dashboard/tsconfig.tsbuildinfo` only | — | **BLOCK** — tsbuildinfo is a build artifact that must not be tracked |

Lifetime test additions across cycles 1–3: **149 new unit tests**
(`@oven/module-config` 24, `@oven/module-notifications` 37,
`@oven/module-ai` +8 this cycle, `@oven/module-tenants` +28 this
cycle, `@oven/module-subscriptions` +52 this cycle — sprint-01
foundation). Verified green on the session branch:

```
pnpm --filter @oven/module-ai test
  Test Files  11 passed (11)   Tests  110 passed (110)
pnpm --filter @oven/module-tenants test
  Test Files  1 passed (1)     Tests  28 passed (28)
pnpm --filter @oven/module-subscriptions test
  Test Files  3 passed (3)     Tests  52 passed (52)
```

The `module-ai` suite staying green after the
`usage-metering.ts` refactor is the key proof that the
`checkQuota` / `trackUsage` middleware contract is unchanged.

Shared ancestor audit: `d4865d2` "Docs/feature module ai conventions
(#21)" was on every GA0Ok-family branch but superseded on `dev` by
PR #22 (`2a7d63d`). GA0Ok's own `fe1296e` sync commit had already
dropped the PR #21 payload, so the diff against current `dev` is clean.

## Tenants sprint-02 hardening (landed this cycle)

`computeBusinessHours` in `packages/module-tenants/src/utils.ts` was
tightened from the dev baseline version:

- Accepts `null | undefined` for `schedule` and `timezone` (closed
  matches the BO rule that an unconfigured tenant is never "open").
- Takes a `now: Date = new Date()` parameter so tests can pin a
  deterministic instant without mocking the global `Date`.
- Wraps `Intl.DateTimeFormat` in a try/catch at the helper boundary —
  an invalid IANA timezone ("Atlantis/Unknown") no longer crashes the
  dashboard, it returns `false`.
- Normalises the midnight `hour: "24"` edge case (some runtimes) to
  `"00"` so the lexicographic `HH:MM` comparison with `open`/`close`
  strings stays correct across Node versions.

28 vitest cases cover: null/undefined guards, each day of the week,
both `open` and `close` boundary inclusivity, midnight rollover,
invalid-timezone catch, missing-day-entry, pre-open/after-close,
noon-on-a-closed-day, and default-parameter smoke tests. See
`packages/module-tenants/src/__tests__/compute-business-hours.test.ts`.

## Active queue (after cycle-3 merges)

| Module / Program | Sprint files | Canonical doc set | Package / tests | Next action |
|---|---|---|---|---|
| `auth` | 5 (sprint-00..04) | complete (11 files, 1,411 lines) | — (package not yet scaffolded) | Execute sprint-01 foundation — scaffold `packages/module-auth/` + `packages/adapter-authjs/` |
| `tenants` | 5 (sprint-00..04) | complete (11 files) | `computeBusinessHours` hardened + 28 tests green | Execute sprint-03 security hardening (RLS + `app.tenant_ids` GUC + last-owner guard + sort allowlist) |
| `subscriptions` | 6 (sprint-00..05) | complete (11 files, scaffolded cycle-3 Phase-3) | **52 tests green** — 10 billing-cycle + 25 resolver + 17 module-definition (shipped cycle-3 Phase-4) | Execute sprint-02 usage-metering — X-Usage-Idempotency-Key + slug validation + per-period aggregation |
| `dashboard-ux-system` | 8 (sprint-00..07) | N/A (program, not module) | — | Execute sprint-01 foundation — bootstrap `packages/dashboard-ui/` shared chrome |
| `ui-flows` | 5 (sprint-00..03, 99-acceptance) | complete | — | Execute sprint-01 foundation |
| `config` | 4 (sprint-00..04) | complete | 24 tests green | Execute sprint-02 dashboard UI |
| `notifications` | 5 (sprint-00..05) | complete | 37 tests green; package NOT registered in dashboard `modules.ts` | Register in dashboard; execute sprint-02 WhatsApp Meta adapter |
| `module-knowledge-base` | 5 (sprint-00..05) | partial (`Readme.md` only — needs 10 more files) | — | Fill missing canonical doc files; execute sprint-02 embedding pipeline |
| `oven-bug-sprint` | 7 (sprint-00..06) | N/A (program, not module) | F-05-01 shipped | Execute sprint-00 triage remaining findings |
| `psychedelic-claude-code-migration` | 12 (sprint-00..11) | N/A | — | Owned elsewhere — do not touch |

## Known issues

1. **Pre-existing typecheck baseline of 460 errors on `dev`** —
   unchanged since cycle 1. All from `packages/workflow-editor/`
   missing a `react` dev dep. Tracked as tech debt.

2. **`@oven/module-notifications` is not registered** in
   `apps/dashboard/src/lib/modules.ts`. Blocks module visibility on
   the dashboard. Tracked in
   `docs/modules/todo/notifications/STATUS.md`.

3. **`module-knowledge-base` canonical doc shape is incomplete** —
   only `docs/modules/knowledge-base/Readme.md` exists. Candidate for
   Phase-3 research.

4. **`ui-flows` canonical shape uses `sprint-99-acceptance.md`** while
   every other module uses `sprint-NN-acceptance.md`. Minor, not
   blocking.

5. **Drizzle `getDb()` returns `any`.** Forces idempotent seeds and
   the new sort helper to do narrow casts. Clean fix is to type
   `getDb` against a composed drizzle schema.

6. **`claude/qa-test-todo-module-K2tpT` branch carries
   `tsconfig.tsbuildinfo`.** Build artifact — should be added to
   `.gitignore`. Tracked under `oven-bug-sprint`.

7. ~~**`subscriptions` has zero unit tests**~~ — **CLOSED cycle-3
   Phase-4**. 52 vitest tests shipped covering billing-cycle
   math, the five-step limit resolver, and the ModuleDefinition
   contract. The seed idempotency test has been deferred to
   sprint-02 (requires a Drizzle mock harness out of scope for
   this cycle).

## Backup inventory (cumulative)

**Cycle 1 (already on `dev`):**

- `bk/claude-eager-curie-TXjZZ-20260411` (ui-flows)
- `bk/claude-eager-curie-LRIhN-20260411` (module-knowledge-base)
- `bk/claude-eager-curie-INifN-20260411` (config)
- `bk/claude-eager-curie-4GaQC-20260411` (notifications)
- `bk/claude-eager-curie-0da9Q-20260411` (oven-bug-sprint)
- `bk/claude-eager-curie-3Wkp7-20260411` (redundant)

**Cycle 2 (dashboard-ux-system landed via PR #26):**

- `bk/claude-dashboard-ux-system-nESUZ-20260411`
- `bk/claude-qa-test-todo-module-K2tpT-20260411`
- `bk/claude-inspiring-clarke-0OpL4-20260411`

**Cycle 3 (this pipeline):**

- `bk/claude-inspiring-clarke-GA0Ok-20260411` (auth + tenants + F-05-01)

## QA reports

- `docs/modules/todo/qa-reports/claude-qa-test-todo-module-K2tpT-QA-REPORT.md` — BLOCK
- `docs/modules/todo/qa-reports/claude-dashboard-ux-system-nESUZ-QA-REPORT.md` — MERGED (landed via PR #26)
- `docs/modules/todo/qa-reports/claude-inspiring-clarke-0OpL4-QA-REPORT.md` — MERGED (subsumed by GA0Ok in cycle 3)

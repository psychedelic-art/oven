# sprint-00-discovery — Module Files

## Goal

Inventory every file in `packages/module-files/src/**` against the
canonical doc set (`docs/modules/files/*.md`) and the top-level spec
(`docs/modules/14-files.md`). Produce a written gap list so later
sprints work from evidence, not assumption.

## Scope

- `packages/module-files/src/index.ts` — ModuleDefinition shape.
- `packages/module-files/src/schema.ts` — `files` table.
- `packages/module-files/src/seed.ts` — permissions and public endpoints.
- `packages/module-files/src/types.ts` — exported types.
- `packages/module-files/src/api/**` — all 3 handlers.
- `packages/module-files/src/engine/**` — 4 engine files.
- `apps/dashboard/src/lib/modules.ts` — registration check.
- Any consumer import (`grep -rn 'module-files' apps/ packages/`).

## Out of scope

- No code changes. Zero file edits to `packages/module-files/`.
- No test additions.
- No sprint execution — this is reconnaissance only.

## Deliverables

1. **`docs/modules/todo/files/CODE-REVIEW.md`** — a gap list with
   file:line references, structured by requirement id (R1.1, R2.3,
   etc.).
2. **Update `STATUS.md`** — confirm or correct the "Implementation
   status snapshot" table.
3. **Commit**: `docs(files): sprint-00 discovery — code review + status
   sync`.

## Acceptance criteria

- [x] Every `[LIVE]` requirement in
      `detailed-requirements.md` is verified against code.
- [x] Every `[SPRINT-N]` requirement has a matching file:line
      that demonstrates the gap.
- [x] `CODE-REVIEW.md` contains no placeholders.
- [x] `STATUS.md` "Implementation status snapshot" table is
      accurate (no lies about what's live).
- [x] Discovery output is reviewed and signed off before
      sprint-01 starts.

## Dependencies

None. This sprint is entirely read-only.

## Risks

- **Hidden consumers** — if a module we don't expect imports from
  `@oven/module-files/src/**` directly, sprint-02's adapter
  injection refactor might break them. Mitigated by the
  `grep -rn 'module-files'` scan in the Scope section.
- **Stale spec** — if `docs/modules/14-files.md` contradicts the
  live package, flag the conflict; do not silently "fix" the spec.

## Test plan

N/A — docs only.

## Rule Compliance checklist

| Ground truth | Applicable | How |
|---|---|---|
| `docs/module-rules.md` | Yes | Rule 3.1 (no cross-module imports) — verify no consumer imports `@oven/module-files/src/*` outside the public exports. |
| `docs/package-composition.md` | Yes | Verify `module-files` sits in Phase-0 layer; depends only on `module-registry` and `module-tenants`. |
| `docs/routes.md` | Yes | Cross-check route registration shape. |
| `docs/use-cases.md` | Yes | Verify each UC-Files-* is either live or scheduled. |
| `docs/modules/00-overview.md` | Yes | Module placement sanity check. |
| `docs/modules/13-tenants.md` | Yes | Tenant-scoping contract not yet honoured (call out in gap list). |
| `docs/modules/17-auth.md` | Yes | JWT tenant-set shape note. |
| `docs/modules/14-files.md` | Yes | Primary comparison target. |
| Root `CLAUDE.md` — no inline styles | N/A | No UI in the package today. |
| Root `CLAUDE.md` — `import type` | Yes | Scan type imports in `src/**`. |
| Root `CLAUDE.md` — error handling only at boundaries | Yes | Verify the engine doesn't return HTTP responses and the handler catches adapter errors. |

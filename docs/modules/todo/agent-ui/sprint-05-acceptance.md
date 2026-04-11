# Sprint 05 — Acceptance (graduation gate)

## Goal

Final gate that moves `@oven/agent-ui` from the todo queue to
"graduated & live". When every acceptance item below is ticked,
this todo folder is deleted in the same commit that publishes the
graduation, and `docs/modules/IMPLEMENTATION-STATUS.md` records
the module as shipped.

## Scope

Verification only. No code changes, no new docs, no new tests.
Every item must point to a file or test path that already passes.

## Acceptance checklist

### Documentation
- [ ] `docs/modules/agent-ui/Readme.md` exists and matches the
      code.
- [ ] `docs/modules/agent-ui/UI.md` documents every exported
      component.
- [ ] `docs/modules/agent-ui/api.md` lists every consumed
      endpoint.
- [ ] `docs/modules/agent-ui/architecture.md` reflects the
      package layout.
- [ ] `docs/modules/agent-ui/database.md` enumerates every
      `localStorage` key owned by the package.
- [ ] `docs/modules/agent-ui/detailed-requirements.md` R-IDs
      trace to code.
- [ ] `docs/modules/agent-ui/module-design.md` invariants are
      still honoured.
- [ ] `docs/modules/agent-ui/prompts.md` developer prompts are
      still current.
- [ ] `docs/modules/agent-ui/references.md` lists every runtime
      and dev dependency.
- [ ] `docs/modules/agent-ui/secure.md` threat model has no
      open items.
- [ ] `docs/modules/agent-ui/use-case-compliance.md` has every
      UC row marked LIVE (no PLANNED / PARTIAL).

### Code & Tests
- [ ] `pnpm --filter @oven/agent-ui test` green.
- [ ] `pnpm --filter @oven/agent-ui typecheck` green.
- [ ] `pnpm --filter @oven/agent-ui build:widget` green and
      within size budget.
- [ ] No `@mui/*` imports anywhere under `packages/agent-ui/**`
      (enforced by `no-mui-imports.test.ts` from sprint-01).

### Requirements
- [ ] R1.* — package boundaries: enforced by lint + test.
- [ ] R2.* — UnifiedAIPlayground: shipped.
- [ ] R3.* — ChatWidget: shipped.
- [ ] R4.* — Session persistence: tested.
- [ ] R5.* — Theming: `themes.test.ts` covers every preset.
- [ ] R6.* — Message rendering: tested.
- [ ] R7.* — Command input: tested.
- [ ] R8.* — Layout modes: manually verified across breakpoints.
- [ ] R9.* — Embeddability: standalone bundle + cross-browser
      matrix.
- [ ] R10.* — Test coverage rules honoured.
- [ ] R11.* — Accessibility: sprint-04 passed.

### Sprint history
- [ ] sprint-00 ✅
- [ ] sprint-01 ✅
- [ ] sprint-02 ✅
- [ ] sprint-03 ✅
- [ ] sprint-04 ✅

### Publication
- [ ] `docs/modules/IMPLEMENTATION-STATUS.md` updated with
      `agent-ui: live-and-graduated`.
- [ ] `docs/modules/todo/README.md` active-queue table removes
      `agent-ui`.
- [ ] `docs/modules/todo/PROGRESS.md` archives the graduation.
- [ ] `docs/modules/todo/agent-ui/` folder deleted in the
      graduation commit.

## Out of scope

- New features.
- Future sprints. If a new concern appears, open a new
  `docs/modules/todo/agent-ui/sprint-NN-<slug>.md` before
  deleting this folder.

## Dependencies

- All prior sprints (00 → 04).

## Risks

- Graduation can stall on a single checklist item. Mitigation:
  treat this sprint as "all or nothing" — no partial merges.

## Rule compliance checklist

- [ ] Every ground-truth rules file listed in the prompt has
      been re-checked against the post-cycle state.
- [ ] `CLAUDE.md` invariants still hold.
- [ ] Canonical doc shape still 11/11.

# sprint-03-editor-hardening — ui-flows

## Goal

Harden `packages/ui-flows-editor` so tenant admins can confidently
author, preview, publish, diff, and restore UI flow portals.

## Scope

- `utils/validation.ts` — validate a `UiFlowDefinition` against the
  schema documented in `docs/modules/ui-flows/module-design.md`:
  required `pages[]`, unique `slug`, valid `type`, `formRef` required
  for `form`/`custom`, `agentSlug` required for `chat`, at least one
  `pages[i]` where `slug === HOME_PAGE_SENTINEL`.
- `utils/definition-converter.ts` — ReactFlow graph ↔
  `UiFlowDefinition` conversion with round-trip property tests.
- `panels/PreviewPanel.tsx` — embed a live iframe pointing at
  `http://{tenantSlug}.localhost:3001/?preview=1` with a force-refresh
  button.
- `panels/VersionDiffPanel.tsx` — show structured diff between two
  `ui_flow_versions` rows (pages added/removed/modified, theme
  changes, routing changes) using a small diff utility (not a full
  jsondiffpatch dependency).
- `toolbar/PublishButton.tsx` — confirm dialog, guardrail against
  publishing an invalid definition, increment version on success.
- `store/*.ts` — zustand store via factory + React context (root
  `CLAUDE.md` rule), adapter captured by closure.

## Out of scope

- Custom domain registration UI.
- A/B testing infrastructure.
- Tenant user feedback widgets on the portal side.

## Deliverables

1. `packages/ui-flows-editor/src/utils/validation.ts` + tests.
2. `packages/ui-flows-editor/src/utils/definition-converter.ts` + round-trip
   tests.
3. `packages/ui-flows-editor/src/panels/PreviewPanel.tsx` (MUI `sx`).
4. `packages/ui-flows-editor/src/panels/VersionDiffPanel.tsx`.
5. `packages/ui-flows-editor/src/toolbar/PublishButton.tsx`.
6. `packages/ui-flows-editor/src/store/createUiFlowEditorStore.ts`
   (factory) + `UiFlowEditorProvider.tsx` (context) +
   `useUiFlowEditor.ts` (selector hook).
7. Smoke test exercising the full author flow in jsdom.

## Acceptance criteria

- [ ] `validation.ts` rejects every negative case in
      `validation.test.ts` with a descriptive error.
- [ ] `definition-converter.ts` round-trips every seed fixture from
      `packages/module-ui-flows/src/seed.ts` losslessly.
- [ ] `PublishButton` blocks publish if validation errors exist and
      shows them in a dialog.
- [ ] Zustand store is parameterized per editor instance (no
      singleton) and reads adapter by closure — verified by rendering
      two editors on the same page with different tenants.
- [ ] Every component uses MUI `sx`; no `style={{ }}`; no
      `styled(Component)`.

## Dependencies

- sprint-01-foundation merged (test infra wired up for ui-flows-editor).
- sprint-02-portal-app merged (the iframe preview targets the new
  `apps/portal`).

## Risks

| Risk                                                  | Mitigation                                                               |
|-------------------------------------------------------|---------------------------------------------------------------------------|
| Diff algorithm explosion on large definitions        | Cap diff at page-level granularity; nested diffs are opt-in               |
| ReactFlow perf with many pages                        | Virtualized node rendering + panning threshold                            |
| Zustand singleton footgun                             | Enforce via factory lint rule; test two instances in one DOM             |
| Preview iframe CORS in dev                            | Middleware allows `*.localhost` origins in development only               |

## Test plan

- `validation.test.ts` — 1 happy path + at least 12 negative cases.
- `definition-converter.test.ts` — round-trip on every seed fixture +
  a randomly generated definition via `fast-check` if available.
- `store/useUiFlowEditor.test.tsx` — renders two providers, asserts
  isolation.
- `PublishButton.test.tsx` — mocks validation result, asserts the
  dialog blocks invalid and fires publish on valid.
- Manual: open `/ui-flows/[id]/editor` on a seeded flow, make a page
  change, publish, diff vs prior version, restore.

## Rule compliance checklist

- [ ] Root `CLAUDE.md` — MUI `sx`, zustand factory + context,
      `import type`.
- [ ] `docs/modules/19-ui-flows.md` §7 — editor package structure
      preserved.
- [ ] `docs/modules/20-module-config.md` — `MAX_PAGES_PER_FLOW` and
      `ENABLE_CUSTOM_CSS` respected in the editor UI.

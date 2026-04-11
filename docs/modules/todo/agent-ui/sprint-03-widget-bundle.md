# Sprint 03 — Widget bundle guardrails

## Goal

Make the standalone `chat-widget.js` bundle reproducible,
size-budgeted, and cross-browser-tested, so external tenant sites
can embed it with confidence and we can notice size regressions
before they ship.

## Scope

- Wire a `pnpm --filter @oven/agent-ui build:widget` run into
  CI (or a pre-release script) that produces
  `packages/agent-ui/dist/chat-widget.js`.
- Add a size budget: the bundle MUST NOT exceed
  `{TARGET_KB}` kilobytes gzipped (initial target set by the
  first successful build + 5%).
- Write a `scripts/check-widget-size.ts` that reads the
  gzipped size, compares against the budget, and exits
  non-zero on overage.
- Document the manual cross-browser smoke test matrix
  (Chromium, Firefox, Safari) in
  `docs/modules/agent-ui/references.md` §"Tooling".
- Verify the `data-shadow="true"` branch of `src/entry/widget.ts`
  works end-to-end in at least one browser.
- Cache-bust the bundle at release time: filename becomes
  `chat-widget-{contentHash}.js`, `chat-widget-latest.js` is a
  short redirect / symlink.

## Out of scope

- Building a hosted CDN. Ops team owns hosting.
- Adding new widget features.
- Accessibility (sprint-04).

## Deliverables

- `scripts/check-widget-size.ts`
- Updated `packages/agent-ui/package.json` with `build:widget`
  and `check:size` scripts.
- A CI hook (or a documented local command) that runs both.
- Cross-browser smoke test checklist pasted into a
  `docs/modules/todo/agent-ui/BROWSER-MATRIX.md`.
- Initial size-budget value committed with the first green build.

## Acceptance criteria

- [ ] `pnpm --filter @oven/agent-ui build:widget` produces a
      file under the budget.
- [ ] `check:size` fails loudly on a deliberate 10% bloat.
- [ ] Manual test: widget mounts on a minimal `.html` in
      Chromium + Firefox + Safari without console errors.
- [ ] Widget styles do not leak onto the host `.html` page.
- [ ] `localStorage` persistence works across a browser reload.
- [ ] `STATUS.md` sprint-03 row flipped to ✅.

## Dependencies

- Sprint 00 inventory (to confirm current bundle entry points).
- Sprint 01 (no MUI so the bundle is already minimal).

## Risks

- First build may pull in unexpected dev-only deps and overshoot
  a sensible budget. Mitigation: inspect the Vite build log, add
  `external:` entries for anything that should not be bundled.
- Shadow DOM path may behave differently in Safari. Mitigation:
  test the `data-shadow="true"` branch explicitly.

## Test plan

- Automated: `check:size` script.
- Manual: cross-browser matrix (documented).
- Regression: a vitest test that spawns the built bundle as a
  string and asserts it contains the expected mount function
  signature.

## Rule compliance checklist

- [ ] `CLAUDE.md` — unchanged; bundle build must not trigger a
      lint regression.
- [ ] `docs/modules/agent-ui/secure.md` T1 — bundle styles
      scoped, no host-page pollution.
- [ ] `docs/modules/agent-ui/secure.md` T2 — no
      `dangerouslySetInnerHTML` in the bundled output
      (regex-check as part of `check:size`).

# Sprint 04 — Accessibility hardening

## Goal

Make `@oven/agent-ui` WCAG 2.1 AA compliant in both the dashboard
playground and the external-site widget, so screen-reader users
and keyboard-only users can reach every feature without a mouse
and without surprise announcements.

Requirements covered: **R11.1, R11.2, R11.3, R11.4** from
`../../agent-ui/detailed-requirements.md`.

## Scope

- **R11.1 — Accessible names.** Every interactive element
  (button, textbox, link, list item, expandable card) has an
  `aria-label`, `aria-labelledby`, or visible label.
- **R11.2 — Keyboard navigation.** Full keyboard navigation of
  the playground:
  - Tab order hits every control in visual order.
  - Enter submits the message.
  - Esc dismisses `<CommandPalette>` and the delete-confirmation
    modal.
  - Arrow keys move focus in `<SessionSidebar>` and
    `<CommandPalette>`.
  - Focus is trapped inside modal confirmations and released on
    close.
- **R11.3 — Live region for streaming.** Streaming tokens are
  announced via a polite `aria-live` region (not assertive). The
  announcement is throttled so multi-token updates do not spam
  the screen reader.
- **R11.4 — Colour contrast.** Every theme preset meets WCAG AA
  contrast ratios for body text and UI controls. Manual check
  required for Midnight and Clinical presets, which are the
  tightest.
- Use `vitest-axe` for automated rule checks per component.

## Out of scope

- Changing the visual design.
- Adding new components.
- Localisation (Spanish / English string bundles exist elsewhere
  and are unaffected).

## Deliverables

- `aria-*` attributes on every interactive element in `widget/`,
  `playground/`, and `shared/`.
- `useLiveRegion` hook for polite announcements (or add the live
  region directly to `<UnifiedAIPlayground>` and `<ChatWidget>`).
- Focus-trap implementation for modal confirmations.
- `*.a11y.test.tsx` files under `__tests__/` running
  `vitest-axe` against each top-level component.
- Manual contrast verification notes in `BROWSER-MATRIX.md`
  (created in sprint-03).
- Update `../../agent-ui/UI.md` with any new aria-* props or
  accessible-name conventions.

## Acceptance criteria

- [ ] `pnpm --filter @oven/agent-ui test` runs the new
      `*.a11y.test.tsx` suite with zero axe violations for
      every tested component.
- [ ] Manual Tab-through of `/ai-playground` hits every visible
      control in order.
- [ ] Manual screen-reader run (VoiceOver on macOS Safari)
      announces streaming tokens without interrupting the user.
- [ ] Every preset in `themes/presets.ts` passes a contrast
      check for primary-on-background and text-on-surface.
- [ ] `STATUS.md` sprint-04 row flipped to ✅.

## Dependencies

- Sprint 02 (sidebar completion) — so the keyboard flow exists
  to test.
- Sprint 03 (widget bundle) — so the Safari manual test is
  practical against a real built bundle.

## Risks

- `vitest-axe` may flag false-positives on our custom
  command-palette widget. Mitigation: add scoped disable
  comments with a link to an accessibility-team ticket
  explaining why.
- Screen-reader testing requires real hardware. Mitigation:
  document the manual test steps so another reviewer can rerun.

## Test plan

- Automated: `*.a11y.test.tsx` via `vitest-axe`.
- Manual: Tab-through + VoiceOver (macOS Safari) + NVDA
  (Windows Firefox) + TalkBack (mobile Chrome).
- Contrast: use `axe-core` `color-contrast` rule + a manual
  check with the Figma contrast plugin.

## Rule compliance checklist

- [ ] `docs/modules/agent-ui/detailed-requirements.md` R11.* —
      every criterion explicitly met.
- [ ] `CLAUDE.md` — no inline styles; contrast-critical colours
      referenced via CSS custom properties + Tailwind arbitrary
      values (`bg-[var(--oven-widget-primary)]`).
- [ ] `docs/modules/agent-ui/secure.md` — unchanged; no new
      attack surface.

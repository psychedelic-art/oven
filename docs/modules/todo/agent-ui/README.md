# Agent UI — Todo Folder

This folder tracks the in-flight sprint plan for `@oven/agent-ui`.
The module is LIVE — the package exists, the dashboard
`/ai-playground` route and the portal chat page renderer both
consume it, and a standalone widget bundle ships from
`src/entry/widget.ts`. What remains are hardening sprints.

## Links

- **Spec**: [`../../16-agent-ui.md`](../../16-agent-ui.md)
- **Canonical docs**: [`../../agent-ui/`](../../agent-ui/) — 11/11
  complete
- **Package source**: `packages/agent-ui/src/`
- **Tests**: `packages/agent-ui/src/__tests__/`

## Why this module is in the todo queue

The package shipped in earlier cycles and works in production,
but several dimensions are still short of the "graduated" bar:

1. Accessibility has never been audited end-to-end.
2. The standalone widget bundle lacks a size-budget guardrail.
3. `<SessionSidebar>` pin/unpin wiring is partial.
4. The Newsan-lineage primitives imported from the prior chat
   stack still use loose typing in a few spots.
5. There is no formal PR-time style-rule check enforcing R1.1
   (no MUI imports).

Each of these is scoped into its own sprint below so we can land
them independently without a mega-PR.

## Sprint plan

| # | File | Goal | Status |
|---|------|------|--------|
| 00 | [`sprint-00-discovery.md`](sprint-00-discovery.md) | Inventory current code vs. canonical docs, surface drift, lock requirement IDs. | planned |
| 01 | [`sprint-01-foundation.md`](sprint-01-foundation.md) | Tighten hook typings, drop any remaining `any`, add a lint rule banning `@mui/*` imports from `packages/agent-ui/**`. | planned |
| 02 | [`sprint-02-session-sidebar.md`](sprint-02-session-sidebar.md) | Complete `<SessionSidebar>` pin / rename / delete / export flows against `module-chat` endpoints. | planned |
| 03 | [`sprint-03-widget-bundle.md`](sprint-03-widget-bundle.md) | Add a size-budget regression check on `dist/chat-widget.js`, document the manual cross-browser test matrix. | planned |
| 04 | [`sprint-04-accessibility.md`](sprint-04-accessibility.md) | WCAG 2.1 AA compliance across the playground and widget. R11.1–R11.4. | planned |
| 05 | [`sprint-05-acceptance.md`](sprint-05-acceptance.md) | Acceptance gate. Graduated → delete this todo folder. | planned |

## Graduation checklist

Deleted only when:

1. Every sprint's acceptance checklist is ticked.
2. `packages/agent-ui` test suite is green with > 0 tests per
   hook and per wired component.
3. `docs/modules/agent-ui/*` matches the code.
4. `docs/modules/IMPLEMENTATION-STATUS.md` lists agent-ui as
   live-and-graduated.
5. A manual cross-browser test of the standalone bundle has been
   captured in `dashboard-ux-system` notes.

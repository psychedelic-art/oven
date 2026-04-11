# Sprint 02 — Session sidebar completion

## Goal

Complete the session sidebar's pin / rename / delete / export
flows end-to-end against `module-chat` endpoints, with tests,
error handling at the hook boundary only, and optimistic UI that
rolls back on API failure.

## Scope

- `<SessionSidebar>` — wire the four actions documented in
  `../../agent-ui/UI.md`:
  - **Pin/unpin** → `PATCH /api/chat-sessions/:id` with
    `{ pinned: boolean }`.
  - **Rename** → `PATCH /api/chat-sessions/:id` with
    `{ title: string }` (inline edit).
  - **Delete** → `DELETE /api/chat-sessions/:id` (confirm dialog).
  - **Export** → `GET /api/chat-sessions/:id/export?format=...`
    (download JSON / Markdown / plaintext).
- Optimistic updates for pin/unpin and rename (rollback on
  failure via React Query cache restore).
- Delete confirmation modal that is keyboard-accessible (Tab,
  Enter, Esc).
- Sidebar search (client-side, already present) and
  paginated load of older sessions.
- Unit tests for every optimistic-update path including the
  rollback.

## Out of scope

- Backend changes to `module-chat` (its endpoints already exist
  per `api.md`).
- Accessibility hardening beyond the confirmation modal keyboard
  flow (sprint-04 handles the rest).
- Standalone widget bundle (sprint-03).

## Deliverables

- Completed `<SessionSidebar>` component.
- New `useSessionActions.ts` hook wrapping the four mutations
  with React Query `useMutation` + optimistic updates.
- Confirmation modal component (or reuse an `@oven/oven-ui`
  primitive if one exists).
- Tests: `SessionSidebar.test.tsx`,
  `useSessionActions.test.ts`.

## Acceptance criteria

- [ ] Pin/unpin updates the UI optimistically and persists.
- [ ] Rename is inline, Enter commits, Esc cancels.
- [ ] Delete shows a modal, requires a second confirmation,
      removes the row on success.
- [ ] Export triggers a file download in the requested format.
- [ ] On API failure, optimistic updates roll back and a
      `<ChatErrorCard>` appears inline in the sidebar row.
- [ ] Tests cover happy path + rollback for every mutation.
- [ ] `STATUS.md` sprint-02 row flipped to ✅.

## Dependencies

- Sprint 00 inventory.
- Sprint 01 type tighten (so new types are strict from day 1).
- `module-chat` endpoints already documented in
  `../../chat/api.md` (verify before implementing).

## Risks

- Optimistic rollback may race with a subsequent mutation if the
  user clicks rapidly. Mitigation: use `onMutate` / `onError` /
  `onSettled` correctly, per React Query docs.
- The existing `<SessionSidebar>` may already have partial
  wiring that conflicts with a fresh implementation. Mitigation:
  diff against sprint-00 inventory first.

## Test plan

- Happy path for all four actions.
- Rollback for each mutation (simulate 500 response with MSW or
  a vitest mock).
- Keyboard navigation: Tab through the sidebar rows, Enter to
  activate rename, Esc to cancel.
- Delete modal keyboard flow (Tab + Enter + Esc).

## Rule compliance checklist

- [ ] `CLAUDE.md` R1.* — Tailwind via `cn()`, no inline styles,
      `import type`.
- [ ] `docs/module-rules.md` §14 — Error envelopes consumed via
      `<ChatErrorCard>`.
- [ ] `docs/modules/agent-ui/UI.md` — `<SessionSidebar>` prop
      shape respected.
- [ ] `docs/modules/chat/api.md` — endpoints match exactly.

# Sprint 04 — Dashboard UI

## Goal

Ship the React Admin resources for `notification-channels`,
`notification-conversations`, and `notification-escalations`, plus the
`UsageDashboard` custom page. All styling via MUI `sx` — zero inline
`style={}`, zero hand-written CSS classes (root `CLAUDE.md`).

## Scope

### In

- `apps/dashboard/src/components/notifications/ChannelList.tsx`
- `.../ChannelCreate.tsx`
- `.../ChannelEdit.tsx`
- `.../ChannelShow.tsx`
- `.../AdapterConfigFields.tsx` — dynamic form fields per adapter
  (`twilio`, `meta`, `resend`). Driven by a lookup map declared outside
  the component.
- `.../ConversationList.tsx`
- `.../ConversationShow.tsx` — WhatsApp-style chat bubbles using
  `<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>`
  containers and `<Paper sx={{ px: 2, py: 1, maxWidth: '70%',
  bgcolor: direction === 'inbound' ? 'action.hover' : 'primary.light',
  alignSelf: direction === 'inbound' ? 'flex-start' : 'flex-end' }}>`
  bubbles. Delivery status icons (`DoneIcon`, `DoneAllIcon`) with
  `color="action"` or `color="success"` conditionally.
- `.../EscalationList.tsx`, `EscalationShow.tsx`, `EscalationEdit.tsx`
- `.../UsageDashboardPage.tsx` — custom route page with bar + line charts
  per channel. Use an MUI-compatible chart library already in the repo
  (verify in sprint execution); if none, fall back to rendering via a
  simple `<LinearProgress>` gauge + a responsive grid table.
- Add `notificationsModule` to `apps/dashboard/src/lib/modules.ts` in the
  correct dependency order (after `tenants` and `agent-core`, before any
  downstream module that listens to its events).
- Update `apps/dashboard/src/components/CustomMenu.tsx` with a
  `Notifications` section — a `<Divider sx={{ my: 1 }}>` + a
  `<Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>`
  label, followed by the four resource / route menu items.
- Vitest / React Testing Library smoke tests for `AdapterConfigFields`
  and for the `ConversationShow` bubble rendering.

### Out

- Real-time tailing of new messages (Server-Sent Events or websocket) —
  deferred.
- Bulk channel import.
- Export CSV of conversations.

## Deliverables

1. 10 `.tsx` files under `apps/dashboard/src/components/notifications/`
2. `lib/modules.ts` registration
3. `CustomMenu.tsx` section
4. Vitest smoke tests
5. Commit: `feat(notifications): dashboard UI for channels, conversations, escalations, usage`
6. Commit: `test(notifications): dashboard component smoke tests`

## Acceptance Criteria

- [ ] `grep -rn 'style=' apps/dashboard/src/components/notifications`
  returns zero matches (root `CLAUDE.md` rule — hard block)
- [ ] No `className` with hand-written classes — only Tailwind not
  applicable (dashboard is MUI territory)
- [ ] No `styled(Component)` constructions
- [ ] All MUI spacing uses theme units (`p: 2`, `mt: 1`) — no raw px strings
- [ ] React Admin list views auto-filter by the global
  `TenantSelector` active tenant
- [ ] Create form auto-assigns `tenantId` via the active tenant context
- [ ] Dev server renders the Channels list page without error; manual
  smoke test checklist recorded in the sprint outcome (UI smoke tests are
  not a substitute for a real browser pass)

## Dependencies

- Sprint-02 handlers (needed for data provider fetches)
- Sprint-03 usage handler (for the UsageDashboard)
- Graduated sibling references for layout patterns (`apps/dashboard/src/`)

## Risks

- **Chart library absence** — if no MUI-compatible chart lib is already
  installed, do not add one as a drive-by. Fall back to the simple gauge
  + table layout and record the deferral in STATUS.md.
- **`TenantSelector` hook shape** — verify before using; if the shape
  differs from `useTenantContext().activeTenantId`, adjust to match the
  real API.

## Test Plan (TDD)

1. Smoke test for `AdapterConfigFields` rendering each adapter variant.
2. Smoke test for `ConversationShow` direction-based bubble styling.
3. Manual browser pass on dev server.

## Rule Compliance Checklist

- [ ] Root `CLAUDE.md` no-inline-styles — enforced by the grep assertion
- [ ] Root `CLAUDE.md` MUI `sx` rule — every style uses `sx`
- [ ] Rule 6.1 — CRUD resources follow the convention
- [ ] Rule 6.2 — menu items grouped with section label
- [ ] Rule 6.3 — list views auto-filter by active tenant
- [ ] Rule 6.4 — create forms auto-assign tenantId
- [ ] Rule 6.7 — JSONB inputs use the right editors

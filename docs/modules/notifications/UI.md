# UI — module-notifications

All dashboard UI lives under
`apps/dashboard/src/components/notifications/`. Dashboard is MUI territory —
every style uses the `sx` prop (root `CLAUDE.md`). No inline
`style={}`, no hand-written CSS classes, no `styled()` wrappers.

Sprint-04 delivers this surface.

---

## React Admin Resources

### `notification-channels`

Files:
- `ChannelList.tsx`
- `ChannelCreate.tsx`
- `ChannelEdit.tsx`
- `ChannelShow.tsx`
- `AdapterConfigFields.tsx` — dynamic form fields per adapter

Columns in `ChannelList`:

| Column | Source |
|---|---|
| Tenant | `<ReferenceField source="tenantId" reference="tenants">` (only when no active tenant) |
| Channel | `<TextField source="channelType">` with a badge `<Chip sx={{ bgcolor: channelTypeColor[type] }}>` |
| Adapter | `<TextField source="adapterName">` |
| Name | `<TextField source="name">` |
| Enabled | `<BooleanField source="enabled">` |

`ChannelCreate` / `ChannelEdit` flow: choose tenant (if super-admin),
then channel type, then adapter selector (filtered by channel type),
then `<AdapterConfigFields adapter={...}>` renders the correct inputs.
Sensitive inputs use `type="password"` with a show/hide toggle; the
stored value is encrypted via the `module-files` encryption helpers
(or a local encryption helper if module-files is not installed).

`ChannelShow` renders a config summary (with sensitive fields masked),
the last 10 conversations via `<ReferenceManyField>`, and the current
usage gauge via `<UsageMeter tenantId={record.tenantId} channelType={record.channelType}>`.

### `notification-conversations`

Files:
- `ConversationList.tsx`
- `ConversationShow.tsx` — chat-bubble thread view

`ConversationShow` renders messages inside a scrollable `<Box>`:

```tsx
// ConversationShow.tsx (simplified — real implementation uses React Admin's useGetList)
<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 2 }}>
  {messages.map((m) => (
    <Box
      key={m.id}
      sx={{
        alignSelf: m.direction === 'inbound' ? 'flex-start' : 'flex-end',
        maxWidth: '70%',
      }}
    >
      <Paper
        elevation={1}
        sx={{
          px: 2,
          py: 1,
          bgcolor: m.direction === 'inbound' ? 'action.hover' : 'primary.light',
          color: m.direction === 'inbound' ? 'text.primary' : 'primary.contrastText',
          borderRadius: 2,
        }}
      >
        <Typography variant="body2">{m.content.text}</Typography>
      </Paper>
      <Box sx={{ display: 'flex', justifyContent: m.direction === 'inbound' ? 'flex-start' : 'flex-end', gap: 0.5, mt: 0.25 }}>
        <Typography variant="caption" color="text.secondary">
          {formatTimestamp(m.createdAt)}
        </Typography>
        {m.direction === 'outbound' && <DeliveryStatusIcon status={m.status} />}
      </Box>
    </Box>
  ))}
</Box>
```

No `style={}`. No raw px values for spacing. Theme-aware colors.

### `notification-escalations`

Files:
- `EscalationList.tsx`
- `EscalationShow.tsx`
- `EscalationEdit.tsx`

`EscalationList` columns: tenant, channel, reason (`<Chip>`), user
message (truncated with `sx={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}`),
status, createdAt.

`EscalationEdit` has a "Mark Resolved" toolbar button and a resolution
notes `<TextInput multiline>`. Resolving submits PUT with `status='resolved'`,
`resolvedAt=now()`, `resolvedBy=currentUser.id`.

## Custom Pages

### `/notifications/usage` (UsageDashboardPage)

Custom route registered via `customRoutes`. Layout:

- Top row: three `<Card>` components showing current-period usage for
  WhatsApp, SMS, email with a `<LinearProgress variant="determinate"
  value={percentage} sx={{ height: 8, borderRadius: 1 }}>`.
- Middle: per-channel bar chart of daily counts. Uses whatever chart
  library is already present in the dashboard — sprint-04 verifies and
  documents that choice; if none is available, falls back to a table.
- Bottom: a `<Datagrid>` pulling from `/api/notifications/usage`
  showing tenant × channel × count × limit × percentage × source tier.

## Menu

`CustomMenu.tsx` gets a new section inserted between whatever's above
and below it (sprint-04 picks the position):

```tsx
<Divider sx={{ my: 1 }} />
<Box sx={{ px: 2, pb: 0.5 }}>
  <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>
    Notifications
  </Typography>
</Box>
<Menu.ResourceItem name="notification-channels" />
<Menu.ResourceItem name="notification-conversations" />
<Menu.ResourceItem name="notification-escalations" />
<Menu.Item to="/notifications/usage" primaryText="Usage" leftIcon={<BarChartIcon />} />
```

## Microinteractions / FTUE

- **First-run** — if a tenant has zero channels, `ChannelList` renders an
  empty state `<Box sx={{ p: 4, textAlign: 'center' }}>` with a call-to-action
  button that opens `ChannelCreate` with the active tenant preselected.
- **Test connection** — `ChannelEdit` toolbar has a "Test Connection"
  button that POSTs to `/api/notification-channels/[id]/test` (deferred
  to a follow-on sprint; button exists but is `disabled` until the
  endpoint lands).
- **Copy webhook URL** — on `ChannelShow` for WhatsApp channels, render
  the webhook URL with a copy-to-clipboard `<IconButton>`.

## Accessibility

- All interactive controls have visible focus via the default MUI focus
  ring; sprint-04 does not override it.
- All color-coded chips (delivery status, escalation reason) are
  accompanied by text labels so colorblind users are not left out.
- Conversation threads are announced via `role="log"` on the outer
  `<Box>` with `aria-live="polite"` for any live updates.

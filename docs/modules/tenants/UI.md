# Module Tenants — Dashboard UI

## React Admin resources

| Resource | Component | File |
|---|---|---|
| `tenants` (list) | `TenantList` | `apps/dashboard/src/components/tenants/TenantList.tsx` |
| `tenants` (create) | `TenantCreate` | `apps/dashboard/src/components/tenants/TenantCreate.tsx` |
| `tenants` (edit) | `TenantEdit` | `apps/dashboard/src/components/tenants/TenantEdit.tsx` |
| `tenants` (show) | `TenantShow` | `apps/dashboard/src/components/tenants/TenantShow.tsx` |

`tenant-members` is inline inside `TenantEdit` / `TenantShow` — not a
standalone resource — because a member row is meaningless outside its
tenant context.

## Styling rule

Every component in `apps/dashboard/src/components/tenants/` uses the
**MUI `sx` prop only**, per the root `CLAUDE.md` `mui-sx-prop` rule.
No inline `style={}`, no `className=` with hand-written CSS, no
`styled(Component)`. Spacing is expressed in theme units
(`sx={{ p: 2 }}`), never raw pixels.

## Tenant list

Datagrid columns: name, slug, enabled (BooleanField), member count
(derived via React Admin `<ReferenceManyField>` count), created-at,
updated-at.

Toolbar filters: `enabled` (boolean chip), `q` (search across
`name`/`slug`), `createdAt` (date range). These filters **will** migrate
to the shared `<FilterToolbar>` primitive when the
`dashboard-ux-system` program's sprint-04 lands; today they are
inline-per-component.

## Tenant create

Wizard-style form with a single step: identity. Name (required,
TextInput), slug (required, lower-kebab validation, TextInput with
pattern hint). Operational config (schedule, tone, branding) is set
from the Edit view after creation — keeping Create minimal avoids
partial-config tenants.

## Tenant edit — tabbed form

| Tab | Source | Primary inputs |
|---|---|---|
| **Identity** | `tenants` table | name, slug, enabled |
| **Config** | `module_configs` | BUSINESS_NAME, NIT, LOGO, TONE, TIMEZONE, LOCALE, SCHEDULING_URL |
| **Schedule** | `module_configs.SCHEDULE` | `<ScheduleEditor>` — 7 rows (Mon–Sun) with open/close time pickers + closed toggle |
| **Services** | `module_configs` | `<ServicesTagInput>` (AUTHORIZED_SERVICES), `<PaymentMethodsInput>` |
| **Communication** | `module_configs` | `<ContactInfoEditor>`, welcome messages (multiline TextInput) |
| **Members** | `tenant_members` table | `<TenantMembersTab>` inline list with add/remove |

### Config tab read/write pattern

Config tabs never touch the `tenants` table. They read/write through
`module-config` APIs:

```typescript
// read — batched resolve
const { data: config } = useQuery(['tenant-config', record.id], () =>
  fetch(
    `/api/module-configs/resolve-batch?moduleName=tenants` +
    `&tenantId=${record.id}` +
    `&keys=BUSINESS_NAME,NIT,LOGO,TONE,TIMEZONE,LOCALE,SCHEDULING_URL`
  ).then(r => r.json())
);

// write — upsert one key at a time
const saveConfig = async (key: string, value: unknown) => {
  await fetch('/api/module-configs', {
    method: 'POST',
    body: JSON.stringify({
      tenantId: record.id,
      moduleName: 'tenants',
      scope: 'module',
      key,
      value,
    }),
  });
};
```

React Admin's `useEditContext()` exposes the tenant `record`. The
config tab intentionally does **not** participate in the standard
`<SimpleForm>` submit — each field saves on blur through the upsert
pattern above. This keeps the identity Save button and the config edits
cleanly separated.

## Tenant show — overview dashboard

Sections:

1. **Identity card** — name, slug, enabled flag, created-at.
2. **Config summary** — resolved values from `module-config` (read-only).
3. **Active subscription** — fetched from `module-subscriptions` via
   `/api/subscriptions?tenantId=<id>`.
4. **Member activity** — recent `tenants.member.added` events for the tenant.
5. **Business hours strip** — live indicator using
   `GET /api/tenants/[id]/business-hours`.

## Custom pages

- `/tenants/[id]/dashboard` — deeper analytics view. Not yet
  implemented; scheduled for the dashboard-ux-system program sprint-06.

## Menu section

`CustomMenu.tsx` places Tenants under the "Core" section label. The
section label primitive is ad-hoc today; once the dashboard-ux-system
program ships `<MenuSectionLabel>`, every label including Tenants will
migrate to it.

## Tenant context primitive (gap)

`useTenantContext()` does not yet exist. Rule 6.3 of module-rules.md
says list views should read the active tenant from this primitive and
Rule 6.4 says create forms should auto-assign `tenantId` from it. Today
the tenant list and edit components show all tenants regardless of the
viewer's active tenant. This gap is owned by the
`dashboard-ux-system` program sprint-03, not by this module.

When that sprint lands, `TenantList` will switch from
`filter={{ enabled: true }}` to
`filter={{ enabled: true, tenantId: useTenantContext().activeTenantId }}`
in admin mode where a tenant admin should only see their own tenant row.

## Accessibility

- All form fields have explicit `label` props — React Admin wires ARIA.
- Schedule editor time pickers use the MUI `TimePicker` with `aria-label`
  per row.
- Confirmation dialog on delete (via `useNotify` + `useRedirect`).
- Keyboard navigation: React Admin defaults apply.

## i18n

Labels live in `apps/dashboard/src/i18n/en.json` and `es.json` under
`resources.tenants.*` per the React Admin convention. Every label used
in this module is translated; no hardcoded English strings in JSX.

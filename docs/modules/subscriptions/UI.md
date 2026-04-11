# Subscriptions — UI

Dashboard UI lives in `packages/module-subscriptions/src/resources/`
and `packages/module-subscriptions/src/components/`. Everything is
MUI + React Admin — no Tailwind, no portal-layer code in this
module. Sprint-04 is the delivery sprint for the UI.

## React Admin resources

| Resource              | List columns                              | Edit fields                                | Notes                                |
|-----------------------|-------------------------------------------|--------------------------------------------|--------------------------------------|
| `service-categories`  | slug, name, description                   | slug, name, description                    | Platform admin only                  |
| `services`            | slug, category, unit                      | slug, name, category, unit, description    | Platform admin only                  |
| `providers`           | slug, name, websiteUrl                    | slug, name, websiteUrl                     | Platform admin only                  |
| `provider-services`   | provider, service, costCents, isPreferred | provider, service, costCents, isPreferred  | Platform admin only                  |
| `billing-plans`       | slug, name, priceCents, isPublic, quota count | slug, name, description, priceCents, currency, isPublic + `QuotaEditor` | Platform admin only; embeds `QuotaEditor` |
| `tenant-subscriptions`| tenant, plan, status, startedAt           | tenant, plan, status + `OverrideEditor`    | Scoped by tenant context             |

### `QuotaEditor`

Inline child component embedded in the billing plan edit page.
Lists existing `sub_plan_quotas` rows with an "Add quota" button
that pops a dialog with service + quota + period fields. Saves
optimistically via the React Admin data provider.

### `OverrideEditor`

Inline child component embedded in the tenant subscription edit
page. Lists existing `sub_quota_overrides` rows with a "Add override"
button. Shows the original plan quota beside the override so the
admin sees exactly what they are changing.

### `UsageMeter`

Standalone component (not a resource) rendered in:

1. The tenant detail page from `module-tenants`
   (`TenantShow`) — shows the tenant's current usage vs quota per
   service.
2. The dashboard home page for tenant admins — a personal summary.

Query: `GET /api/tenant-subscriptions/[tenantId]/limits` joined
with `GET /api/usage/summary` results. Rendered as a
`Stack` of `LinearProgress` rows, one per service, with:

- Primary color when `percent < 80`
- Warning color when `80 <= percent < 100`
- Error color when `percent >= 100`

## Styling rules

Per `CLAUDE.md`:

- **No `style={{ }}` anywhere.** Every MUI component uses the `sx`
  prop.
- **No `className=` with custom CSS.** No `styled(Box)({})` either.
- Theme values over hardcoded colors: `bgcolor: 'background.paper'`,
  `color: 'error.main'`.
- Responsive where it matters: `sx={{ gap: { xs: 1, md: 2 } }}`.
- Pseudo-selectors via `sx`: `'&:hover': { bgcolor: 'action.hover' }`.

## Type imports

Every type-only import uses `import type`:

```ts
import type { RaRecord } from 'react-admin';
import type { PublicBillingPlan } from '../types';
```

## State management

No zustand stores are added by this module. React Admin's data
provider is the source of truth for server state. If sprint-04
discovers a need for local state (e.g. a wizard), the store is
created via the factory + React context pattern from `CLAUDE.md`.

## Menu placement

```ts
menuItems: [
  {
    section: 'Billing',
    items: [
      { label: 'Plans',         resource: 'billing-plans',       icon: 'LocalOffer' },
      { label: 'Subscriptions', resource: 'tenant-subscriptions', icon: 'Subscriptions' },
      { label: 'Services',      resource: 'services',             icon: 'Category' },
      { label: 'Providers',     resource: 'providers',            icon: 'CloudSync' },
    ],
  },
],
```

The menu section is named "Billing" even though the package is
named "subscriptions" — the user-facing concept is billing, not
the implementation module name.

## Accessibility

- Every `LinearProgress` has an accessible `aria-label` derived from
  the service name.
- Every form field uses MUI's built-in `label` (React Admin
  auto-generates these from the resource schema).
- Color is never the sole signal — the warning / error state is
  also annotated with an icon + tooltip.

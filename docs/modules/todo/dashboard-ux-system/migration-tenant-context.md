# Tenant Context Migration Guide

> Sprint-03 migration reference document.
> Date: 2026-04-13

## Overview

Sprint-03 migrates all tenant-scoped dashboard components from hand-rolled
tenant filters to the centralized `useTenantContext` hook from
`@oven/dashboard-ui`.

## Architecture

```
AdminApp.tsx
  └── TenantAwareLayout
        ├── TenantContextProvider (wraps entire layout)
        │     ├── dataProvider → adapted from React Admin's useDataProvider()
        │     └── permissions → { has: () => true } (no authProvider yet)
        ├── CustomAppBar → TenantSelector (global tenant picker)
        └── Layout → CustomMenu + page content
              ├── *List.tsx → reads useTenantContext
              └── *Create.tsx → reads useTenantContext
```

## List migration pattern

### Before

```tsx
import { NumberInput } from 'react-admin';

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <NumberInput key="tenantId" source="tenantId" label="Tenant ID" />,
];

export default function FooList() {
  return (
    <List filters={filters}>
      <Datagrid>
        <NumberField source="tenantId" label="Tenant ID" />
        ...
      </Datagrid>
    </List>
  );
}
```

### After

```tsx
import { ReferenceField } from 'react-admin';
import { useTenantContext } from '@oven/dashboard-ui';

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  // tenantId filter REMOVED — handled by useTenantContext
];

export default function FooList() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);
  const isAdminMode = useTenantContext((s) => s.isAdminMode);

  return (
    <List
      filters={filters}
      filter={activeTenantId ? { tenantId: activeTenantId } : undefined}
    >
      <Datagrid>
        {isAdminMode && (
          <ReferenceField source="tenantId" reference="tenants" label="Tenant" />
        )}
        ...
      </Datagrid>
    </List>
  );
}
```

## Create migration pattern

### Before

```tsx
import { NumberInput } from 'react-admin';

export default function FooCreate() {
  return (
    <Create>
      <SimpleForm>
        <NumberInput source="tenantId" label="Tenant ID" isRequired />
        ...
      </SimpleForm>
    </Create>
  );
}
```

### After

```tsx
import { useTenantContext } from '@oven/dashboard-ui';

export default function FooCreate() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);

  return (
    <Create
      transform={(data: Record<string, unknown>) => ({
        ...data,
        tenantId: data.tenantId ?? activeTenantId,
      })}
    >
      <SimpleForm>
        {/* tenantId picker REMOVED — auto-assigned via transform */}
        ...
      </SimpleForm>
    </Create>
  );
}
```

## Files migrated

### Lists (18 files)

| File | Old filter | New pattern |
|------|-----------|-------------|
| forms/FormList | NumberInput | useTenantContext |
| flows/FlowList | NumberInput | useTenantContext |
| flow-items/FlowItemList | NumberInput | useTenantContext |
| form-submissions/FormSubmissionList | NumberInput | useTenantContext |
| form-components/FormComponentList | (column only) | useTenantContext |
| ui-flows/UiFlowList | NumberInput | useTenantContext |
| ui-flow-analytics/UiFlowAnalyticsList | NumberInput | useTenantContext |
| files/FileList | NumberInput | useTenantContext |
| ai/UsageLogList | TextInput | useTenantContext |
| ai/VectorStoreList | (column only) | useTenantContext |
| module-configs/ConfigList | NumberInput | useTenantContext |
| knowledge-base/KnowledgeBaseList | ReferenceInput | useTenantContext |
| knowledge-base/EntryList | ReferenceInput | useTenantContext |
| knowledge-base/CategoryList | ReferenceInput | useTenantContext |
| notifications/ChannelList | (column only) | useTenantContext |
| notifications/ConversationList | NumberInput | useTenantContext |
| notifications/EscalationList | NumberInput | useTenantContext |
| tenant-members/TenantMemberList | NumberInput | useTenantContext |
| tenant-subscriptions/TenantSubscriptionList | NumberInput | useTenantContext |

### Creates (16 files)

| File | Old picker | New pattern |
|------|-----------|-------------|
| forms/FormCreate | NumberInput | transform + useTenantContext |
| flows/FlowCreate | NumberInput | transform + useTenantContext |
| flow-items/FlowItemCreate | NumberInput | transform + useTenantContext |
| form-components/FormComponentCreate | NumberInput | transform + useTenantContext |
| ui-flows/UiFlowCreate | NumberInput | transform + useTenantContext |
| ai/VectorStoreCreate | NumberInput | transform + useTenantContext |
| ai/GuardrailCreate | NumberInput | transform + useTenantContext |
| module-configs/ConfigCreate | NumberInput | transform + useTenantContext |
| knowledge-base/KnowledgeBaseCreate | ReferenceInput | transform + useTenantContext |
| knowledge-base/EntryCreate | ReferenceInput | transform + useTenantContext |
| knowledge-base/CategoryCreate | ReferenceInput | transform + useTenantContext |
| notifications/ChannelCreate | TextInput | transform + useTenantContext |
| tenant-members/TenantMemberCreate | ReferenceInput | transform + useTenantContext |
| tenant-subscriptions/TenantSubscriptionCreate | NumberInput | transform + useTenantContext |
| auth/ApiKeyCreate | NumberInput | transform + useTenantContext |
| auth/UserCreate | NumberInput | transform + useTenantContext |

## Enforcement

`packages/dashboard-ui/src/__tests__/rule-6-enforcement.test.ts` asserts:
- Zero `<NumberInput source="tenantId">` in any List or Create file
- Every tenant-scoped file imports `useTenantContext`
- No `<ReferenceInput source="tenantId">` without `isAdminMode` guard

## Notes

- The `TenantContextProvider` is placed inside the React Admin `<Admin>`
  component (via `TenantAwareLayout`) because `useDataProvider()` is only
  available inside the Admin context.
- Permissions default to `{ has: () => true }` since no authProvider is
  configured. When an authProvider is added, update the permissions adapter
  in `AdminApp.tsx` to use `usePermissions()`.
- The `transform` on Create uses `data.tenantId ?? activeTenantId` (not
  just `activeTenantId`) so that an admin in "all tenants" mode can still
  manually specify a tenant via the URL or a future admin picker.

# Migration Guide: FilterToolbar

This document describes the before / after pattern for migrating any
React Admin `*List.tsx` from inline `filters` arrays to the shared
`FilterToolbar` from `@oven/dashboard-ui`.

## Before (inline filters array)

```tsx
import { List, Datagrid, TextInput, SelectInput, BooleanInput } from 'react-admin';

const choices = [
  { id: 'active', name: 'Active' },
  { id: 'closed', name: 'Closed' },
];

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <SelectInput key="status" source="status" choices={choices} />,
  <BooleanInput key="enabled" source="enabled" label="Enabled" />,
];

export function MyList() {
  return (
    <List filters={filters} sort={{ field: 'id', order: 'DESC' }}>
      <Datagrid>...</Datagrid>
    </List>
  );
}
```

## After (FilterToolbar)

```tsx
import { List, Datagrid, useListContext } from 'react-admin';
import { FilterToolbar, useTenantContext } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const filterDefinitions: FilterDefinition[] = [
  { source: 'q', label: 'Search', kind: 'quick-search', alwaysOn: true },
  {
    source: 'status',
    label: 'Status',
    kind: 'status',
    choices: [
      { id: 'active', name: 'Active', colour: 'success' },
      { id: 'closed', name: 'Closed', colour: 'error' },
    ],
  },
  { source: 'enabled', label: 'Enabled', kind: 'boolean' },
];

function MyListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export function MyList() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);

  return (
    <List
      actions={<MyListToolbar />}
      filter={activeTenantId ? { tenantId: activeTenantId } : undefined}
      sort={{ field: 'id', order: 'DESC' }}
    >
      <Datagrid>...</Datagrid>
    </List>
  );
}
```

## Key changes

1. **Remove the `filters` JSX array.** Replace with a typed
   `filterDefinitions: FilterDefinition[]` constant.
2. **Create a toolbar component.** It reads `filterValues` and
   `setFilters` from `useListContext()` and passes them to
   `FilterToolbar`.
3. **Pass the toolbar via `actions` prop**, not `filters`. The `filters`
   prop on `<List>` is reserved for reference-backed filters that need
   live data from the API (e.g. `<ReferenceInput>`).
4. **Tenant filtering stays via `filter` prop** on `<List>`, read from
   `useTenantContext`. The `FilterToolbar` does not manage tenant state;
   it respects it during "Clear all" by preserving `tenantId`.

## Filter kind mapping

| React Admin element | FilterDefinition kind |
|---|---|
| `<TextInput source="q" alwaysOn />` | `{ kind: 'quick-search', alwaysOn: true }` |
| `<SelectInput choices={...} />` | `{ kind: 'combo', choices: [...] }` |
| `<SelectInput>` for status/enum fields | `{ kind: 'status', choices: [{ id, name, colour }] }` |
| `<BooleanInput />` | `{ kind: 'boolean' }` |
| Date range (not in React Admin by default) | `{ kind: 'date-range' }` |

## Reference-backed filters

`FilterDefinition` does not yet support `reference`-based combo boxes
(where choices come from the API). Until sprint-06 adds this, keep
`<ReferenceInput>` filters as a separate `filters` prop on `<List>`:

```tsx
const referenceFilters = [
  <ReferenceInput key="categoryId" source="categoryId" reference="categories">
    <AutocompleteInput optionText="name" label="Category" />
  </ReferenceInput>,
];

<List filters={referenceFilters} actions={<MyListToolbar />}>
```

This pattern is used in `EntryList.tsx` (knowledge-base) for
`knowledgeBaseId` and `categoryId`.

## Sprint-06 scope

Sprint-06 (dashboard consistency pass) will:
- Migrate every remaining `*List.tsx` that still has an inline
  `filters` array.
- Add `reference`-backed `ComboBoxFilter` support so
  `<ReferenceInput>` can be fully replaced.
- Update this migration guide with the reference-backed pattern.

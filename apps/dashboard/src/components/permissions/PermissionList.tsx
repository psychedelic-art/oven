'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  useListContext,
} from 'react-admin';
import { FilterToolbar } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const RESOURCE_CHOICES = [
  { id: 'players', name: 'Players' },
  { id: 'maps', name: 'Maps' },
  { id: 'sessions', name: 'Sessions' },
  { id: 'tiles', name: 'Tiles' },
  { id: 'world-configs', name: 'World Configs' },
  { id: 'workflows', name: 'Workflows' },
  { id: 'roles', name: 'Roles' },
  { id: 'permissions', name: 'Permissions' },
  { id: 'rls-policies', name: 'RLS Policies' },
];

const filterDefinitions: FilterDefinition[] = [
  { source: 'q', label: 'Search', kind: 'quick-search', alwaysOn: true },
  { source: 'resource', label: 'Resource', kind: 'status', choices: RESOURCE_CHOICES },
];

function PermissionListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function PermissionList() {
  return (
    <List actions={<PermissionListToolbar />} sort={{ field: 'id', order: 'ASC' }}>
      <Datagrid rowClick="edit" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <TextField source="slug" />
        <TextField source="resource" />
        <TextField source="action" />
        <TextField source="description" />
        <DateField source="createdAt" label="Created" />
      </Datagrid>
    </List>
  );
}

'use client';
import { List, Datagrid, NumberField, TextField, DateField, FunctionField, useListContext } from 'react-admin';
import { Chip } from '@mui/material';
import { FilterToolbar } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const filterDefinitions: FilterDefinition[] = [
  { source: 'q', label: 'Search', kind: 'quick-search', alwaysOn: true },
  { source: 'status', label: 'Status', kind: 'combo', choices: [] },
];

function UserListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function UserList() {
  return (
    <List actions={<UserListToolbar />} sort={{ field: 'id', order: 'DESC' }}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <TextField source="name" label="Name" />
        <TextField source="email" label="Email" />
        <FunctionField
          label="Status"
          render={(record: { status?: string }) => {
            const color =
              record.status === 'active'
                ? 'success'
                : record.status === 'suspended'
                  ? 'error'
                  : 'default';
            return <Chip label={record.status} color={color} size="small" />;
          }}
        />
        <DateField source="lastLoginAt" label="Last Login" showTime />
        <DateField source="createdAt" label="Created" />
      </Datagrid>
    </List>
  );
}

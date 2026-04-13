'use client';
import { List, Datagrid, NumberField, TextField, DateField, FunctionField, ReferenceField, useListContext } from 'react-admin';
import { Chip } from '@mui/material';
import { FilterToolbar, useTenantContext } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const filterDefinitions: FilterDefinition[] = [
  { source: 'q', label: 'Search', kind: 'quick-search', alwaysOn: true },
];

function ApiKeyListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function ApiKeyList() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);
  const isAdminMode = useTenantContext((s) => s.isAdminMode);

  return (
    <List actions={<ApiKeyListToolbar />} filter={activeTenantId ? { tenantId: activeTenantId } : undefined} sort={{ field: 'id', order: 'DESC' }}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <TextField source="name" label="Name" />
        <TextField source="keyPrefix" label="Key Prefix" />
        {isAdminMode && <ReferenceField source="tenantId" reference="tenants" label="Tenant" />}
        <NumberField source="userId" label="User ID" />
        <FunctionField
          label="Enabled"
          render={(record: { enabled?: boolean }) => (
            <Chip
              label={record.enabled ? 'Yes' : 'No'}
              color={record.enabled ? 'success' : 'default'}
              size="small"
            />
          )}
        />
        <DateField source="lastUsedAt" label="Last Used" showTime />
        <DateField source="expiresAt" label="Expires" />
      </Datagrid>
    </List>
  );
}

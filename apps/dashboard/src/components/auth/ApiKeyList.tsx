'use client';
import { List, Datagrid, NumberField, TextField, DateField, FunctionField, ReferenceField, TextInput } from 'react-admin';
import { Chip } from '@mui/material';
import { useTenantContext } from '@oven/dashboard-ui';

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
];

export default function ApiKeyList() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);
  const isAdminMode = useTenantContext((s) => s.isAdminMode);

  return (
    <List filters={filters} filter={activeTenantId ? { tenantId: activeTenantId } : undefined} sort={{ field: 'id', order: 'DESC' }}>
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

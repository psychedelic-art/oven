'use client';
import { List, Datagrid, NumberField, TextField, DateField, FunctionField, TextInput } from 'react-admin';
import { Chip } from '@mui/material';

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
];

export default function ApiKeyList() {
  return (
    <List filters={filters} sort={{ field: 'id', order: 'DESC' }}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <TextField source="name" label="Name" />
        <TextField source="keyPrefix" label="Key Prefix" />
        <NumberField source="tenantId" label="Tenant ID" />
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

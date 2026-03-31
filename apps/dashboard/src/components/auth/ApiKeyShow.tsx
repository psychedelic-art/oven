'use client';
import { Show, SimpleShowLayout, TextField, NumberField, DateField, FunctionField } from 'react-admin';
import { Chip } from '@mui/material';

export default function ApiKeyShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <NumberField source="id" label="ID" />
        <TextField source="name" label="Name" />
        <TextField source="keyPrefix" label="Key Prefix" />
        <NumberField source="tenantId" label="Tenant ID" />
        <NumberField source="userId" label="User ID" />
        <FunctionField
          label="Permissions"
          render={(record: { permissions?: unknown }) => (
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(record.permissions, null, 2)}
            </pre>
          )}
        />
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
        <DateField source="createdAt" label="Created" />
      </SimpleShowLayout>
    </Show>
  );
}

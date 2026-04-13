'use client';
import { Create, SimpleForm, TextInput, NumberInput, DateTimeInput } from 'react-admin';
import { useTenantContext } from '@oven/dashboard-ui';

export default function ApiKeyCreate() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);

  return (
    <Create transform={(data: Record<string, unknown>) => ({ ...data, tenantId: data.tenantId ?? activeTenantId })}>
      <SimpleForm>
        <TextInput source="name" label="Name" isRequired fullWidth />
        <NumberInput source="userId" label="User ID" fullWidth />
        <TextInput
          source="permissions"
          label="Permissions (JSON)"
          multiline
          fullWidth
          format={(v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v, null, 2))}
          parse={(v: string) => {
            try {
              return JSON.parse(v);
            } catch {
              return v;
            }
          }}
        />
        <DateTimeInput source="expiresAt" label="Expires At" fullWidth />
      </SimpleForm>
    </Create>
  );
}

'use client';
import { Create, SimpleForm, TextInput, NumberInput, DateTimeInput } from 'react-admin';

export default function ApiKeyCreate() {
  return (
    <Create>
      <SimpleForm>
        <TextInput source="name" label="Name" isRequired fullWidth />
        <NumberInput source="tenantId" label="Tenant ID" fullWidth />
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

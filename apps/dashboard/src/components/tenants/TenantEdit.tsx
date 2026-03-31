'use client';

import {
  Edit,
  SimpleForm,
  TextInput,
  BooleanInput,
} from 'react-admin';

export default function TenantEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput source="name" label="Tenant Name" isRequired fullWidth />
        <TextInput source="slug" label="Slug" isRequired fullWidth helperText="URL-safe identifier" />
        <BooleanInput source="enabled" label="Enabled" />
        <TextInput
          source="metadata"
          label="Metadata (JSON)"
          fullWidth
          multiline
          rows={3}
          helperText="Optional JSON metadata"
          parse={(v: string) => {
            try { return JSON.parse(v); } catch { return v; }
          }}
          format={(v: unknown) =>
            typeof v === 'string' ? v : JSON.stringify(v, null, 2)
          }
        />
      </SimpleForm>
    </Edit>
  );
}

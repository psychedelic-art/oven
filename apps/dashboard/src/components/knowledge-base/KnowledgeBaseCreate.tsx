'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  BooleanInput,
} from 'react-admin';
import { useTenantContext } from '@oven/dashboard-ui';

export default function KnowledgeBaseCreate() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);

  return (
    <Create transform={(data: Record<string, unknown>) => ({ ...data, tenantId: data.tenantId ?? activeTenantId })}>
      <SimpleForm>
        <TextInput source="name" label="Name" isRequired fullWidth />
        <TextInput
          source="slug"
          label="Slug"
          fullWidth
          helperText="URL-safe identifier. Auto-generated from name if left empty."
        />
        <TextInput
          source="description"
          label="Description"
          multiline
          rows={3}
          fullWidth
        />
        <BooleanInput source="enabled" label="Enabled" defaultValue={true} />
      </SimpleForm>
    </Create>
  );
}

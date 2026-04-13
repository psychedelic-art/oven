'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  SelectInput,
} from 'react-admin';
import { useTenantContext } from '@oven/dashboard-ui';

const statusChoices = [
  { id: 'draft', name: 'Draft' },
  { id: 'published', name: 'Published' },
  { id: 'archived', name: 'Archived' },
];

export default function FormCreate() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);

  return (
    <Create transform={(data: Record<string, unknown>) => ({ ...data, tenantId: data.tenantId ?? activeTenantId })}>
      <SimpleForm>
        <TextInput source="name" label="Name" isRequired fullWidth />
        <TextInput source="slug" label="Slug" isRequired fullWidth />
        <TextInput source="description" label="Description" fullWidth multiline rows={3} />
        <SelectInput
          source="status"
          label="Status"
          choices={statusChoices}
          defaultValue="draft"
        />
      </SimpleForm>
    </Create>
  );
}

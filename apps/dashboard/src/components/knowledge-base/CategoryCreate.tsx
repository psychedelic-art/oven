'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
  BooleanInput,
  ReferenceInput,
  AutocompleteInput,
} from 'react-admin';
import { useTenantContext } from '@oven/dashboard-ui';

export default function CategoryCreate() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);

  return (
    <Create transform={(data: Record<string, unknown>) => ({ ...data, tenantId: data.tenantId ?? activeTenantId })}>
      <SimpleForm>
        <ReferenceInput source="knowledgeBaseId" reference="kb-knowledge-bases">
          <AutocompleteInput optionText="name" label="Knowledge Base" isRequired fullWidth />
        </ReferenceInput>
        <TextInput source="name" label="Name" isRequired fullWidth />
        <TextInput
          source="slug"
          label="Slug"
          fullWidth
          helperText="URL-safe identifier. Auto-generated from name if left empty."
        />
        <TextInput source="description" label="Description" multiline rows={3} fullWidth />
        <TextInput source="icon" label="Icon" fullWidth helperText="MUI icon name (e.g., EventNote, Schedule)" />
        <NumberInput source="order" label="Display Order" defaultValue={0} />
        <BooleanInput source="enabled" label="Enabled" defaultValue={true} />
      </SimpleForm>
    </Create>
  );
}

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

export default function CategoryCreate() {
  return (
    <Create>
      <SimpleForm>
        <ReferenceInput source="tenantId" reference="tenants">
          <AutocompleteInput optionText="name" label="Tenant" isRequired fullWidth />
        </ReferenceInput>
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

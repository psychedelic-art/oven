'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  BooleanInput,
  ReferenceInput,
  AutocompleteInput,
} from 'react-admin';

export default function KnowledgeBaseCreate() {
  return (
    <Create>
      <SimpleForm>
        <ReferenceInput source="tenantId" reference="tenants">
          <AutocompleteInput optionText="name" label="Tenant" isRequired fullWidth />
        </ReferenceInput>
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

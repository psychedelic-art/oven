'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  SelectInput,
  NumberInput,
} from 'react-admin';

const statusChoices = [
  { id: 'draft', name: 'Draft' },
  { id: 'published', name: 'Published' },
  { id: 'archived', name: 'Archived' },
];

export default function FormCreate() {
  return (
    <Create>
      <SimpleForm>
        <TextInput source="name" label="Name" isRequired fullWidth />
        <TextInput source="slug" label="Slug" isRequired fullWidth />
        <TextInput source="description" label="Description" fullWidth multiline rows={3} />
        <NumberInput source="tenantId" label="Tenant ID" isRequired />
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

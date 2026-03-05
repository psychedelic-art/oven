'use client';

import {
  Edit,
  SimpleForm,
  TextInput,
  SelectInput,
  NumberInput,
  TopToolbar,
  EditButton,
  Button,
} from 'react-admin';

const statusChoices = [
  { id: 'draft', name: 'Draft' },
  { id: 'published', name: 'Published' },
  { id: 'archived', name: 'Archived' },
];

function FormEditActions() {
  return (
    <TopToolbar>
      <Button label="Open Editor" />
    </TopToolbar>
  );
}

export default function FormEdit() {
  return (
    <Edit actions={<FormEditActions />}>
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
    </Edit>
  );
}

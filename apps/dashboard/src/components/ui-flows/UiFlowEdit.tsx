'use client';

import {
  Edit,
  SimpleForm,
  TextInput,
  NumberInput,
  SelectInput,
  BooleanInput,
} from 'react-admin';

export default function UiFlowEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput source="name" label="Name" isRequired />
        <TextInput source="slug" label="Slug" isRequired />
        <TextInput source="description" label="Description" multiline rows={3} />
        <NumberInput source="tenantId" label="Tenant ID" isRequired />
        <SelectInput
          source="status"
          label="Status"
          choices={[
            { id: 'draft', name: 'Draft' },
            { id: 'published', name: 'Published' },
            { id: 'archived', name: 'Archived' },
          ]}
        />
        <BooleanInput source="enabled" label="Enabled" />
      </SimpleForm>
    </Edit>
  );
}

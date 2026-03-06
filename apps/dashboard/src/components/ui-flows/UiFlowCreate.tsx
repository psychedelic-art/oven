'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
} from 'react-admin';

export default function UiFlowCreate() {
  return (
    <Create>
      <SimpleForm>
        <TextInput source="name" label="Name" isRequired />
        <TextInput source="slug" label="Slug" isRequired />
        <TextInput source="description" label="Description" multiline rows={3} />
        <NumberInput source="tenantId" label="Tenant ID" isRequired />
      </SimpleForm>
    </Create>
  );
}

'use client';

import {
  Edit,
  SimpleForm,
  TextInput,
  BooleanInput,
} from 'react-admin';

export default function ProviderEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput source="name" label="Provider Name" isRequired fullWidth />
        <TextInput source="slug" label="Slug" isRequired fullWidth />
        <TextInput source="description" label="Description" multiline rows={2} fullWidth />
        <TextInput source="website" label="Website URL" fullWidth />
        <TextInput source="logo" label="Logo URL" fullWidth />
        <BooleanInput source="enabled" label="Enabled" />
      </SimpleForm>
    </Edit>
  );
}
